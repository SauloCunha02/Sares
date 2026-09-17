/* SARES — Início. Porte de js/screens/inicio.js.
   Os painéis de Coordenação e Gestão usam js/lib/charts.js no original —
   ainda não portado nesta fase; por ora mostram os KPIs com um aviso no
   lugar do gráfico, sem perder o resto do painel. */
import { useNavigate } from 'react-router-dom';
import { Avatar, Kpi, Vazio, BadgePrioridade, BadgePresenca } from '../components/ui';
import { Icon } from '../components/Icon';
import { useAuth } from '../lib/AuthContext';
import { useData } from '../lib/DataContext';
import { useTopbar } from '../lib/TopbarContext';
import { U } from '../lib/utils';
import type { Usuario, FilaItem } from '../lib/types';

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function Inicio() {
  const { usuario } = useAuth();
  const data = useData();
  const navigate = useNavigate();
  const sv = usuario?.servicoId ? data.servico(usuario.servicoId) : null;

  useTopbar('Início', usuario ? saudacao() + ', ' + U.primeiroNome(usuario.nome) + (sv ? ' · ' + sv.nome : ' · Rede municipal') : '');

  if (!usuario) return null;

  return (
    <div className="view-wide">
      {usuario.perfil === 'recepcao' && <PainelRecepcao u={usuario} irPara={navigate} />}
      {usuario.perfil === 'profissional' && <PainelProfissional u={usuario} />}
      {usuario.perfil === 'coordenador' && <PainelCoordenador u={usuario} />}
      {usuario.perfil === 'gestor' && <PainelGestor />}
    </div>
  );
}

