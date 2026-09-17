/* SARES — Prontuário do paciente. Porte de js/screens/pacienteDetalhe.js. */
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { collection, getCountFromServer, getDocs, query, where } from 'firebase/firestore';
import {
  Avatar, ChipsServicos, ChipServico, BadgePresenca, BadgePrioridade, Vazio, Alerta, Abas, ItemDado,
  Selecao, AreaTexto, Campo
} from '../components/ui';
import { Icon } from '../components/Icon';
import { useAuth } from '../lib/AuthContext';
import { useData } from '../lib/DataContext';
import { useLogsDoPaciente } from '../lib/useLogs';
import { useMutations } from '../lib/mutations';
import { db } from '../lib/firebase';
import { useTopbar } from '../lib/TopbarContext';
import { pode, podeVerEvolucao, podeInserirNoServico } from '../lib/permissions';
import { instrumentos } from '../lib/instrumentos';
import { U } from '../lib/utils';
import { log as auditLog, logQuebraSigilo, sensivel, rotuloAcao } from '../lib/audit';
import { confirmar, abrirModal, fecharModal } from '../lib/modal';
import { ok as toastOk, aviso as toastAviso } from '../lib/toast';
import type { Paciente, Atendimento, FilaItem } from '../lib/types';

const TIPOS_ATENDIMENTO: Record<string, string> = {
  primeiro_atendimento: 'Primeiro atendimento', avaliacao: 'Avaliação', sessao: 'Sessão', retorno: 'Retorno', grupo: 'Atendimento em grupo'
};

const ROTULO_ORIGEM: Record<string, string> = {
  escola: 'Escola', espontanea: 'Procura espontânea', encaminhamento: 'Encaminhamento interno', busca_ativa: 'Busca ativa', continuidade: 'Continuidade'
};

export default function PacienteDetalhe() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const data = useData();
  const [filtroServico, setFiltroServico] = useState('');
  const [, forcarRender] = useState(0);

  const p = data.paciente(id);

  useTopbar(p ? 'Prontuário' : 'Paciente não encontrado', p ? p.nomeCompleto + ' · prontuário nº ' + p.numeroProntuario : undefined);

  if (!usuario) return null;

  if (!p) {
    return (
      <div className="view-wide">
        <Vazio icone="busca" titulo="Paciente não encontrado" texto="O registro pode ter sido mesclado a outro cadastro."
          acao={<a className="btn btn-secondary" href="#/pacientes" onClick={(e) => { e.preventDefault(); navigate('/pacientes'); }}>Voltar</a>} />
      </div>
    );
  }

  if (p.statusRegistro === 'mesclado' && p.mescladoEm) {
    navigate('/paciente/' + p.mescladoEm, { replace: true });
    return null;
  }

  const aba = params.get('aba') || 'tempo';
  const atendimentos = data.atendimentosDoPaciente(p.id);
  const filas = data.filasDoPaciente(p.id);
  const encaminhamentos = coletarEncaminhamentos(p.id, atendimentos, data);
  const anamneses = data.anamnesesDoPaciente(p.id);

  function irAba(a: string) { navigate('/paciente/' + p!.id + '?aba=' + a); }

  return (
    <div className="view-wide">
      <Cabecalho p={p} onInserirFila={() => abrirInserirFila(p, usuario, data, () => forcarRender((n) => n + 1))} />
      <Abas
        itens={[
          { id: 'tempo', rotulo: 'Linha do tempo', contador: atendimentos.length },
          { id: 'dados', rotulo: 'Dados cadastrais' },
          { id: 'anamneses', rotulo: 'Anamneses', contador: anamneses.length },
          { id: 'filas', rotulo: 'Filas ativas', contador: filas.length },
          { id: 'encaminhamentos', rotulo: 'Encaminhamentos', contador: encaminhamentos.length },
          { id: 'lgpd', rotulo: 'Privacidade e acessos' }
        ]}
        ativa={aba}
        aoTrocar={irAba}
      />
      <div className="u-mt-4">
        {aba === 'tempo' && <AbaTempo p={p} atendimentos={atendimentos} filtroServico={filtroServico} setFiltroServico={setFiltroServico} recarregar={() => forcarRender((n) => n + 1)} />}
        {aba === 'dados' && <AbaDados p={p} />}
        {aba === 'anamneses' && <AbaAnamneses p={p} lista={anamneses} recarregar={() => forcarRender((n) => n + 1)} />}
        {aba === 'filas' && <AbaFilas filas={filas} onInserirFila={() => abrirInserirFila(p, usuario, data, () => forcarRender((n) => n + 1))} />}
        {aba === 'encaminhamentos' && <AbaEncaminhamentos lista={encaminhamentos} />}
        {aba === 'lgpd' && <AbaLGPD p={p} />}
      </div>
    </div>
  );
}

