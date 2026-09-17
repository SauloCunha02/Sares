/* SARES — Registro de atendimento. Porte de js/screens/atendimento.js.
   Ao salvar, cada encaminhamento adicionado cria automaticamente uma
   entrada na fila do serviço de destino. */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar, BadgePrioridade, Selecao, Campo, AreaTexto, Vazio } from '../components/ui';
import { Icon } from '../components/Icon';
import { useAuth } from '../lib/AuthContext';
import { useData } from '../lib/DataContext';
import { useMutations } from '../lib/mutations';
import { useTopbar } from '../lib/TopbarContext';
import { pode } from '../lib/permissions';
import { catalogos } from '../lib/seed';
import { U } from '../lib/utils';
import { log as auditLog } from '../lib/audit';
import { abrirModal, fecharModal } from '../lib/modal';
import { ok as toastOk, aviso as toastAviso } from '../lib/toast';
import type { EncaminhamentoRegistrado, Presenca, Prioridade, TipoAtendimento } from '../lib/types';

function horaAtual(): string {
  const d = new Date();
  return String(d.getHours()).padStart(2, '0') + ':' + String(Math.floor(d.getMinutes() / 5) * 5).padStart(2, '0');
}

export default function AtendimentoNovo() {
  const { usuario } = useAuth();
  const data = useData();
  const mut = useMutations();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const pacienteId = params.get('paciente') || '';
  const filaId = params.get('fila');
  const p = data.paciente(pacienteId);
  const filaItem = filaId ? data.filaItem(filaId) : null;

  const permitido = !!usuario && pode(usuario, 'registrar_atendimento');
  const bloqueadoServico = !!(usuario && filaItem && usuario.servicoId && filaItem.servicoId !== usuario.servicoId);
  const bloqueadoEspecialidade = !!(usuario && filaItem && usuario.especialidade && filaItem.especialidade !== usuario.especialidade && !bloqueadoServico);

  const servicoId = filaItem ? filaItem.servicoId : usuario?.servicoId || '';
  const especialidade = filaItem ? filaItem.especialidade : (usuario?.especialidade || data.servico(servicoId)?.especialidades[0] || '');
  const nSessao = p ? data.proximaSessao(p.id, servicoId, especialidade) : 1;

  useTopbar('Registrar atendimento', p ? p.nomeCompleto + ' · ' + data.siglaServico(servicoId) + ' — ' + especialidade : undefined);

  const [presenca, setPresenca] = useState<Presenca>('compareceu');
  const [continuidade, setContinuidade] = useState<'agendar' | 'alta'>('agendar');
  const [tipo, setTipo] = useState<TipoAtendimento>(nSessao === 1 ? 'primeiro_atendimento' : 'sessao');
  const [dataAt, setDataAt] = useState(U.hojeISO());
  const [horario, setHorario] = useState(horaAtual());
  const [motivoAusencia, setMotivoAusencia] = useState('');
  const [objetivoSessao, setObjetivoSessao] = useState('');
  const [evolucao, setEvolucao] = useState('');
  const [condutas, setCondutas] = useState('');
  const [dataRetorno, setDataRetorno] = useState(U.addDias(U.hojeISO(), 14));
  const [horarioRetorno, setHorarioRetorno] = useState(horaAtual());
  const [motivoAlta, setMotivoAlta] = useState('');
  const [encaminhamentos, setEncaminhamentos] = useState<EncaminhamentoRegistrado[]>([]);
  const [salvando, setSalvando] = useState(false);

  if (!usuario) return null;

  if (!permitido) {
    return <div className="view-narrow">
      <Vazio icone="cadeado" titulo="Você não pode registrar atendimentos" texto="Esta ação é permitida aos perfis de profissional e coordenação."
        acao={<a className="btn btn-secondary" href="#/inicio" onClick={(e) => { e.preventDefault(); navigate('/inicio'); }}>Voltar</a>} />
    </div>;
  }

  if (!p) { navigate('/pacientes', { replace: true }); return null; }

  if (bloqueadoServico) {
    auditLog(usuario, 'acesso_negado', 'fila', filaItem!.id, p.id, 'Tentativa de registrar atendimento em fila do ' + data.siglaServico(filaItem!.servicoId));
    return <div className="view-narrow">
      <Vazio icone="cadeado" titulo="Esta fila é de outro serviço"
        texto={'Você está lotado no ' + data.siglaServico(usuario.servicoId) + ' e esta fila pertence ao ' + data.siglaServico(filaItem!.servicoId) + '. O atendimento deve ser registrado por quem atende naquele serviço.'}
        acao={<a className="btn btn-secondary" href="#/filas" onClick={(e) => { e.preventDefault(); navigate('/filas'); }}>Ir para a minha fila</a>} />
    </div>;
  }

  if (bloqueadoEspecialidade) {
    auditLog(usuario, 'acesso_negado', 'fila', filaItem!.id, p.id, 'Tentativa de registrar atendimento de ' + filaItem!.especialidade + ' por profissional de ' + usuario.especialidade);
    return <div className="view-narrow">
      <Vazio icone="cadeado" titulo="Esta fila é de outra especialidade"
        texto={'Você atende em ' + usuario.especialidade + ' e esta fila é de ' + filaItem!.especialidade + '. O registro clínico precisa ser assinado por quem tem habilitação na área — mesmo dentro do ' + data.siglaServico(filaItem!.servicoId) + '.'}
        acao={<a className="btn btn-secondary" href="#/filas" onClick={(e) => { e.preventDefault(); navigate('/filas'); }}>Ir para a minha fila</a>} />
    </div>;
  }

  const u = usuario;
  const compareceu = presenca === 'compareceu';
  const ultimo = data.atendimentosDoPaciente(p.id).find((a) => a.presenca === 'compareceu');
  const servicos = data.servicosDoPaciente(p.id);

  function abrirEncaminhamento() {
    const formState = { servicoId: '', especialidade: '', prioridade: 'CURTO PRAZO' as Prioridade, motivo: '' };

    abrirModal({
      titulo: 'Adicionar encaminhamento',
      subtitulo: 'A fila do serviço de destino será criada automaticamente ao salvar o atendimento. O encaminhamento pode ser interno, para outra especialidade do seu próprio serviço.',
      corpo: () => <CorpoEncaminhamento formState={formState} servicoOrigemId={servicoId} especialidadeOrigem={especialidade} />,
      rodape: (fechar) => (
        <>
          <button className="btn btn-secondary" onClick={fechar}>Cancelar</button>
          <button className="btn btn-primary" onClick={() => {
            if (!formState.servicoId || !formState.especialidade) {
              toastAviso('Campos obrigatórios', 'Escolha o serviço de destino e a especialidade.');
              return;
            }
            const repetido = encaminhamentos.some((x) => x.servicoId === formState.servicoId && x.especialidade === formState.especialidade);
            if (repetido) {
              toastAviso('Encaminhamento repetido', 'Este atendimento já encaminha para ' + formState.especialidade + ' no ' + data.siglaServico(formState.servicoId) + '.');
              return;
            }
            setEncaminhamentos((lista) => [...lista, { ...formState }]);
            fecharModal();
          }}>Adicionar</button>
        </>
      )
    });
  }

  async function salvar() {
    if (!dataAt) { toastAviso('Data obrigatória', 'Informe a data do atendimento.'); return; }

    setSalvando(true);
    try {
      const resultado = await mut.registrarAtendimento({
        pacienteId: p!.id, servicoId, profissionalId: u.id, especialidade,
        tipo: compareceu ? tipo : 'sessao', data: dataAt, horario,
        numeroSessao: data.proximaSessao(p!.id, servicoId, especialidade),
        presenca, motivoAusencia: compareceu ? '' : motivoAusencia,
        objetivoSessao: compareceu ? objetivoSessao : '', evolucao: compareceu ? evolucao : '', condutas: compareceu ? condutas : '',
        encaminhamentos: compareceu ? encaminhamentos : [],
        filaItemId: filaItem ? filaItem.id : null
      });

      await auditLog(u, 'registrou_atendimento', 'atendimento', resultado.atendimento.id, p!.id,
        data.siglaServico(servicoId) + ' — ' + especialidade + ' — ' + presenca);

      const consequencias: string[] = [];
      if (filaItem && compareceu) consequencias.push('Vínculo concluído na fila do ' + data.siglaServico(filaItem.servicoId) + ' — vaga liberada');
      if (filaItem && !compareceu && continuidade !== 'alta') consequencias.push('Paciente mantido na fila do ' + data.siglaServico(filaItem.servicoId) + ' para reagendamento');

      for (const f of resultado.filasCriadas) {
        consequencias.push('Fila criada automaticamente: ' + data.siglaServico(f.servicoId) + ' — ' + f.especialidade + ' (' + f.prioridade + ')');
        await auditLog(u, 'encaminhou', 'fila', f.id, p!.id, 'Destino: ' + data.siglaServico(f.servicoId) + ' — ' + f.especialidade);
      }

      if (continuidade === 'agendar' && dataRetorno) {
        let vinculoId = filaItem?.id;
        if (!vinculoId) {
          const novo = await mut.inserirNaFila({
            pacienteId: p!.id, servicoId, especialidade, prioridade: 'CURTO PRAZO', origem: 'continuidade',
            observacao: 'Retorno programado em sessão.'
          });
          vinculoId = novo.id;
        }
        await mut.agendar(vinculoId, dataRetorno, horarioRetorno || '');
        await auditLog(u, 'agendou_atendimento', 'fila', vinculoId, p!.id,
          'Retorno em ' + U.fmtData(dataRetorno) + (horarioRetorno ? ' às ' + horarioRetorno : '') + ' · ' + data.siglaServico(servicoId) + ' — ' + especialidade);
        consequencias.push('Retorno agendado para ' + U.fmtData(dataRetorno) + (horarioRetorno ? ' às ' + horarioRetorno : '') + ' — vínculo permanece ativo');
      }

      if (continuidade === 'alta' && filaItem) {
        await mut.atualizarFila(filaItem.id, { status: 'alta', observacao: motivoAlta || 'Alta registrada ao final da sessão.' });
        await auditLog(u, 'removeu_fila', 'fila', filaItem.id, p!.id, 'Alta do serviço · ' + data.siglaServico(servicoId) + ' — ' + (motivoAlta || 'sem motivo registrado'));
        consequencias.push('Alta registrada no ' + data.siglaServico(servicoId) + ' — vaga liberada na fila');
      }

      consequencias.push('Registro incluído na linha do tempo única do paciente');
      toastOk(compareceu ? 'Atendimento registrado' : 'Ausência registrada', p!.nomeCompleto + ' · ' + U.fmtData(dataAt), consequencias);
      navigate('/paciente/' + p!.id + '?aba=tempo');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="view-narrow">
      <div className="page-head">
        <div className="ph-title"><h1>Registrar atendimento</h1><p>{p.nomeCompleto} · {U.idadeTexto(p.dataNascimento)} · sessão nº {nSessao}</p></div>
      </div>

      <div className="card u-mb-4"><div className="card-body tight">
        <div className="u-row u-gap-4 u-wrap">
          <Avatar nome={p.nomeCompleto} cor={data.corServico(servicos[0])} />
          <div className="u-grow" style={{ minWidth: 180 }}>
            <div className="u-bold">{p.nomeCompleto}</div>
            <div className="u-xs u-muted">{U.idadeTexto(p.dataNascimento)} · {p.hipoteseDiagnostica} · {p.nivelSuporte}</div>
          </div>
          {filaItem ? (
            <>
              <div className="u-right"><div className="u-xs u-faint">Aguardava há</div><div className="u-bold">{U.diffDias(filaItem.dataEntrada)} dias</div></div>
              <div><BadgePrioridade prioridade={filaItem.prioridade} /></div>
            </>
          ) : null}
          <a className="btn btn-sm btn-secondary" href={'#/paciente/' + p.id} onClick={(e) => { e.preventDefault(); navigate('/paciente/' + p.id); }}>
            <Icon nome="prontuario" tamanho={15} /> Prontuário</a>
        </div>
        {ultimo ? (
          <div className="u-xs u-muted u-mt-3" style={{ paddingTop: 'var(--sp-3)', borderTop: '1px solid var(--atlas-border)' }}>
            Último comparecimento: {U.fmtData(ultimo.data)} · {data.siglaServico(ultimo.servicoId)} — {ultimo.especialidade}
          </div>
        ) : null}
      </div></div>

      <form onSubmit={(e) => { e.preventDefault(); salvar(); }}>
        <div className="card u-mb-4">
          <div className="card-head"><h3>1. O paciente compareceu?</h3></div>
          <div className="card-body">
            <div className="radio-cards">
              <OpcaoPresenca valor="compareceu" icone="✓" rotulo="Compareceu" desc="Registrar a sessão" tom="tone-ok" atual={presenca} onEscolher={setPresenca} />
              <OpcaoPresenca valor="faltou" icone="✗" rotulo="Faltou" desc="Sem aviso prévio" tom="tone-bad" atual={presenca} onEscolher={setPresenca} />
              <OpcaoPresenca valor="justificou" icone="~" rotulo="Justificou" desc="Ausência avisada" tom="tone-warn" atual={presenca} onEscolher={setPresenca} />
            </div>
            {!compareceu ? (
              <div className="u-mt-4">
                <Selecao rotulo="Motivo da ausência" largura="all" opcoes={catalogos.motivosAusencia} valor={motivoAusencia} onChange={setMotivoAusencia} />
                <div className="u-mt-3">
                  <div className="alert alert-info">
                    <span className="a-icon" aria-hidden="true"><Icon nome="info" tamanho={16} /></span>
                    <div><div className="a-title">O paciente permanece na fila</div>
                      <div>A falta é registrada no histórico e o vínculo com o serviço é mantido — marque abaixo quando ela deve voltar.</div></div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {compareceu ? (
          <>
            <div className="card u-mb-4">
              <div className="card-head"><h3>2. Dados da sessão</h3></div>
              <div className="card-body"><div className="form-grid">
                <Selecao rotulo="Tipo de atendimento" vazio={false} valor={tipo} onChange={(v) => setTipo(v as TipoAtendimento)} opcoes={[
                  { valor: 'primeiro_atendimento', rotulo: 'Primeiro atendimento' }, { valor: 'avaliacao', rotulo: 'Avaliação' },
                  { valor: 'sessao', rotulo: 'Sessão de acompanhamento' }, { valor: 'retorno', rotulo: 'Retorno' }, { valor: 'grupo', rotulo: 'Atendimento em grupo' }
                ]} />
                <Campo rotulo="Data" type="date" obrigatorio value={dataAt} onChange={(e) => setDataAt(e.target.value)} />
                <Campo rotulo="Horário" type="time" value={horario} onChange={(e) => setHorario(e.target.value)} />
                <Campo rotulo="Nº da sessão" disabled value={String(nSessao)} onChange={() => {}} />
              </div></div>
            </div>

            <div className="card u-mb-4">
              <div className="card-head"><h3>3. Evolução clínica</h3><span className="badge badge-muted"><Icon nome="cadeado" tamanho={11} /> visível ao seu serviço</span></div>
              <div className="card-body"><div className="form-grid">
                <AreaTexto rotulo="Objetivo da sessão" linhas={2} placeholder="O que se pretendia trabalhar neste atendimento" valor={objetivoSessao} onChange={setObjetivoSessao} />
                <AreaTexto rotulo="Evolução" linhas={5} placeholder="Como o paciente respondeu, avanços e dificuldades observadas" valor={evolucao} onChange={setEvolucao} />
                <AreaTexto rotulo="Condutas e orientações" linhas={3} placeholder="Orientações à família, materiais, ajustes no plano terapêutico" valor={condutas} onChange={setCondutas} />
              </div></div>
            </div>
          </>
        ) : null}

        <div className="card u-mb-4">
          <div className="card-head">
            <div><h3>4. Próxima sessão</h3>
              <p className="u-xs u-muted u-mt-2">{compareceu ? 'Marcar aqui mantém o vínculo ativo e devolve a pessoa à agenda do serviço.' : 'A falta não encerra o cuidado — marque o retorno para não perder o vínculo com esta pessoa.'}</p></div>
          </div>
          <div className="card-body">
            <div className="radio-cards">
              <OpcaoContinuidade valor="agendar" icone="📅" rotulo="Agendar retorno" desc="Define data e hora" tom="tone-ok" atual={continuidade} onEscolher={setContinuidade} />
              <OpcaoContinuidade valor="alta" icone="✓" rotulo="Alta do serviço" desc="Encerra o vínculo" tom="tone-warn" atual={continuidade} onEscolher={setContinuidade} />
            </div>
            {continuidade === 'agendar' ? (
              <div className="u-mt-4"><div className="form-grid">
                <Campo rotulo="Data do retorno" type="date" value={dataRetorno} onChange={(e) => setDataRetorno(e.target.value)} />
                <Campo rotulo="Horário" type="time" value={horarioRetorno} onChange={(e) => setHorarioRetorno(e.target.value)} />
              </div></div>
            ) : (
              <div className="u-mt-4">
                <AreaTexto rotulo="Motivo da alta" linhas={2} placeholder="ex.: objetivos terapêuticos alcançados; segue acompanhado na escola" valor={motivoAlta} onChange={setMotivoAlta} />
              </div>
            )}
          </div>
        </div>

        {compareceu ? (
          <div className="card u-mb-4">
            <div className="card-head">
              <div><h3>5. Encaminhamentos</h3><p className="u-xs u-muted u-mt-2">Cada encaminhamento cria automaticamente a fila no serviço de destino.</p></div>
              <button type="button" className="btn btn-sm btn-soft" onClick={abrirEncaminhamento}><Icon nome="mais" tamanho={15} /> Adicionar</button>
            </div>
            <div className="card-body">
              {!encaminhamentos.length ? (
                <div className="u-sm u-faint u-center" style={{ padding: 'var(--sp-4) 0' }}>
                  Nenhum encaminhamento. Se este paciente precisa de outro serviço da rede, adicione aqui — a fila do destino é criada no momento em que você salvar.
                </div>
              ) : encaminhamentos.map((e, i) => (
                <div className="list-row" key={i}>
                  <span className="u-faint" aria-hidden="true"><Icon nome="encaminhar" tamanho={18} /></span>
                  <div className="lr-main">
                    <div className="u-row u-gap-2 u-wrap">
                      <span className="badge">{data.siglaServico(e.servicoId)}</span>
                      <span className="u-medium">{e.especialidade}</span>
                      <BadgePrioridade prioridade={e.prioridade} />
                    </div>
                    <div className="lr-sub u-mt-2">{e.motivo || 'Sem motivo registrado'}</div>
                  </div>
                  <button type="button" className="btn-icon" aria-label="Remover encaminhamento" onClick={() => setEncaminhamentos((l) => l.filter((_, idx) => idx !== i))}>
                    <Icon nome="x" tamanho={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="card"><div className="card-foot u-row u-between u-gap-3 u-wrap" style={{ borderTop: 'none', borderRadius: 'var(--atlas-radius-lg)' }}>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/paciente/' + p.id)}>Cancelar</button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={salvando}>Salvar atendimento</button>
        </div></div>
      </form>
    </div>
  );
}

function OpcaoPresenca({ valor, icone, rotulo, desc, tom, atual, onEscolher }: {
  valor: Presenca; icone: string; rotulo: string; desc: string; tom: string; atual: Presenca; onEscolher: (v: Presenca) => void;
}) {
  return (
    <label className={'radio-card ' + tom + (atual === valor ? ' is-on' : '')}>
      <input type="radio" name="presenca" checked={atual === valor} onChange={() => onEscolher(valor)} />
      <span className="rc-icon" aria-hidden="true">{icone}</span>
      <span className="rc-label">{rotulo}</span>
      <span className="rc-desc">{desc}</span>
    </label>
  );
}

function OpcaoContinuidade({ valor, icone, rotulo, desc, tom, atual, onEscolher }: {
  valor: 'agendar' | 'alta'; icone: string; rotulo: string; desc: string; tom: string; atual: 'agendar' | 'alta'; onEscolher: (v: 'agendar' | 'alta') => void;
}) {
  return (
    <label className={'radio-card ' + tom + (atual === valor ? ' is-on' : '')}>
      <input type="radio" name="continuidade" checked={atual === valor} onChange={() => onEscolher(valor)} />
      <span className="rc-icon" aria-hidden="true">{icone}</span>
      <span className="rc-label">{rotulo}</span>
      <span className="rc-desc">{desc}</span>
    </label>
  );
}

function CorpoEncaminhamento({ formState, servicoOrigemId, especialidadeOrigem }: {
  formState: { servicoId: string; especialidade: string; prioridade: Prioridade; motivo: string };
  servicoOrigemId: string; especialidadeOrigem: string;
}) {
  const data = useData();
  const [, render] = useState(0);
  const servicoSel = data.servico(formState.servicoId);
  /* Encaminhar para a própria especialidade no próprio serviço seria encaminhar o paciente para si mesmo. */
  const opcoesEsp = servicoSel ? servicoSel.especialidades.filter((x) => !(servicoSel.id === servicoOrigemId && x === especialidadeOrigem)) : [];

  return (
    <div className="form-grid">
      <Selecao rotulo="Serviço de destino" obrigatorio largura={2} opcoes={data.servicos.map((s) => ({ valor: s.id, rotulo: s.sigla + ' — ' + s.nome }))}
        valor={formState.servicoId} onChange={(v) => { formState.servicoId = v; formState.especialidade = ''; render((n) => n + 1); }} />
      <Selecao rotulo="Especialidade" obrigatorio opcoes={opcoesEsp} valor={formState.especialidade}
        onChange={(v) => { formState.especialidade = v; render((n) => n + 1); }} />
      <Selecao rotulo="Prioridade" obrigatorio vazio={false} opcoes={['URGENTE', 'CURTO PRAZO', 'LISTA DE ESPERA']} valor={formState.prioridade}
        onChange={(v) => { formState.prioridade = v as Prioridade; render((n) => n + 1); }} />
      <AreaTexto rotulo="Motivo do encaminhamento" linhas={3} placeholder="O que foi observado que justifica o encaminhamento"
        valor={formState.motivo} onChange={(v) => { formState.motivo = v; render((n) => n + 1); }} />
    </div>
  );
}