/* ===================== Recepção ===================== */
function PainelRecepcao({ u, irPara }: { u: Usuario; irPara: (rota: string) => void }) {
  const data = useData();
  const vinculosAtivos = data.filas.filter((f) => f.status === 'aguardando' || f.status === 'agendado');
  const pessoasIds: Record<string, boolean> = {};
  vinculosAtivos.forEach((f) => { pessoasIds[f.pacienteId] = true; });
  const pessoasAguardando = Object.keys(pessoasIds).length;

  const semData = vinculosAtivos.filter((f) => f.status === 'aguardando');
  const jaAgendados = vinculosAtivos.length - semData.length;
  const urgentesSemData = semData.filter((f) => f.prioridade === 'URGENTE');

  const novosSemana = data.pacientes.filter((p) => U.diffDias(p.dataAbertura) <= 7);
  const alertas = data.alertasAbertos('cadastro').filter((a) => data.alertaDoServico(a, u.servicoId));

  return (
    <>
      <div className="grid grid-2 split u-mb-5">
        <div className="card"><div className="card-body">
          <h2 className="u-mb-2">Atender alguém agora</h2>
          <p className="u-sm u-muted u-mb-4">Antes de criar um cadastro, o SARES verifica automaticamente se a pessoa já existe em qualquer serviço da rede.</p>
          <div className="u-row u-gap-3 u-wrap">
            <a className="btn btn-primary btn-lg" href="#/paciente/novo" onClick={(e) => { e.preventDefault(); irPara('/paciente/novo'); }}><Icon nome="mais" tamanho={18} /> Novo cadastro</a>
            <a className="btn btn-secondary btn-lg" href="#/pacientes" onClick={(e) => { e.preventDefault(); irPara('/pacientes'); }}><Icon nome="busca" tamanho={18} /> Buscar paciente</a>
          </div>
        </div></div>
        <div className="grid" style={{ gap: 'var(--sp-4)' }}>
          <Kpi rotulo="Pessoas aguardando na rede" valor={pessoasAguardando} nota={'em todos os serviços · ' + jaAgendados + ' já com data marcada'} />
          <Kpi rotulo="Urgentes sem agendamento" valor={urgentesSemData.length} nota="precisam de data marcada" />
        </div>
      </div>

      {alertas.length ? (
        <div className="u-mb-5">
          <div className="alert alert-warn">
            <span className="a-icon" aria-hidden="true"><Icon nome="alerta" tamanho={16} /></span>
            <div className="u-grow">
              <div className="a-title">{U.pluralizar(alertas.length, 'cadastro possivelmente duplicado', 'cadastros possivelmente duplicados') + ' na base'}</div>
              <div>Resolver as duplicidades libera vagas reais na fila e evita que a mesma criança ocupe dois lugares.</div>
            </div>
            <a className="btn btn-sm btn-secondary" href="#/duplicidades" onClick={(e) => { e.preventDefault(); irPara('/duplicidades'); }}>Revisar</a>
          </div>
        </div>
      ) : null}

      <div className="grid grid-2">
        <div className="card">
          <div className="card-head"><h3>Cadastros abertos nos últimos 7 dias</h3><span className="badge">{novosSemana.length}</span></div>
          <div className="card-body tight">
            {novosSemana.length ? novosSemana.slice(0, 6).map((p) => (
              <div className="list-row" key={p.id} style={{ cursor: 'pointer' }} onClick={() => irPara('/paciente/' + p.id)}>
                <Avatar nome={p.nomeCompleto} cor="var(--atlas-primary)" tamanho="sm" />
                <div className="lr-main"><div className="lr-title">{p.nomeCompleto}</div>
                  <div className="lr-sub">{U.idadeTexto(p.dataNascimento)} · {p.endereco.bairro}</div></div>
                <span className="lr-time">{U.fmtDataCurta(p.dataAbertura)}</span>
              </div>
            )) : <Vazio icone="pacientes" titulo="Nenhum cadastro nesta semana" texto="Novos cadastros aparecem aqui." />}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Filas por serviço</h3><a className="btn btn-sm btn-ghost" href="#/filas" onClick={(e) => { e.preventDefault(); irPara('/filas'); }}>Ver filas</a></div>
          <div className="card-body tight">
            {data.servicos.map((s) => {
              const fs = data.filasDoServico(s.id);
              const urg = fs.filter((f) => f.prioridade === 'URGENTE').length;
              return (
                <div className="list-row" key={s.id}>
                  <span className="dot" style={{ background: s.cor }} />
                  <div className="lr-main"><div className="lr-title">{s.sigla}</div>
                    <div className="lr-sub">{s.secretaria.replace('Secretaria Municipal de ', '')}</div></div>
                  {urg ? <span className="badge badge-bad">{urg} urgente{urg > 1 ? 's' : ''}</span> : null}
                  <span className="lr-time">{fs.length}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

/* ===================== Profissional ===================== */
function PainelProfissional({ u }: { u: Usuario }) {
  const data = useData();
  const navigate = useNavigate();
  const minhaFila = data.filasDoServico(u.servicoId ?? undefined, u.especialidade ?? undefined);
  const semData = minhaFila.filter((f) => f.status === 'aguardando');
  const urgentes = semData.filter((f) => f.prioridade === 'URGENTE');
  const meus = data.atendimentos.filter((a) => a.profissionalId === u.id);
  const ultimos30 = meus.filter((a) => U.diffDias(a.data) <= 30);
  const faltas = ultimos30.filter((a) => a.presenca === 'faltou').length;

  const hoje = U.hojeISO();
  const agendados = data.agendados(u.servicoId).filter((f) => f.especialidade === u.especialidade);
  const deHoje = U.ordenarPor(agendados.filter((f) => f.dataAgendada === hoje), (f) => f.horarioAgendado || '');
  const proximosDias = agendados.filter((f) => f.dataAgendada && f.dataAgendada > hoje).slice(0, 6);

  const PESO: Record<string, number> = { 'URGENTE': 0, 'CURTO PRAZO': 1, 'LISTA DE ESPERA': 2 };
  const proximos = U.ordenarPor(semData, (f) => PESO[f.prioridade] + '|' + f.dataEntrada);

  function atender(f: FilaItem) {
    navigate('/atendimento/novo?paciente=' + f.pacienteId + '&fila=' + f.id);
  }

  return (
    <>
      <div className="grid grid-4 u-mb-5">
        <Kpi rotulo="Agendados para hoje" valor={deHoje.length} nota={u.especialidade || ''} />
        <Kpi rotulo="Na minha fila (sem data)" valor={semData.length} nota={u.especialidade || ''} />
        <Kpi rotulo="Urgentes sem agendamento" valor={urgentes.length} nota={urgentes.length ? 'priorizar hoje' : 'nenhum'} />
        <Kpi rotulo="Faltas em 30 dias" valor={faltas} nota={U.pct(faltas, ultimos30.length) + '% dos meus atendimentos'} />
      </div>

      <div className="grid grid-2 u-mb-5">
        <div className="card">
          <div className="card-head"><h3>Minha agenda — hoje</h3><span className="badge">{deHoje.length}</span></div>
          <div className="card-body tight">
            {deHoje.length ? deHoje.map((f) => {
              const p = data.paciente(f.pacienteId);
              if (!p) return null;
              return (
                <div className="list-row" key={f.id}>
                  <span className="badge badge-ok u-nowrap">{f.horarioAgendado || '—'}</span>
                  <div className="lr-main"><div className="lr-title">{p.nomeCompleto}</div><div className="lr-sub">{U.idadeTexto(p.dataNascimento)}</div></div>
                  <button className="btn btn-sm btn-soft" onClick={() => atender(f)}>Atender</button>
                </div>
              );
            }) : <Vazio icone="calendario" titulo="Nada agendado para hoje" texto="Os atendimentos marcados aparecem aqui no dia." />}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Próximos dias</h3></div>
          <div className="card-body tight">
            {proximosDias.length ? proximosDias.map((f) => {
              const p = data.paciente(f.pacienteId);
              if (!p) return null;
              return (
                <div className="list-row" key={f.id}>
                  <span className="u-xs u-faint u-nowrap">{U.fmtDataCurta(f.dataAgendada || undefined)}{f.horarioAgendado ? ' · ' + f.horarioAgendado : ''}</span>
                  <div className="lr-main"><div className="lr-title">{p.nomeCompleto}</div></div>
                </div>
              );
            }) : <Vazio icone="calendario" titulo="Nenhum agendamento próximo" texto="Marcados nos próximos dias aparecem aqui." />}
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-head"><h3>Fila sem data marcada</h3><a className="btn btn-sm btn-ghost" href="#/filas" onClick={(e) => { e.preventDefault(); navigate('/filas'); }}>Ver fila completa</a></div>
          <div className="card-body tight">
            {proximos.length ? proximos.slice(0, 7).map((f) => {
              const p = data.paciente(f.pacienteId);
              if (!p) return null;
              return (
                <div className="list-row" key={f.id}>
                  <Avatar nome={p.nomeCompleto} cor={data.corServico(f.servicoId)} tamanho="sm" />
                  <div className="lr-main"><div className="lr-title">{p.nomeCompleto}</div>
                    <div className="lr-sub">{U.idadeTexto(p.dataNascimento)} · aguarda há {U.diffDias(f.dataEntrada)} dias</div></div>
                  <BadgePrioridade prioridade={f.prioridade} />
                  <button className="btn btn-sm btn-soft" onClick={() => atender(f)}>Atender</button>
                </div>
              );
            }) : <Vazio icone="fila" titulo="Fila vazia" texto={'Nenhum paciente aguardando em ' + u.especialidade + '.'} />}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Meus últimos registros</h3></div>
          <div className="card-body tight">
            {meus.length ? U.ordenarPor(meus, (a) => a.data, true).slice(0, 7).map((a) => {
              const p = data.paciente(a.pacienteId);
              if (!p) return null;
              return (
                <div className="list-row" key={a.id} style={{ cursor: 'pointer' }} onClick={() => navigate('/paciente/' + p.id)}>
                  <div className="lr-main"><div className="lr-title">{p.nomeCompleto}</div><div className="lr-sub">Sessão {a.numeroSessao} · {U.fmtData(a.data)}</div></div>
                  <BadgePresenca presenca={a.presenca} />
                </div>
              );
            }) : <Vazio icone="prontuario" titulo="Nenhum atendimento registrado" texto="Seus registros aparecem aqui." />}
          </div>
        </div>
      </div>
    </>
  );
}

/* ===================== Coordenação ===================== */
function PainelCoordenador({ u }: { u: Usuario }) {
  const data = useData();
  const navigate = useNavigate();
  const ind = data.indicadores(90, u.servicoId);
  const sv = u.servicoId ? data.servico(u.servicoId) : null;
  const fila = data.filasDoServico(u.servicoId ?? undefined);
  const alertas = data.alertasAbertos().filter((a) => data.alertaDoServico(a, u.servicoId));

  const porEspecialidade = U.agruparPor(fila, (f) => f.especialidade);
  const dadosEsp = U.ordenarPor(
    Object.keys(porEspecialidade).map((k) => ({ rotulo: k, valor: porEspecialidade[k].length })),
    (d) => d.valor, true
  ).slice(0, 6);

  return (
    <>
      <div className="grid grid-4 u-mb-5">
        <Kpi rotulo={'Aguardando no ' + (sv?.sigla || '')} valor={ind.naFila} nota={ind.urgentes + ' urgentes'} />
        <Kpi rotulo="Espera média" valor={ind.esperaMedia} unidade="dias" />
        <Kpi rotulo="Comparecimento (90 dias)" valor={ind.comparecimento} unidade="%" delta={ind.comparecimento - ind.comparecimentoAnterior} />
        <Kpi rotulo="Duplicidades abertas" valor={alertas.length} nota={'no ' + (sv?.sigla || '')} />
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-head"><h3>Fila por especialidade</h3><a className="btn btn-sm btn-ghost" href="#/filas" onClick={(e) => { e.preventDefault(); navigate('/filas'); }}>Gerenciar</a></div>
          <div className="card-body">
            {dadosEsp.length ? (
              <ul className="u-col u-gap-2">
                {dadosEsp.map((d) => (
                  <li key={d.rotulo} className="u-row u-between u-gap-3"><span className="u-sm">{d.rotulo}</span><span className="u-medium">{d.valor}</span></li>
                ))}
              </ul>
            ) : <Vazio icone="fila" titulo="Nenhuma fila ativa" texto="Não há pacientes aguardando neste serviço." />}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Alertas a resolver</h3>{alertas.length ? <span className="badge badge-warn">{alertas.length}</span> : null}</div>
          <div className="card-body tight">
            {alertas.length ? alertas.slice(0, 6).map((a) => {
              const p = data.paciente(a.pacienteIds[0]);
              return (
                <div className="list-row" key={a.id}>
                  <div className="lr-main">
                    <div className="lr-title">{p ? p.nomeCompleto : '—'}</div>
                    <div className="lr-sub">{(a.tipo === 'cadastro' ? 'Cadastro duplicado' : 'Sobreposição de atendimento') + ' · ' + (a.criterios[0] || '')}</div>
                  </div>
                  <span className={'badge ' + (a.score >= 95 ? 'badge-bad' : a.score >= 80 ? 'badge-warn' : 'badge-muted')}>{a.score}</span>
                  <a className="btn btn-sm btn-soft" href="#/duplicidades" onClick={(e) => { e.preventDefault(); navigate('/duplicidades'); }}>Analisar</a>
                </div>
              );
            }) : <Vazio icone="check" titulo="Nenhum alerta aberto" texto="A base está sem duplicidades pendentes." />}
          </div>
        </div>
      </div>
    </>
  );
}

/* ===================== Gestão municipal ===================== */
function PainelGestor() {
  const data = useData();
  const ind = data.indicadores(90);

  return (
    <div className="grid grid-6 u-mb-5">
      <Kpi rotulo="Pessoas em acompanhamento" valor={ind.pacientesAtivos} delta={variacao(ind.pacientesAtivos, ind.pacientesAtivosAnterior)} />
      <Kpi rotulo="Atendimentos (90 dias)" valor={ind.atendimentos} delta={variacao(ind.atendimentos, ind.atendimentosAnterior)} />
      <Kpi rotulo="Comparecimento" valor={ind.comparecimento} unidade="%" delta={ind.comparecimento - ind.comparecimentoAnterior} />
      <Kpi rotulo="Espera média" valor={ind.esperaMedia} unidade="dias" nota={ind.naFila + ' na fila'} />
      <Kpi rotulo="Encaminhamentos ativos" valor={ind.encaminhamentosAtivos} nota="entre serviços" />
      <Kpi rotulo="Duplicidades abertas" valor={ind.duplicidadesAbertas} nota={ind.duplicidadesResolvidas + ' já resolvidas'} />
      <div className="span-all">
        <Vazio icone="indicadores" titulo="Gráficos do painel de gestão chegam na próxima etapa"
          texto="Os KPIs acima já refletem o Firestore em tempo real; os gráficos (js/lib/charts.js) ainda serão portados." />
      </div>
    </div>
  );
}

function variacao(atual: number, anterior: number): number | null {
  if (!anterior) return null;
  return Math.round(((atual - anterior) / anterior) * 100);
}