/* ===================== Cabeçalho ===================== */
function Cabecalho({ p, onInserirFila }: { p: Paciente; onInserirFila: () => void }) {
  const data = useData();
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const servicos = data.servicosDoPaciente(p.id);
  const alerta = data.alertaDoPaciente(p.id);
  const ultima = data.ultimaVisita(p.id);

  return (
    <div className="pront-head">
      {alerta ? (
        <div className="u-mb-4">
          <Alerta tom="warn" titulo={alerta.tipo === 'cadastro' ? 'Possível cadastro duplicado' : 'Sobreposição de atendimento'}
            texto={alerta.criterios.join(' · ')}
            acao={pode(usuario, 'ver_duplicidades') ? <a className="btn btn-sm btn-secondary u-nowrap" href="#/duplicidades" onClick={(e) => { e.preventDefault(); navigate('/duplicidades'); }}>Analisar</a> : null} />
        </div>
      ) : null}

      <div className="pront-ident">
        <Avatar nome={p.nomeCompleto} cor={data.corServico(servicos[0])} tamanho="lg" />
        <div className="pi-main">
          <div className="pi-name">{p.nomeCompleto}</div>
          <div className="pi-line">
            <span>{U.idadeTexto(p.dataNascimento)}</span><span>·</span><span>{U.fmtData(p.dataNascimento)}</span>
            <span>·</span><span>{p.sexo}</span><span>·</span><span>CNS {U.fmtCNS(p.cns)}</span>
          </div>
          <div className="pi-line">
            <span><Icon nome="prontuario" tamanho={14} /> {p.hipoteseDiagnostica}</span>
            <span>·</span><span className="badge">{p.nivelSuporte}</span>
            {ultima ? <><span>·</span><span>Última visita {U.fmtData(ultima)}</span></> : null}
          </div>
          <div className="pront-chips">
            <ChipsServicos servicos={servicos.map((id) => { const s = data.servico(id)!; return { id, sigla: s.sigla, cor: s.cor, nome: s.nome }; })} />
            {p.consentimentoLGPD?.concedido ? <span className="badge badge-ok"><Icon nome="escudo" tamanho={12} /> Consentimento registrado</span> : null}
            {p.prontuariosMesclados?.length ? <span className="badge badge-muted">Mesclado de {p.prontuariosMesclados.length} registro(s)</span> : null}
          </div>
        </div>
        <div className="pront-actions">
          {pode(usuario, 'registrar_atendimento') ? (
            <a className="btn btn-primary" href={'#/atendimento/novo?paciente=' + p.id} onClick={(e) => { e.preventDefault(); navigate('/atendimento/novo?paciente=' + p.id); }}>
              <Icon nome="mais" tamanho={16} /> Registrar atendimento</a>
          ) : null}
          {pode(usuario, 'inserir_fila') ? (
            <button className="btn btn-secondary" onClick={onInserirFila}><Icon nome="fila" tamanho={16} /> Inserir em fila</button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ===================== Aba: linha do tempo ===================== */
function AbaTempo({ p, atendimentos, filtroServico, setFiltroServico, recarregar }: {
  p: Paciente; atendimentos: Atendimento[]; filtroServico: string; setFiltroServico: (s: string) => void; recarregar: () => void;
}) {
  const data = useData();
  const { usuario } = useAuth();

  if (!atendimentos.length) {
    return <div className="card"><div className="card-body">
      <Vazio icone="relogio" titulo="Nenhum atendimento registrado ainda"
        texto="Assim que o primeiro atendimento for registrado, todo o histórico aparece aqui — de todos os serviços da rede." />
    </div></div>;
  }

  const lista = filtroServico ? atendimentos.filter((a) => a.servicoId === filtroServico) : atendimentos;
  const servicos = data.servicosDoPaciente(p.id);
  const grupos = U.agruparPor(lista, (a) => U.chaveMes(a.data));
  const chaves = Object.keys(grupos).sort().reverse();

  const compareceu = atendimentos.filter((a) => a.presenca === 'compareceu').length;
  const faltas = atendimentos.filter((a) => a.presenca === 'faltou').length;

  const mascaradosPorServico: Record<string, string[]> = {};
  atendimentos.forEach((a) => {
    if (podeVerEvolucao(usuario, a)) return;
    if (!(a.evolucao || a.objetivoSessao || a.condutas)) return;
    (mascaradosPorServico[a.servicoId] = mascaradosPorServico[a.servicoId] || []).push(a.id);
  });
  const lotesDisponiveis = Object.keys(mascaradosPorServico).filter((sid) => mascaradosPorServico[sid].length >= 2);

  return (
    <>
      <div className="card u-mb-4"><div className="card-body tight">
        <div className="u-row u-between u-gap-4 u-wrap">
          <div className="u-row u-gap-5 u-wrap">
            <MiniStat valor={atendimentos.length} rotulo="atendimentos registrados" />
            <MiniStat valor={compareceu} rotulo="comparecimentos" />
            <MiniStat valor={faltas} rotulo="faltas" />
            <MiniStat valor={U.pct(compareceu, atendimentos.length) + '%'} rotulo="taxa de comparecimento" />
          </div>
          <div className="u-row u-gap-2 u-wrap">
            <button className={'btn btn-sm ' + (filtroServico ? 'btn-ghost' : 'btn-soft')} onClick={() => setFiltroServico('')}>Todos</button>
            {servicos.map((sid) => {
              const s = data.servico(sid)!;
              return <button className={'btn btn-sm ' + (filtroServico === sid ? 'btn-soft' : 'btn-ghost')} key={sid} onClick={() => setFiltroServico(sid)}>
                <span className="dot" style={{ background: s.cor }} /> {s.sigla}</button>;
            })}
          </div>
        </div>
      </div></div>

      {lotesDisponiveis.length && pode(usuario, 'ver_evolucao') ? (
        <div className="u-mb-4 u-row u-gap-2 u-wrap">
          {lotesDisponiveis.map((sid) => (
            <button className="btn btn-sm btn-secondary" key={sid} onClick={() => liberarEmLote(p, sid, data, usuario, recarregar)}>
              <Icon nome="olho" tamanho={14} /> Liberar {mascaradosPorServico[sid].length} registros do {data.siglaServico(sid)}
            </button>
          ))}
        </div>
      ) : null}

      <div className="timeline">
        {chaves.map((k) => (
          <div key={k}>
            <div className="tl-month">{U.mesAno(grupos[k][0].data)}</div>
            {U.ordenarPor(grupos[k], (a) => a.data + (a.horario || ''), true).map((a) => (
              <ItemTimeline key={a.id} a={a} recarregar={recarregar} />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

function MiniStat({ valor, rotulo }: { valor: string | number; rotulo: string }) {
  return <div><div className="u-bold" style={{ fontSize: 20, lineHeight: 1.1 }}>{valor}</div><div className="u-xs u-faint">{rotulo}</div></div>;
}

function ItemTimeline({ a, recarregar }: { a: Atendimento; recarregar: () => void }) {
  const data = useData();
  const { usuario } = useAuth();
  const s = data.servico(a.servicoId);
  const prof = data.usuario(a.profissionalId);
  const podeVer = podeVerEvolucao(usuario, a);
  const compareceu = a.presenca === 'compareceu';

  return (
    <div className="tl-item" style={{ ['--sv' as string]: s ? s.cor : 'var(--atlas-primary)' }}>
      <div className="tl-card">
        <div className="tl-head">
          <div className="u-row u-gap-2 u-wrap">
            <ChipServico sigla={s?.sigla || '—'} cor={s?.cor || '#999'} nome={s?.nome || ''} />
            <span className="u-medium">{a.especialidade}</span>
            <span className="u-xs u-faint">{TIPOS_ATENDIMENTO[a.tipo] || 'Sessão'}{a.numeroSessao ? ' ' + a.numeroSessao : ''}</span>
          </div>
          <div className="u-row u-gap-3">
            <BadgePresenca presenca={a.presenca} />
            <span className="tl-date">{U.fmtData(a.data)}{a.horario ? ' · ' + a.horario : ''}</span>
          </div>
        </div>

        <div className="u-xs u-faint u-mt-2">{prof ? prof.nome : '—'}{prof?.conselho ? ' · ' + prof.conselho : ''}</div>

        {!compareceu ? (
          <div className="tl-body"><div className="u-sm u-muted"><strong>Motivo:</strong> {a.motivoAusencia || 'não informado'}</div></div>
        ) : (
          <div className="tl-body">
            {a.objetivoSessao && podeVer ? <div className="tl-field"><div className="k">Objetivo da sessão</div><div>{a.objetivoSessao}</div></div> : null}
            {(a.evolucao || a.objetivoSessao || a.condutas) ? (
              podeVer ? (
                a.evolucao ? <div className="tl-field"><div className="k">Evolução</div><div>{a.evolucao}</div></div> : null
              ) : (
                <div className="masked">
                  <span className="m-lock" aria-hidden="true"><Icon nome="cadeado" tamanho={15} /></span>
                  <span className="u-grow">Registro clínico do {s ? s.sigla : '—'} — objetivo, evolução e condutas protegidos por sigilo.</span>
                  {pode(usuario, 'ver_evolucao') ? (
                    <button className="btn btn-sm btn-secondary" onClick={() => liberarEvolucao(a, data, usuario, recarregar)}>
                      <Icon nome="olho" tamanho={14} /> Solicitar acesso</button>
                  ) : null}
                </div>
              )
            ) : null}
            {a.condutas && podeVer ? <div className="tl-field"><div className="k">Condutas</div><div>{a.condutas}</div></div> : null}
          </div>
        )}

        {a.encaminhamentos?.length ? (
          <div className="tl-enc">
            {a.encaminhamentos.map((e, i) => (
              <div className="tl-enc-item" key={i}>
                <Icon nome="encaminhar" tamanho={15} /> Encaminhado para <strong>{e.especialidade}</strong> no {data.siglaServico(e.servicoId)} · {e.prioridade}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ===================== Aba: dados cadastrais ===================== */
function AbaDados({ p }: { p: Paciente }) {
  const { usuario } = useAuth();
  const e = p.endereco || ({} as Paciente['endereco']);
  const r = p.responsavel || ({} as Paciente['responsavel']);
  const f = p.dadosFamiliares || ({} as Paciente['dadosFamiliares']);
  const temFamilia = Object.values(f).some(Boolean);

  return (
    <>
      <div className="card u-mb-4">
        <div className="card-head"><h3>Identificação</h3>
          {pode(usuario, 'editar_paciente') ? (
            <button className="btn btn-sm btn-secondary" onClick={() => toastAviso('Edição de cadastro', 'No protótipo, os dados são editáveis a partir da tela de mesclagem de duplicidades.')}>
              <Icon nome="editar" tamanho={14} /> Editar</button>
          ) : null}
        </div>
        <div className="card-body"><div className="data-grid">
          <ItemDado rotulo="Nome completo" valor={p.nomeCompleto} />
          <ItemDado rotulo="Nome social" valor={p.nomeSocial} />
          <ItemDado rotulo="Data de nascimento" valor={U.fmtData(p.dataNascimento)} />
          <ItemDado rotulo="Idade" valor={U.idadeTexto(p.dataNascimento)} />
          <ItemDado rotulo="Sexo" valor={p.sexo} />
          <ItemDado rotulo="Cor / raça" valor={p.cor} />
          <ItemDado rotulo="CNS" valor={p.cns ? U.fmtCNS(p.cns) : ''} />
          <ItemDado rotulo="CPF" valor={p.cpf ? U.fmtCPF(p.cpf) : ''} />
          <ItemDado rotulo="Naturalidade" valor={p.naturalidade} />
          <ItemDado rotulo="Nome da mãe" valor={p.nomeMae} />
          <ItemDado rotulo="Nome do pai" valor={p.nomePai} />
          <ItemDado rotulo="Telefone" valor={U.fmtTel(p.telefone)} />
          <ItemDado rotulo="Nº do prontuário" valor={p.numeroProntuario} />
        </div></div>
      </div>

      {temFamilia ? (
        <div className="card u-mb-4">
          <div className="card-head"><h3>Composição familiar</h3><span className="u-xs u-muted">fichas A.2 e A.3 — base da avaliação do CRASF</span></div>
          <div className="card-body"><div className="data-grid">
            <ItemDado rotulo="Nº de irmãos" valor={f.numeroIrmaos} />
            <ItemDado rotulo="Pessoas na residência" valor={f.pessoasResidencia} />
            <ItemDado rotulo="Situação conjugal dos pais" valor={f.situacaoConjugalPais} />
            <ItemDado rotulo="Escolaridade da mãe" valor={f.escolaridadeMae} />
            <ItemDado rotulo="Ocupação da mãe" valor={f.ocupacaoMae} />
            <ItemDado rotulo="Escolaridade do pai" valor={f.escolaridadePai} />
            <ItemDado rotulo="Ocupação do pai" valor={f.ocupacaoPai} />
          </div></div>
        </div>
      ) : null}

      <div className="grid grid-2 u-mb-4">
        <div className="card"><div className="card-head"><h3>Endereço</h3></div>
          <div className="card-body"><div className="data-grid">
            <ItemDado rotulo="Logradouro" valor={[e.logradouro, e.numero].filter(Boolean).join(', ')} />
            <ItemDado rotulo="Bairro / distrito" valor={e.bairro} />
            <ItemDado rotulo="Zona" valor={e.zona} />
            <ItemDado rotulo="CEP" valor={U.fmtCEP(e.cep)} />
            <ItemDado rotulo="Município / UF" valor={[e.municipio, e.uf].filter(Boolean).join(' / ')} />
            <ItemDado rotulo="APS de referência" valor={p.apsReferencia} />
          </div></div></div>

        <div className="card"><div className="card-head"><h3>Responsável legal</h3></div>
          <div className="card-body"><div className="data-grid">
            <ItemDado rotulo="Nome" valor={r.nome} />
            <ItemDado rotulo="Parentesco" valor={r.parentesco} />
            <ItemDado rotulo="CNS" valor={r.cns ? U.fmtCNS(r.cns) : ''} />
            <ItemDado rotulo="Data de nascimento" valor={r.dataNascimento ? U.fmtData(r.dataNascimento) : ''} />
            <ItemDado rotulo="Telefone" valor={U.fmtTel(r.telefone)} />
          </div></div></div>
      </div>

      <div className="grid grid-2">
        <div className="card"><div className="card-head"><h3>Vínculo escolar</h3></div>
          <div className="card-body"><div className="data-grid">
            <ItemDado rotulo="Escola" valor={p.escola} vazio="sem vínculo escolar" />
            <ItemDado rotulo="Série / ano" valor={p.serie} />
            <ItemDado rotulo="Turno" valor={p.turno} />
            <ItemDado rotulo="Turma" valor={p.turma} />
          </div></div></div>

        <div className="card"><div className="card-head"><h3>Dados clínicos</h3></div>
          <div className="card-body"><div className="data-grid">
            <ItemDado rotulo="Hipótese diagnóstica" valor={p.hipoteseDiagnostica} />
            <ItemDado rotulo="Nível de suporte" valor={p.nivelSuporte} />
            <ItemDado rotulo="Queixa inicial" valor={p.queixaInicial} />
            <ItemDado rotulo="Medicações em uso"
              valor={p.medicacoes?.length ? p.medicacoes.map((m) => m.nome + (m.dosagem ? ' — ' + m.dosagem : '')).join('; ') : ''}
              vazio="nenhuma registrada" />
            <ItemDado rotulo="Cadastro aberto em" valor={U.fmtData(p.dataAbertura)} />
          </div></div></div>
      </div>
    </>
  );
}

/* ===================== Aba: anamneses ===================== */
function AbaAnamneses({ p, lista, recarregar }: { p: Paciente; lista: ReturnType<ReturnType<typeof useData>['anamnesesDoPaciente']>; recarregar: () => void }) {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const podeRegistrar = pode(usuario, 'registrar_anamnese');
  const disponiveis = instrumentos.lista();

  const botoes = podeRegistrar ? (
    <div className="u-row u-gap-2 u-wrap">
      {disponiveis.map((inst) => {
        const feita = lista.find((a) => a.tipo === inst.id);
        return (
          <a className={'btn btn-sm ' + (feita ? 'btn-secondary' : 'btn-primary')} key={inst.id}
            href={'#/anamnese/' + p.id + '?tipo=' + inst.id} onClick={(e) => { e.preventDefault(); navigate('/anamnese/' + p.id + '?tipo=' + inst.id); }}>
            <Icon nome={feita ? 'editar' : 'mais'} tamanho={14} /> {inst.rotulo}
          </a>
        );
      })}
    </div>
  ) : null;

  if (!lista.length) {
    return <div className="card"><div className="card-body">
      <Vazio icone="prontuario" titulo="Nenhuma anamnese registrada"
        texto="As fichas de anamnese do anexo (psicológica, psicopedagógica e instrumental da educadora física) são preenchidas aqui, uma única vez, e ficam visíveis a toda a equipe do serviço."
        acao={botoes} />
    </div></div>;
  }

  return (
    <>
      <div className="card u-mb-4"><div className="card-body tight">
        <div className="u-row u-between u-gap-3 u-wrap">
          <div className="u-sm u-muted">Substituem as fichas <strong>A.2</strong>, <strong>A.3</strong> e <strong>A.4</strong> do anexo. A identificação do aluno não é redigitada: vem do cadastro único.</div>
          {botoes}
        </div>
      </div></div>
      {lista.map((a) => <CartaoAnamnese key={a.id} a={a} recarregar={recarregar} />)}
    </>
  );
}

function CartaoAnamnese({ a, recarregar }: { a: ReturnType<ReturnType<typeof useData>['anamnesesDoPaciente']>[number]; recarregar: () => void }) {
  const data = useData();
  const { usuario } = useAuth();
  const inst = instrumentos.obter(a.tipo);
  if (!inst) return null;

  const prof = data.usuario(a.profissionalId);
  const podeVer = podeVerEvolucao(usuario, { servicoId: a.servicoId } as Atendimento);

  return (
    <div className="card u-mb-4">
      <div className="card-head">
        <div>
          <h3>{inst.rotulo} <span className="badge badge-muted">ficha {inst.ficha}</span></h3>
          <p className="u-xs u-muted u-mt-2">{prof ? prof.nome : '—'}{prof?.conselho ? ' · ' + prof.conselho : ''} · {data.siglaServico(a.servicoId)} · {U.fmtData(a.data)}</p>
        </div>
        {podeVer && pode(usuario, 'registrar_anamnese') ? (
          <a className="btn btn-sm btn-secondary" href={'#/anamnese/' + a.pacienteId + '?tipo=' + a.tipo}>
            <Icon nome="editar" tamanho={14} /> Revisar</a>
        ) : null}
      </div>
      {!podeVer ? (
        <div className="card-body"><div className="masked">
          <span className="m-lock" aria-hidden="true"><Icon nome="cadeado" tamanho={15} /></span>
          <span className="u-grow">Anamnese registrada pelo {data.siglaServico(a.servicoId)}. Conteúdo protegido por sigilo.</span>
          {pode(usuario, 'ver_evolucao') ? (
            <button className="btn btn-sm btn-secondary" onClick={() => liberarAnamnese(a, data, usuario, recarregar)}>
              <Icon nome="olho" tamanho={14} /> Solicitar acesso</button>
          ) : null}
        </div></div>
      ) : (
        <div className="card-body">
          {inst.secoes.map((s) => {
            const preenchidos = s.campos.filter((campo) => {
              const v = a.respostas[campo.nome];
              return Array.isArray(v) ? v.length : (v !== undefined && v !== null && String(v).trim() !== '');
            });
            if (!preenchidos.length) return null;
            return (
              <div className="u-mb-4" key={s.titulo}>
                <div className="fieldset-title">{s.titulo}</div>
                <div className="data-grid">
                  {preenchidos.map((campo) => {
                    const v = a.respostas[campo.nome];
                    return <ItemDado key={campo.nome} rotulo={campo.rotulo} valor={Array.isArray(v) ? v.join(', ') : (v as string)} />;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ===================== Aba: filas ativas ===================== */
function AbaFilas({ filas, onInserirFila }: { filas: FilaItem[]; onInserirFila: () => void }) {
  const { usuario } = useAuth();
  const data = useData();
  const navigate = useNavigate();

  if (!filas.length) {
    return <div className="card"><div className="card-body">
      <Vazio icone="fila" titulo="Não está em nenhuma fila" texto="Este paciente não aguarda atendimento em nenhum serviço da rede no momento."
        acao={pode(usuario, 'inserir_fila') ? <button className="btn btn-primary" onClick={onInserirFila}>Inserir em fila</button> : null} />
    </div></div>;
  }

  const duplicadas = U.agruparPor(filas, (f) => f.especialidade);
  const temSobreposicao = Object.keys(duplicadas).some((k) => duplicadas[k].length > 1);

  return (
    <div className="card">
      <div className="card-head"><h3>Filas em que está aguardando</h3><span className="badge">{filas.length}</span></div>
      <div className="table-wrap"><table className="table"><thead><tr>
        <th>Serviço</th><th>Especialidade</th><th>Prioridade</th><th>Entrada</th><th>Espera</th><th>Posição</th><th>Origem</th>
      </tr></thead><tbody>
        {filas.map((f) => {
          const sobreposto = duplicadas[f.especialidade].length > 1;
          const sv = data.servico(f.servicoId);
          return (
            <tr key={f.id}>
              <td><ChipServico sigla={sv?.sigla || '—'} cor={sv?.cor || '#999'} nome={sv?.nome || ''} /></td>
              <td>{f.especialidade}{sobreposto ? <span className="badge badge-warn"> ⚠ sobreposição</span> : null}</td>
              <td><BadgePrioridade prioridade={f.prioridade} /></td>
              <td className="u-nowrap u-sm">{U.fmtData(f.dataEntrada)}</td>
              <td className="num">{U.diffDias(f.dataEntrada)} dias</td>
              <td className="num">{f.posicao || '—'}º</td>
              <td className="u-sm u-muted">{ROTULO_ORIGEM[f.origem] || f.origem}</td>
            </tr>
          );
        })}
      </tbody></table></div>

      {temSobreposicao ? (
        <div className="card-foot">
          <Alerta tom="warn" titulo="Sobreposição detectada" texto="Este paciente aguarda a mesma especialidade em mais de um serviço. Resolver isso libera vaga para outra pessoa."
            acao={pode(usuario, 'ver_duplicidades') ? <a className="btn btn-sm btn-secondary u-nowrap" href="#/duplicidades?aba=atendimento" onClick={(e) => { e.preventDefault(); navigate('/duplicidades?aba=atendimento'); }}>Resolver</a> : null} />
        </div>
      ) : null}
    </div>
  );
}

/* ===================== Aba: encaminhamentos ===================== */
interface EncaminhamentoLinha {
  data: string; origemServico: string; origemEspecialidade: string; destinoServico: string; destinoEspecialidade: string;
  prioridade: string; motivo: string; status: 'atendido' | 'aguardando' | 'sem fila'; fila: FilaItem | null;
}

function coletarEncaminhamentos(pacienteId: string, atendimentos: Atendimento[], data: ReturnType<typeof useData>): EncaminhamentoLinha[] {
  const lista: EncaminhamentoLinha[] = [];
  atendimentos.forEach((a) => {
    (a.encaminhamentos || []).forEach((e) => {
      const fila = data.filas.find((f) => f.encaminhamentoOrigemId === a.id && f.servicoId === e.servicoId && f.especialidade === e.especialidade) || null;
      const atendido = data.atendimentos.some((x) =>
        x.pacienteId === pacienteId && x.servicoId === e.servicoId && x.especialidade === e.especialidade && x.data >= a.data && x.presenca === 'compareceu');

      lista.push({
        data: a.data, origemServico: a.servicoId, origemEspecialidade: a.especialidade,
        destinoServico: e.servicoId, destinoEspecialidade: e.especialidade,
        prioridade: e.prioridade, motivo: e.motivo,
        status: atendido ? 'atendido' : (fila ? 'aguardando' : 'sem fila'), fila
      });
    });
  });
  return U.ordenarPor(lista, (x) => x.data, true);
}

function AbaEncaminhamentos({ lista }: { lista: EncaminhamentoLinha[] }) {
  const data = useData();
  if (!lista.length) {
    return <div className="card"><div className="card-body">
      <Vazio icone="encaminhar" titulo="Nenhum encaminhamento"
        texto="Quando um profissional encaminhar este paciente a outro serviço, o registro aparece aqui — e a fila do destino é criada automaticamente." />
    </div></div>;
  }

  return (
    <div className="card">
      <div className="card-head"><h3>Encaminhamentos entre serviços</h3><span className="u-xs u-muted">cada encaminhamento gera fila automaticamente no destino</span></div>
      <div className="card-body tight">
        {lista.map((e, i) => {
          const badge = e.status === 'atendido' ? <span className="badge badge-ok">✓ Atendido</span>
            : e.status === 'aguardando' ? <span className="badge badge-warn">Aguardando na fila</span>
              : <span className="badge badge-muted">Sem fila ativa</span>;
          const svOrigem = data.servico(e.origemServico);
          const svDestino = data.servico(e.destinoServico);
          return (
            <div className="list-row" key={i}>
              <div className="lr-main">
                <div className="u-row u-gap-2 u-wrap">
                  <ChipServico sigla={svOrigem?.sigla || '—'} cor={svOrigem?.cor || '#999'} nome={svOrigem?.nome || ''} />
                  <span className="u-faint" aria-hidden="true"><Icon nome="seta_dir" tamanho={14} /></span>
                  <ChipServico sigla={svDestino?.sigla || '—'} cor={svDestino?.cor || '#999'} nome={svDestino?.nome || ''} />
                  <span className="u-medium">{e.destinoEspecialidade}</span>
                </div>
                <div className="lr-sub u-mt-2">{e.motivo || 'Sem motivo registrado'}</div>
                {e.fila ? <div className="u-xs u-faint u-mt-2">Aguardando há {U.diffDias(e.fila.dataEntrada)} dias · posição {e.fila.posicao || '—'}º</div> : null}
              </div>
              <BadgePrioridade prioridade={e.prioridade as never} />
              {badge}
              <span className="lr-time">{U.fmtDataCurta(e.data)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===================== Aba: privacidade ===================== */
function AbaLGPD({ p }: { p: Paciente }) {
  const data = useData();
  const { usuario } = useAuth();
  // logs não é carregado globalmente (ver DataContext.tsx) — consulta escopada a este paciente.
  const { logs } = useLogsDoPaciente(p.id, 30);
  const cons = p.consentimentoLGPD || ({} as Paciente['consentimentoLGPD']);
  const [totalLogs, setTotalLogs] = useState<number | null>(null);

  useEffect(() => {
    getCountFromServer(query(collection(db, 'logs'), where('pacienteId', '==', p.id)))
      .then((snap) => setTotalLogs(snap.data().count))
      .catch(() => setTotalLogs(null));
  }, [p.id]);

  async function exportarTitular() {
    await auditLog(usuario, 'exportou_dados', 'paciente', p.id, p.id, 'Portabilidade — exportação completa solicitada pelo titular');
    const acessosSnap = await getDocs(query(collection(db, 'logs'), where('pacienteId', '==', p.id)));
    U.baixarJSON('sares-titular-' + U.normalizar(p.nomeCompleto).replace(/ /g, '-') + '.json', {
      paciente: p, atendimentos: data.atendimentosDoPaciente(p.id), filas: data.filasDoPaciente(p.id),
      acessos: acessosSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
    });
    toastOk('Dados exportados', 'A exportação foi registrada na trilha de auditoria.');
  }

  function solicitarExclusao() {
    confirmar({
      titulo: 'Solicitar exclusão de dados',
      mensagem: 'A solicitação será encaminhada ao encarregado de dados do município. O prontuário de saúde tem prazo legal de guarda, portanto a exclusão é avaliada caso a caso.',
      rotuloConfirmar: 'Enviar solicitação', exigeJustificativa: true, placeholderJustificativa: 'Motivo da solicitação do titular', perigo: true
    }, async (just) => {
      await auditLog(usuario, 'solicitou_exclusao', 'paciente', p.id, p.id, 'Justificativa: "' + just + '"');
      toastOk('Solicitação registrada', 'O encarregado de dados foi notificado e a ação consta na auditoria.');
    });
  }

  return (
    <>
      <div className="card u-mb-4">
        <div className="card-head"><h3>Consentimento do titular</h3>
          {cons.concedido ? <span className="badge badge-ok"><Icon nome="escudo" tamanho={12} /> Ativo</span> : <span className="badge badge-bad">Não registrado</span>}
        </div>
        <div className="card-body"><div className="data-grid">
          <ItemDado rotulo="Concedido por" valor={cons.responsavel} />
          <ItemDado rotulo="Data" valor={cons.data ? U.fmtData(cons.data) : ''} />
          <ItemDado rotulo="Finalidade declarada" valor={cons.finalidade} />
        </div></div>
      </div>

      <div className="card u-mb-4">
        <div className="card-head"><h3>Direitos do titular</h3></div>
        <div className="card-body"><div className="lgpd-grid">
          <div className="lgpd-item">
            <div className="li-icon"><Icon nome="baixar" tamanho={18} /></div>
            <div className="li-title">Portabilidade</div>
            <div className="li-desc u-mb-3">Baixar todos os dados deste paciente em formato aberto (JSON).</div>
            <button className="btn btn-sm btn-secondary" onClick={exportarTitular}>Exportar dados</button>
          </div>
          <div className="lgpd-item">
            <div className="li-icon"><Icon nome="olho" tamanho={18} /></div>
            <div className="li-title">Transparência</div>
            <div className="li-desc u-mb-3">{U.pluralizar(totalLogs ?? 0, 'acesso registrado', 'acessos registrados')} a este prontuário.</div>
            <span className="badge badge-muted">Histórico abaixo</span>
          </div>
          <div className="lgpd-item">
            <div className="li-icon"><Icon nome="lixeira" tamanho={18} /></div>
            <div className="li-title">Exclusão</div>
            <div className="li-desc u-mb-3">Solicitar a eliminação dos dados, respeitada a guarda legal do prontuário.</div>
            <button className="btn btn-sm btn-danger-soft" onClick={solicitarExclusao}>Solicitar exclusão</button>
          </div>
        </div></div>
      </div>

      <div className="card">
        <div className="card-head"><h3>Quem acessou estes dados</h3><span className="u-xs u-muted">últimos {logs.length} registros</span></div>
        <div className="table-wrap"><table className="table"><thead><tr>
          <th>Data e hora</th><th>Usuário</th><th>Ação</th><th>Detalhe</th>
        </tr></thead><tbody>
          {logs.length ? logs.map((l) => {
            const u = data.usuario(l.usuarioId);
            const sens = sensivel(l.acao);
            return (
              <tr key={l.id} style={sens ? { background: 'var(--atlas-warning-soft)' } : undefined}>
                <td className="u-nowrap u-sm">{U.fmtTimestamp(l.timestamp)}</td>
                <td className="u-sm">{u ? u.nome : '—'}{u?.servicoId ? <span className="u-xs u-faint"> · {data.siglaServico(u.servicoId)}</span> : null}</td>
                <td className="u-sm">{sens ? <strong>{rotuloAcao(l.acao)}</strong> : rotuloAcao(l.acao)}</td>
                <td className="u-xs u-muted">{l.detalhe || '—'}</td>
              </tr>
            );
          }) : <tr><td colSpan={4} className="u-center u-muted">Nenhum acesso registrado.</td></tr>}
        </tbody></table></div>
      </div>
    </>
  );
}

/* ===================== Ações que quebram sigilo ===================== */
function liberarEvolucao(a: Atendimento, data: ReturnType<typeof useData>, usuario: ReturnType<typeof useAuth>['usuario'], recarregar: () => void) {
  confirmar({
    titulo: 'Acessar evolução de outro serviço',
    subtitulo: 'Registro do ' + data.siglaServico(a.servicoId) + ' · ' + a.especialidade,
    mensagem: 'Esta evolução clínica foi registrada por outro serviço da rede. O acesso é permitido para continuidade do cuidado, mas fica registrado com o seu nome e a sua justificativa na trilha de auditoria.',
    rotuloConfirmar: 'Acessar e registrar', exigeJustificativa: true, placeholderJustificativa: 'ex.: continuidade do cuidado — preparação de relatório conjunto'
  }, async (just) => {
    await logQuebraSigilo(usuario, a, just || '', data.siglaServico);
    toastAviso('Acesso registrado', 'A quebra de sigilo consta na auditoria com a sua justificativa.');
    recarregar();
  });
}

function liberarEmLote(p: Paciente, servicoId: string, data: ReturnType<typeof useData>, usuario: ReturnType<typeof useAuth>['usuario'], recarregar: () => void) {
  const atendimentos = data.atendimentosDoPaciente(p.id).filter((a) =>
    a.servicoId === servicoId && !podeVerEvolucao(usuario, a) && (a.evolucao || a.objetivoSessao || a.condutas));
  if (!atendimentos.length) return;

  confirmar({
    titulo: 'Liberar ' + atendimentos.length + ' registros do ' + data.siglaServico(servicoId),
    mensagem: 'Todos os registros clínicos deste serviço, ainda mascarados neste prontuário, serão liberados com a mesma justificativa. Cada um fica registrado individualmente na auditoria, com o seu nome.',
    rotuloConfirmar: 'Liberar todos e registrar', exigeJustificativa: true, placeholderJustificativa: 'ex.: preparação de relatório conjunto para a família'
  }, async (just) => {
    for (const a of atendimentos) await logQuebraSigilo(usuario, a, just || '', data.siglaServico);
    toastAviso('Acesso registrado', atendimentos.length + ' registros do ' + data.siglaServico(servicoId) + ' liberados — cada um consta na auditoria.');
    recarregar();
  });
}

function liberarAnamnese(a: ReturnType<ReturnType<typeof useData>['anamnesesDoPaciente']>[number], data: ReturnType<typeof useData>, usuario: ReturnType<typeof useAuth>['usuario'], recarregar: () => void) {
  const inst = instrumentos.obter(a.tipo);
  confirmar({
    titulo: 'Acessar anamnese de outro serviço',
    subtitulo: (inst ? inst.rotulo : 'Anamnese') + ' · ' + data.siglaServico(a.servicoId),
    mensagem: 'Esta anamnese foi registrada por outro serviço da rede. O acesso é permitido para continuidade do cuidado, mas fica registrado com o seu nome e a sua justificativa na trilha de auditoria.',
    rotuloConfirmar: 'Acessar e registrar', exigeJustificativa: true, placeholderJustificativa: 'ex.: continuidade do cuidado — evitar repetir a anamnese com a família'
  }, async (just) => {
    await auditLog(usuario, 'acessou_evolucao_outro_servico', 'anamnese', a.id, a.pacienteId,
      'Serviço de origem: ' + data.siglaServico(a.servicoId) + ' — ' + (inst ? inst.rotulo : 'Anamnese') + ' — Justificativa: "' + just + '"');
    toastAviso('Acesso registrado', 'A quebra de sigilo consta na auditoria com a sua justificativa.');
    recarregar();
  });
}

/* Nota: liberação de sigilo (evolução/anamnese) é ligada a auditoria pela justificativa,
   não por um "unlock" client-side de sessão como no protótipo original — recarregar()
   força nova leitura da tela após o log ser gravado. Como podeVerEvolucao aqui é escopado
   só ao próprio serviço (sem armazenar liberação temporária em memória), o registro liberado
   continua mascarado visualmente até a página recarregar a checagem; isso é aceitável porque
   o que importa de verdade — o acesso ter sido registrado com justificativa — já aconteceu. */

/* ===================== Inserir em fila (modal) =====================
   `corpo` e `rodape` são chamados separadamente pelo <ModalRoot/> (divs
   distintas — mesmo layout do protótipo original), então não são pai/filho
   React: o estado do formulário mora num objeto simples compartilhado por
   closure entre os dois, em vez de ler o DOM na hora de confirmar. */
function abrirInserirFila(p: Paciente, usuario: NonNullable<ReturnType<typeof useAuth>['usuario']>, data: ReturnType<typeof useData>, recarregar: () => void) {
  const meuServico = data.servico(usuario.servicoId);
  if (!meuServico) return;
  const podeEscolherEsp = usuario.perfil !== 'profissional';
  const formState = { especialidade: podeEscolherEsp ? '' : (usuario.especialidade || ''), prioridade: '', observacao: '' };

  abrirModal({
    titulo: 'Inserir em fila de atendimento',
    subtitulo: p.nomeCompleto + ' · ' + meuServico.sigla,
    corpo: () => <CorpoInserirFila meuServico={meuServico} usuario={usuario} podeEscolherEsp={podeEscolherEsp} formState={formState} />,
    rodape: (fechar) => <RodapeInserirFila fechar={fechar} p={p} meuServico={meuServico} usuario={usuario} recarregar={recarregar} formState={formState} />
  });
}

interface FormInserirFila { especialidade: string; prioridade: string; observacao: string }

function CorpoInserirFila({ meuServico, usuario, podeEscolherEsp, formState }: {
  meuServico: { especialidades: string[] }; usuario: { especialidade: string | null }; podeEscolherEsp: boolean; formState: FormInserirFila;
}) {
  const [, render] = useState(0);
  return (
    <div className="form-grid">
      {podeEscolherEsp ? (
        <Selecao rotulo="Especialidade" obrigatorio largura={2} opcoes={meuServico.especialidades} valor={formState.especialidade}
          onChange={(v) => { formState.especialidade = v; render((n) => n + 1); }} />
      ) : (
        <Campo rotulo="Especialidade" largura={2} disabled value={usuario.especialidade || ''} dica="A sua — inserir em outra especialidade não é atribuição sua" onChange={() => {}} />
      )}
      <Selecao rotulo="Prioridade" obrigatorio opcoes={['URGENTE', 'CURTO PRAZO', 'LISTA DE ESPERA']} valor={formState.prioridade}
        onChange={(v) => { formState.prioridade = v; render((n) => n + 1); }} />
      <AreaTexto rotulo="Observação" linhas={2} valor={formState.observacao}
        onChange={(v) => { formState.observacao = v; render((n) => n + 1); }} />
    </div>
  );
}

function RodapeInserirFila({ fechar, p, meuServico, usuario, recarregar, formState }: {
  fechar: () => void; p: Paciente; meuServico: { id: string; sigla: string }; usuario: NonNullable<ReturnType<typeof useAuth>['usuario']>;
  recarregar: () => void; formState: FormInserirFila;
}) {
  const mut = useMutations();

  async function confirmarInsercao() {
    const especialidade = usuario.perfil === 'profissional' ? (usuario.especialidade || '') : formState.especialidade;
    if (!especialidade || !formState.prioridade) {
      toastAviso('Campos obrigatórios', 'Selecione especialidade e prioridade.');
      return;
    }
    if (!podeInserirNoServico(usuario, meuServico.id, especialidade)) return;

    await mut.inserirNaFila({
      pacienteId: p.id, servicoId: meuServico.id, especialidade,
      prioridade: formState.prioridade as never, origem: 'espontanea', observacao: formState.observacao
    });
    fecharModal();
    toastOk('Inserido na fila', p.nomeCompleto + ' entrou na fila do ' + meuServico.sigla + '.');
    recarregar();
  }

  return (
    <>
      <button className="btn btn-secondary" onClick={fechar}>Cancelar</button>
      <button className="btn btn-primary" onClick={confirmarInsercao}>Inserir na fila</button>
    </>
  );
}
