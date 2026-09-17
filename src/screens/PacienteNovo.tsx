/* SARES — Cadastro de paciente. Porte de js/screens/pacienteNovo.js.
   A verificação de duplicidade roda enquanto o operador digita (debounce):
   assim que há CNS, ou nome + data de nascimento, o motor varre a base
   inteira da rede. Score >= 95 bloqueia o salvamento até decidir. */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Campo, Selecao, AreaTexto, Stepper, Vazio, Alerta, ChipsServicos } from '../components/ui';
import { Icon } from '../components/Icon';
import { useAuth } from '../lib/AuthContext';
import { useData } from '../lib/DataContext';
import { useMutations } from '../lib/mutations';
import { useTopbar } from '../lib/TopbarContext';
import { catalogos } from '../lib/seed';
import { buscarSimilares, nivel as nivelDedup, rotuloNivel, LIMITE_BLOQUEIO, type Similar } from '../lib/dedup';
import { podeInserirNoServico, pode } from '../lib/permissions';
import { U } from '../lib/utils';
import { log as auditLog } from '../lib/audit';
import { confirmar } from '../lib/modal';
import { ok as toastOk, erro as toastErro, aviso as toastAviso, info as toastInfo } from '../lib/toast';

const ETAPAS = ['Identificação', 'Contato e endereço', 'Responsável e escola', 'Clínico e consentimento'];

/* catalogos.naturalidades tem repetições de propósito (pesa a geração
   aleatória da seed) — não servem como opções de um <select>, que não pode
   ter duas entradas iguais. */
const NATURALIDADES_UNICAS = [...new Set(catalogos.naturalidades)];
const HD_UNICOS = [...new Set(catalogos.hd)];

type Dados = Record<string, string>;

const VAZIO: Dados = {
  nomeCompleto: '', nomeSocial: '', cns: '', cpf: '', dataNascimento: '', sexo: '', cor: '', naturalidade: '',
  nomeMae: '', nomePai: '', telefone: '', apsReferencia: '', logradouro: '', numero: '', zona: '', bairro: '',
  cep: '', municipio: 'Crateús', uf: 'CE', respNome: '', respParentesco: '', respCns: '', respNascimento: '',
  respTelefone: '', escola: '', serie: '', turno: '', turma: '', hipoteseDiagnostica: '', nivelSuporte: '',
  medicacao: '', queixaInicial: '', especialidade: '', prioridade: '', origem: ''
};

export default function PacienteNovo() {
  const { usuario } = useAuth();
  const data = useData();
  const mut = useMutations();
  const navigate = useNavigate();

  const [etapa, setEtapa] = useState(0);
  const [dados, setDados] = useState<Dados>(VAZIO);
  const [consentimento, setConsentimento] = useState(false);
  const [erros, setErros] = useState<Record<string, boolean>>({});
  const [decisao, setDecisao] = useState<'outra' | null>(null);
  const [salvando, setSalvando] = useState(false);

  const meuServico = usuario ? data.servico(usuario.servicoId) : null;

  useTopbar('Novo cadastro', 'Cadastro único da rede — verificado contra todos os serviços');

  const campo = (nome: string) => (v: string) => setDados((d) => ({ ...d, [nome]: v }));

  /* ---------- Duplicidade ao vivo ---------- */
  const [similares, setSimilares] = useState<Similar[]>([]);
  useEffect(() => {
    const t = setTimeout(() => {
      const r = buscarSimilares(data.pacientes, {
        nomeCompleto: dados.nomeCompleto, cns: dados.cns, cpf: dados.cpf, dataNascimento: dados.dataNascimento,
        nomeMae: dados.nomeMae, telefone: dados.telefone,
        endereco: { bairro: dados.bairro } as never, escola: dados.escola
      });
      setSimilares(r);
    }, 380);
    return () => clearTimeout(t);
  }, [dados.nomeCompleto, dados.cns, dados.cpf, dados.dataNascimento, dados.nomeMae, dados.telefone, dados.bairro, dados.escola, data.pacientes]);

  const maiorScore = similares.length ? similares[0].score : 0;
  const bloqueado = maiorScore >= LIMITE_BLOQUEIO && decisao !== 'outra';

  if (!usuario || !meuServico) return null;
  const u = usuario;
  const sv = meuServico;

  if (!pode(u, 'cadastrar_paciente')) {
    return (
      <div className="view-narrow">
        <Vazio icone="cadeado" titulo="Você não tem permissão para cadastrar pacientes"
          texto="Esta ação é permitida aos perfis de recepção e coordenação."
          acao={<a className="btn btn-secondary" href="#/pacientes" onClick={(e) => { e.preventDefault(); navigate('/pacientes'); }}>Voltar para pacientes</a>} />
      </div>
    );
  }

  /* ---------- Validação por etapa ---------- */
  function camposObrigatoriosDaEtapa(n: number): { nome: string; rotulo: string }[] {
    if (n === 0) return [
      { nome: 'nomeCompleto', rotulo: 'Nome completo' }, { nome: 'dataNascimento', rotulo: 'Data de nascimento' },
      { nome: 'sexo', rotulo: 'Sexo' }, { nome: 'nomeMae', rotulo: 'Nome da mãe' }
    ];
    if (n === 1) return [];
    if (n === 2) return [{ nome: 'respNome', rotulo: 'Nome do responsável' }];
    if (n === 3) return [{ nome: 'hipoteseDiagnostica', rotulo: 'Hipótese diagnóstica (CID)' }, { nome: 'especialidade', rotulo: 'Especialidade' }, { nome: 'prioridade', rotulo: 'Prioridade' }];
    return [];
  }

  function validarEtapa(n: number): boolean {
    const obrigatorios = camposObrigatoriosDaEtapa(n);
    const faltando: string[] = [];
    const novosErros: Record<string, boolean> = {};

    obrigatorios.forEach((c) => {
      const vazio = !String(dados[c.nome] || '').trim();
      novosErros[c.nome] = vazio;
      if (vazio) faltando.push(c.rotulo);
    });

    if (n === 3 && !consentimento) {
      faltando.push('Consentimento LGPD');
    }

    setErros((e) => ({ ...e, ...novosErros }));

    if (faltando.length) {
      toastAviso('Campos obrigatórios', 'Preencha: ' + faltando.join(', ') + '.');
      return false;
    }

    const docs: { nome: string; rotulo: string; valida: (v: string) => boolean; dica: string }[] = [
      { nome: 'cns', rotulo: 'CNS', valida: U.cnsValido, dica: '15 dígitos, começando em 1, 2, 7, 8 ou 9' },
      { nome: 'respCns', rotulo: 'CNS do responsável', valida: U.cnsValido, dica: '15 dígitos, começando em 1, 2, 7, 8 ou 9' },
      { nome: 'cpf', rotulo: 'CPF', valida: U.cpfValido, dica: '11 dígitos' }
    ];
    for (const doc of docs) {
      if (n === 0 && doc.nome === 'respCns') continue;
      if (n === 2 && doc.nome !== 'respCns') continue;
      if (n !== 0 && n !== 2) continue;
      const valor = String(dados[doc.nome] || '').replace(/\D/g, '');
      if (!valor) continue;
      if (!doc.valida(valor)) {
        toastErro(doc.rotulo + ' inválido', 'O dígito verificador não confere. Confira o número na carteirinha — ' + doc.dica + '.');
        return false;
      }
    }

    return true;
  }

  function irPara(n: number) {
    if (n < 0 || n >= ETAPAS.length) return;
    if (n > etapa && !validarEtapa(etapa)) return;
    setEtapa(n);
    window.scrollTo(0, 0);
  }

  async function vincularExistente(pacienteId: string) {
    const p = data.paciente(pacienteId);
    if (!p) return;

    confirmar({
      titulo: 'Vincular ao cadastro existente',
      mensagem: 'Nenhum registro novo será criado. ' + p.nomeCompleto + ' será inserido na fila escolhida, ' +
        'mantendo o prontuário e o histórico que já existem na rede.',
      rotuloConfirmar: 'Vincular e inserir na fila'
    }, async () => {
      const consequencias: string[] = [];
      if (dados.especialidade && podeInserirNoServico(u, sv.id, dados.especialidade)) {
        await mut.inserirNaFila({
          pacienteId: p.id, servicoId: sv.id, especialidade: dados.especialidade,
          prioridade: (dados.prioridade || 'LISTA DE ESPERA') as never, origem: (dados.origem || 'espontanea') as never,
          observacao: dados.queixaInicial || ''
        });
        consequencias.push('Paciente inserido na fila do ' + sv.sigla);
      }
      await auditLog(u, 'editou_paciente', 'paciente', p.id, p.id,
        'Cadastro duplicado evitado no acolhimento — operador vinculou ao registro existente');

      toastOk('Duplicidade evitada', 'Um cadastro repetido deixou de ser criado.', consequencias.length ? consequencias : undefined);
      navigate('/paciente/' + p.id);
    });
  }

  async function salvar() {
    for (let i = 0; i < ETAPAS.length; i++) {
      if (!validarEtapa(i)) { irPara(i); return; }
    }

    if (bloqueado) {
      toastErro('Duplicidade não resolvida', 'Vincule ao cadastro existente ou confirme que é outra pessoa.');
      return;
    }

    setSalvando(true);
    try {
      const novo = await mut.criarPaciente({
        nomeCompleto: dados.nomeCompleto.trim(),
        nomeSocial: dados.nomeSocial || '',
        cns: (dados.cns || '').replace(/\D/g, ''),
        cpf: (dados.cpf || '').replace(/\D/g, ''),
        dataNascimento: dados.dataNascimento,
        sexo: dados.sexo, cor: dados.cor || 'Não informada',
        nomeMae: dados.nomeMae.trim(), nomePai: dados.nomePai || '',
        responsavel: {
          nome: dados.respNome || dados.nomeMae,
          cns: (dados.respCns || '').replace(/\D/g, ''),
          dataNascimento: dados.respNascimento || '',
          parentesco: dados.respParentesco || 'Mãe',
          telefone: (dados.respTelefone || '').replace(/\D/g, '')
        },
        telefone: (dados.telefone || '').replace(/\D/g, ''),
        naturalidade: dados.naturalidade || '',
        dadosFamiliares: {} as never,
        endereco: {
          logradouro: dados.logradouro || '', numero: dados.numero || '',
          bairro: dados.bairro, municipio: dados.municipio || 'Crateús', uf: dados.uf || 'CE',
          cep: (dados.cep || '').replace(/\D/g, ''), zona: (dados.zona || 'Urbana') as never
        },
        apsReferencia: dados.apsReferencia || '',
        escola: dados.escola || '', serie: dados.serie || '', turno: dados.turno || '', turma: dados.turma || '',
        hipoteseDiagnostica: dados.hipoteseDiagnostica,
        nivelSuporte: dados.nivelSuporte || 'Em investigação',
        medicacoes: dados.medicacao ? [{ nome: dados.medicacao, dosagem: '', prescritor: '' }] : [],
        queixaInicial: dados.queixaInicial || '',
        consentimentoLGPD: {
          concedido: true, data: U.hojeISO(),
          responsavel: dados.respNome || dados.nomeMae,
          finalidade: 'Gestão do cuidado em saúde, educação e assistência social na rede municipal de Crateús'
        },
        criadoPor: u.id
      });

      const consequencias: string[] = [];
      if (dados.especialidade && podeInserirNoServico(u, sv.id, dados.especialidade)) {
        await mut.inserirNaFila({
          pacienteId: novo.id, servicoId: sv.id, especialidade: dados.especialidade,
          prioridade: (dados.prioridade || 'LISTA DE ESPERA') as never, origem: (dados.origem || 'espontanea') as never,
          observacao: dados.queixaInicial || ''
        });
        consequencias.push('Inserido na fila do ' + sv.sigla + ' — ' + dados.especialidade);
        consequencias.push('Prioridade: ' + (dados.prioridade || 'LISTA DE ESPERA'));
      }

      if (decisao === 'outra' && similares.length) {
        await mut.criarAlerta({
          tipo: 'cadastro', pacienteIds: [similares[0].paciente.id, novo.id],
          score: similares[0].score, criterios: similares[0].criterios
        });
        consequencias.push('Alerta de semelhança registrado para revisão da coordenação');
      }

      await mut.sincronizarAlertasCadastro();
      toastOk('Cadastro criado', novo.nomeCompleto + ' agora tem prontuário único na rede.', consequencias);
      navigate('/paciente/' + novo.id);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="view-narrow">
      <div className="page-head">
        <div className="ph-title">
          <h1>Novo cadastro de paciente</h1>
          <p>O SARES verifica automaticamente se esta pessoa já existe em qualquer serviço da rede antes de criar um novo registro.</p>
        </div>
      </div>

      <div className="card u-mb-4"><div className="card-body tight"><Stepper etapas={ETAPAS} atual={etapa} /></div></div>

      {similares.length ? <PainelDedup similares={similares} decisao={decisao} setDecisao={setDecisao} vincular={vincularExistente} /> : null}

      <form onSubmit={(e) => { e.preventDefault(); if (etapa === ETAPAS.length - 1) salvar(); else irPara(etapa + 1); }}>
        <div className="card">
          <div className="card-body">
            {etapa === 0 && (
              <section className="form-step is-on">
                <div className="fieldset-title">Dados da pessoa</div>
                <div className="form-grid">
                  <CampoErro erro={erros.nomeCompleto}><Campo rotulo="Nome completo" obrigatorio largura={2} placeholder="Como consta no documento"
                    value={dados.nomeCompleto} onChange={(e) => campo('nomeCompleto')(e.target.value)} /></CampoErro>
                  <Campo rotulo="Nome social" placeholder="Se houver" value={dados.nomeSocial} onChange={(e) => campo('nomeSocial')(e.target.value)} />
                  <Campo rotulo="CNS (Cartão Nacional de Saúde)" maxLength={15} inputMode="numeric" placeholder="15 dígitos"
                    dica="Verificação de duplicidade dispara ao sair deste campo" value={dados.cns} onChange={(e) => campo('cns')(e.target.value)} />
                  <Campo rotulo="CPF" maxLength={11} inputMode="numeric" placeholder="Somente números" value={dados.cpf} onChange={(e) => campo('cpf')(e.target.value)} />
                  <CampoErro erro={erros.dataNascimento}><Campo rotulo="Data de nascimento" type="date" obrigatorio
                    value={dados.dataNascimento} onChange={(e) => campo('dataNascimento')(e.target.value)} /></CampoErro>
                  <Selecao rotulo="Sexo" obrigatorio opcoes={['Feminino', 'Masculino']} valor={dados.sexo} onChange={campo('sexo')} />
                  <Selecao rotulo="Cor / raça" opcoes={['Branca', 'Preta', 'Parda', 'Amarela', 'Indígena', 'Não informada']} valor={dados.cor} onChange={campo('cor')} />
                  <Selecao rotulo="Naturalidade" opcoes={NATURALIDADES_UNICAS} valor={dados.naturalidade} onChange={campo('naturalidade')} />
                  <CampoErro erro={erros.nomeMae}><Campo rotulo="Nome da mãe" obrigatorio largura={2} dica="Campo decisivo na identificação de duplicidade"
                    value={dados.nomeMae} onChange={(e) => campo('nomeMae')(e.target.value)} /></CampoErro>
                  <Campo rotulo="Nome do pai" largura={2} value={dados.nomePai} onChange={(e) => campo('nomePai')(e.target.value)} />
                </div>
              </section>
            )}

            {etapa === 1 && (
              <section className="form-step is-on">
                <div className="fieldset-title">Contato</div>
                <div className="form-grid">
                  <Campo rotulo="Telefone" inputMode="tel" placeholder="(88) 9xxxx-xxxx" value={dados.telefone} onChange={(e) => campo('telefone')(e.target.value)} />
                  <Selecao rotulo="APS de referência" opcoes={catalogos.ubs} valor={dados.apsReferencia} onChange={campo('apsReferencia')} />
                </div>
                <div className="fieldset-title">Endereço</div>
                <div className="form-grid">
                  <Campo rotulo="Logradouro" largura={2} value={dados.logradouro} onChange={(e) => campo('logradouro')(e.target.value)} />
                  <Campo rotulo="Número" value={dados.numero} onChange={(e) => campo('numero')(e.target.value)} />
                  <Selecao rotulo="Zona" obrigatorio opcoes={['Urbana', 'Rural']} valor={dados.zona} onChange={campo('zona')} />
                  <Selecao rotulo="Bairro / distrito" obrigatorio opcoes={catalogos.bairros} valor={dados.bairro} onChange={campo('bairro')} />
                  <Campo rotulo="CEP" maxLength={8} inputMode="numeric" value={dados.cep} onChange={(e) => campo('cep')(e.target.value)} />
                  <Campo rotulo="Município" value={dados.municipio} onChange={(e) => campo('municipio')(e.target.value)} />
                  <Campo rotulo="UF" maxLength={2} value={dados.uf} onChange={(e) => campo('uf')(e.target.value)} />
                </div>
              </section>
            )}

            {etapa === 2 && (
              <section className="form-step is-on">
                <div className="fieldset-title">Responsável legal</div>
                <div className="form-grid">
                  <CampoErro erro={erros.respNome}><Campo rotulo="Nome do responsável" obrigatorio largura={2}
                    value={dados.respNome} onChange={(e) => campo('respNome')(e.target.value)} /></CampoErro>
                  <Selecao rotulo="Parentesco" opcoes={['Mãe', 'Pai', 'Avó', 'Avô', 'Tia', 'Tio', 'Guardião legal']} valor={dados.respParentesco} onChange={campo('respParentesco')} />
                  <Campo rotulo="CNS do responsável" maxLength={15} inputMode="numeric" value={dados.respCns} onChange={(e) => campo('respCns')(e.target.value)} />
                  <Campo rotulo="Data de nascimento do responsável" type="date" value={dados.respNascimento} onChange={(e) => campo('respNascimento')(e.target.value)} />
                  <Campo rotulo="Telefone do responsável" inputMode="tel" value={dados.respTelefone} onChange={(e) => campo('respTelefone')(e.target.value)} />
                </div>
                <div className="fieldset-title">Vínculo escolar</div>
                <div className="form-grid">
                  <Selecao rotulo="Escola" largura={2} opcoes={catalogos.escolas} valor={dados.escola} onChange={campo('escola')} />
                  <Campo rotulo="Série / ano" placeholder="ex.: 3º ano" value={dados.serie} onChange={(e) => campo('serie')(e.target.value)} />
                  <Selecao rotulo="Turno" opcoes={['Manhã', 'Tarde', 'Integral']} valor={dados.turno} onChange={campo('turno')} />
                  <Campo rotulo="Turma" maxLength={4} value={dados.turma} onChange={(e) => campo('turma')(e.target.value)} />
                </div>
              </section>
            )}

            {etapa === 3 && (
              <section className="form-step is-on">
                <div className="fieldset-title">Dados clínicos</div>
                <div className="form-grid">
                  <CampoErro erro={erros.hipoteseDiagnostica}><Selecao rotulo="Hipótese diagnóstica (CID)" largura={2} obrigatorio
                    opcoes={HD_UNICOS} valor={dados.hipoteseDiagnostica} onChange={campo('hipoteseDiagnostica')} /></CampoErro>
                  <Selecao rotulo="Nível de suporte" opcoes={['Nível 1', 'Nível 2', 'Nível 3', 'Em investigação']} valor={dados.nivelSuporte} onChange={campo('nivelSuporte')} />
                  <Campo rotulo="Medicação em uso" placeholder="ex.: Melatonina 3 mg" value={dados.medicacao} onChange={(e) => campo('medicacao')(e.target.value)} />
                  <AreaTexto rotulo="Queixa / motivo do encaminhamento" linhas={2} placeholder="O que motivou a procura pelo serviço"
                    valor={dados.queixaInicial} onChange={campo('queixaInicial')} />
                </div>

                <div className="fieldset-title">Entrada na fila de atendimento</div>
                <div className="form-grid">
                  <Campo rotulo="Serviço de entrada" largura={2} disabled value={meuServico.sigla + ' — ' + meuServico.nome}
                    dica="Sempre o seu serviço — para encaminhar a outro, registre no atendimento" onChange={() => {}} />
                  <CampoErro erro={erros.especialidade}><Selecao rotulo="Especialidade" obrigatorio
                    opcoes={meuServico.especialidades} valor={dados.especialidade} onChange={campo('especialidade')} /></CampoErro>
                  <CampoErro erro={erros.prioridade}><Selecao rotulo="Prioridade" obrigatorio
                    opcoes={['URGENTE', 'CURTO PRAZO', 'LISTA DE ESPERA']}
                    dica="Mesma classificação usada hoje nas fichas do NAPE" valor={dados.prioridade} onChange={campo('prioridade')} /></CampoErro>
                  <Selecao rotulo="Origem do encaminhamento" largura={2} opcoes={[
                    { valor: 'escola', rotulo: 'Escola' }, { valor: 'espontanea', rotulo: 'Procura espontânea' },
                    { valor: 'encaminhamento', rotulo: 'Outro serviço da rede' }, { valor: 'busca_ativa', rotulo: 'Busca ativa' }
                  ]} valor={dados.origem} onChange={campo('origem')} />
                </div>

                <div className="fieldset-title">Consentimento — Lei Geral de Proteção de Dados</div>
                <Alerta tom="ok" titulo="Finalidade do tratamento dos dados" texto={
                  <div className="u-sm">Os dados serão utilizados exclusivamente para a gestão do cuidado em saúde,
                    educação e assistência social na rede municipal de Crateús. O compartilhamento ocorre apenas
                    entre os serviços que atendem a pessoa, e todo acesso fica registrado em trilha de auditoria.</div>
                } />
                <label className="checkline u-mt-4">
                  <input type="checkbox" checked={consentimento} onChange={(e) => setConsentimento(e.target.checked)} />
                  <span>Declaro que o responsável legal foi informado sobre a finalidade acima e <strong>consentiu</strong> com
                    o registro e o compartilhamento dos dados entre os serviços da rede.</span>
                </label>
              </section>
            )}
          </div>
          <div className="card-foot u-row u-between u-gap-3 u-wrap">
            <button type="button" className="btn btn-ghost" onClick={() => navigate('/pacientes')}>Cancelar</button>
            <div className="u-row u-gap-3">
              {etapa > 0 ? <button type="button" className="btn btn-secondary" onClick={() => irPara(etapa - 1)}>Voltar</button> : null}
              {etapa < ETAPAS.length - 1
                ? <button type="button" className="btn btn-primary" onClick={() => irPara(etapa + 1)}>Avançar</button>
                : <button type="submit" className="btn btn-primary" disabled={bloqueado || salvando} title={bloqueado ? 'Resolva a duplicidade antes de salvar' : ''}>Salvar cadastro</button>}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function CampoErro({ erro, children }: { erro?: boolean; children: React.ReactNode }) {
  return <div className={erro ? 'campo-invalido' : undefined}>{children}</div>;
}

function PainelDedup({ similares, decisao, setDecisao, vincular }: {
  similares: Similar[]; decisao: 'outra' | null; setDecisao: (d: 'outra' | null) => void; vincular: (id: string) => void;
}) {
  const data = useData();
  const maior = similares[0].score;
  const nv = nivelDedup(maior);
  const tom = nv === 'bloqueio' ? 'bad' : (nv === 'alerta' ? 'warn' : 'info');

  return (
    <div className={'alert alert-' + tom + ' dedup-inline'}>
      <span className="a-icon" aria-hidden="true"><Icon nome="alerta" tamanho={17} /></span>
      <div className="u-grow">
        <div className="a-title">
          {similares.length === 1 ? 'Encontramos 1 cadastro semelhante na rede' : 'Encontramos ' + similares.length + ' cadastros semelhantes na rede'}
        </div>
        <div className="u-sm">
          {rotuloNivel(maior)}
          {nv === 'bloqueio' && decisao !== 'outra' ? <> — o salvamento está <strong>bloqueado</strong> até você decidir.</> : null}
        </div>

        {similares.map((s) => {
          const svs = data.servicosDoPaciente(s.paciente.id).map((id) => { const sv = data.servico(id)!; return { id, sigla: sv.sigla, cor: sv.cor, nome: sv.nome }; });
          const corScore = s.score >= 95 ? 'var(--atlas-danger)' : (s.score >= 80 ? 'var(--atlas-warning)' : 'var(--atlas-text-muted)');
          return (
            <div className="dedup-match" key={s.paciente.id}>
              <div className="dm-score" style={{ color: corScore }}><div className="s">{s.score}</div><div className="l">similar</div></div>
              <div className="dm-info">
                <div className="dm-name">{s.paciente.nomeCompleto}</div>
                <div className="dm-meta">{U.idadeTexto(s.paciente.dataNascimento)} · {U.maskCNS(s.paciente.cns)} · Mãe: {s.paciente.nomeMae}</div>
                <div className="u-mt-2"><ChipsServicos servicos={svs} /></div>
                <div className="u-xs u-muted u-mt-2">{s.criterios.join(' · ')}</div>
              </div>
              <div className="dm-acts">
                <button type="button" className="btn btn-sm btn-primary" onClick={() => vincular(s.paciente.id)}>Vincular a este cadastro</button>
                <a className="btn btn-sm btn-secondary" href={'#/paciente/' + s.paciente.id}>Ver prontuário</a>
              </div>
            </div>
          );
        })}

        {nv === 'bloqueio' && decisao !== 'outra' ? (
          <div className="u-mt-3">
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => { setDecisao('outra'); toastInfo('Registrado como pessoa distinta', 'O salvamento foi liberado. A decisão fica na auditoria.'); }}>
              É outra pessoa — continuar mesmo assim
            </button>
          </div>
        ) : null}
        {decisao === 'outra' ? <div className="u-mt-3"><span className="badge badge-ok">✓ Registrado como pessoa distinta — salvamento liberado</span></div> : null}
      </div>
    </div>
  );
}
