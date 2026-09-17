/* SARES — Trilha de auditoria (exclusiva da gestão). Porte de js/screens/auditoria.js. */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Vazio, Kpi, Avatar, SeletorSimples } from '../components/ui';
import { Icon } from '../components/Icon';
import { useAuth } from '../lib/AuthContext';
import { useData } from '../lib/DataContext';
import { useLogsPorPeriodo } from '../lib/useLogs';
import { useTopbar } from '../lib/TopbarContext';
import { pode } from '../lib/permissions';
import { ACOES, filtrar, rotuloAcao, sensivel, tomAcao } from '../lib/audit';
import { U } from '../lib/utils';
import { ok as toastOk } from '../lib/toast';

export default function Auditoria() {
  const { usuario } = useAuth();
  const data = useData();
  const navigate = useNavigate();

  const permitido = !!usuario && pode(usuario, 'ver_auditoria');
  const [usuarioFiltro, setUsuarioFiltro] = useState('');
  const [acaoFiltro, setAcaoFiltro] = useState('');
  const [dias, setDias] = useState(30);
  const [busca, setBusca] = useState('');
  const [somenteSensiveis, setSomenteSensiveis] = useState(false);

  const desde = Date.now() - dias * 86400000;
  const nomeUsuario = (id: string | null) => data.nomeUsuario(id);

  /* Busca só a janela de tempo escolhida (já era um filtro que existia na
     tela) — em vez de reler a coleção de auditoria inteira a cada sessão.
     Os demais filtros (usuário, ação, busca, só sensíveis) continuam
     aplicados no cliente, sobre esse conjunto já bem menor. */
  const { logs: logsBrutos } = useLogsPorPeriodo(permitido ? desde : Infinity);

  const logs = useMemo(() => permitido ? filtrar(logsBrutos, {
    usuarioId: usuarioFiltro || undefined, acao: acaoFiltro || undefined, busca: busca || undefined, somenteSensiveis
  }, nomeUsuario) : [], [permitido, logsBrutos, usuarioFiltro, acaoFiltro, busca, somenteSensiveis]);

  const sensiveis = useMemo(() => permitido ? filtrar(logsBrutos, { somenteSensiveis: true }, nomeUsuario) : [], [permitido, logsBrutos]);
  const totalPeriodo = logsBrutos;

  useTopbar('Auditoria', permitido ? logs.length + ' registros nos últimos ' + dias + ' dias' : undefined);

  if (!usuario) return null;

  if (!permitido) {
    return <div className="view-narrow">
      <Vazio icone="cadeado" titulo="Trilha de auditoria restrita" texto="Apenas a gestão municipal (SMS/SEPLATI) acessa a auditoria completa."
        acao={<a className="btn btn-secondary" href="#/inicio" onClick={(e) => { e.preventDefault(); navigate('/inicio'); }}>Voltar</a>} />
    </div>;
  }

  function contarUsuarios(): number {
    const m: Record<string, boolean> = {};
    logsBrutos.forEach((l) => { if (l.usuarioId) m[l.usuarioId] = true; });
    return Object.keys(m).length;
  }
  function contarProntuarios(): number {
    const m: Record<string, boolean> = {};
    logsBrutos.forEach((l) => { if (l.pacienteId) m[l.pacienteId] = true; });
    return Object.keys(m).length;
  }

  function limpar() { setUsuarioFiltro(''); setAcaoFiltro(''); setDias(30); setBusca(''); setSomenteSensiveis(false); }

  function exportar() {
    U.baixarCSV('sares-auditoria-' + U.hojeISO() + '.csv',
      ['Data e hora', 'Usuário', 'Perfil', 'Serviço', 'Ação', 'Paciente', 'Detalhe', 'Origem'],
      logs.map((l) => {
        const u = data.usuario(l.usuarioId);
        const p = l.pacienteId ? data.paciente(l.pacienteId) : null;
        return [
          U.fmtTimestamp(l.timestamp), u ? u.nome : 'Sistema', u ? u.perfil : '',
          u?.servicoId ? data.siglaServico(u.servicoId) : '', rotuloAcao(l.acao), p ? p.nomeCompleto : '', l.detalhe || '', l.ip || ''
        ];
      }));
    toastOk('Auditoria exportada', logs.length + ' registros em CSV.');
  }

  return (
    <div className="view-wide">
      <div className="page-head">
        <div className="ph-title"><h1>Trilha de auditoria</h1><p>Todo acesso a dado pessoal é registrado. É o que permite compartilhar informação entre serviços sem abrir mão do sigilo.</p></div>
        <div className="ph-actions"><button className="btn btn-secondary" onClick={exportar}><Icon nome="baixar" tamanho={16} /> Exportar CSV</button></div>
      </div>

      <div className="grid grid-4 u-mb-5">
        <Kpi rotulo="Registros no período" valor={totalPeriodo.length} />
        <Kpi rotulo="Acessos sensíveis" valor={sensiveis.length} nota="quebras de sigilo, exportações e mesclagens" />
        <Kpi rotulo="Usuários ativos" valor={contarUsuarios()} />
        <Kpi rotulo="Prontuários acessados" valor={contarProntuarios()} />
      </div>

      {sensiveis.length ? (
        <div className="u-mb-4">
          <div className="alert alert-warn">
            <span className="a-icon" aria-hidden="true"><Icon nome="alerta" tamanho={16} /></span>
            <div className="u-grow">
              <div className="a-title">{U.pluralizar(sensiveis.length, 'acesso sensível registrado', 'acessos sensíveis registrados')}</div>
              <div>Cada um traz o nome do profissional e a justificativa informada no momento do acesso.</div>
            </div>
            <button className="btn btn-sm btn-secondary u-nowrap" onClick={() => setSomenteSensiveis((v) => !v)}>{somenteSensiveis ? 'Ver todos' : 'Ver somente estes'}</button>
          </div>
        </div>
      ) : null}

      <div className="toolbar">
        <div className="searchbox u-grow" style={{ maxWidth: 340 }}>
          <Icon nome="busca" tamanho={17} />
          <input className="input" type="search" placeholder="Buscar por usuário, ação ou justificativa" aria-label="Buscar na auditoria"
            value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <SeletorSimples rotuloVazio="Todos os usuários" valor={usuarioFiltro} onChange={setUsuarioFiltro}
          opcoes={data.usuarios.map((u) => ({ valor: u.id, rotulo: u.nome }))} />
        <SeletorSimples rotuloVazio="Todas as ações" valor={acaoFiltro} onChange={setAcaoFiltro}
          opcoes={Object.keys(ACOES).map((k) => ({ valor: k, rotulo: ACOES[k].rotulo }))} />
        <SeletorSimples rotuloVazio="" ariaLabel="Período" valor={String(dias)} onChange={(v) => setDias(Number(v))}
          opcoes={[7, 30, 90, 365].map((d) => ({ valor: String(d), rotulo: 'Últimos ' + d + ' dias' }))} />
        <button className="btn btn-ghost btn-sm" onClick={limpar}>Limpar</button>
      </div>

      <div className="card">
        {logs.length ? (
          <>
            <div className="table-wrap"><table className="table"><thead><tr>
              <th>Data e hora</th><th>Usuário</th><th>Perfil</th><th>Ação</th><th>Paciente</th><th>Detalhe</th><th>Origem</th>
            </tr></thead><tbody>
              {logs.slice(0, 300).map((l) => {
                const u = data.usuario(l.usuarioId);
                const p = l.pacienteId ? data.paciente(l.pacienteId) : null;
                const sens = sensivel(l.acao);
                const tom = tomAcao(l.acao);
                const classeBadge = tom === 'bad' ? 'badge-bad' : (tom === 'warn' ? 'badge-warn' : (tom === 'ok' ? 'badge-ok' : 'badge-muted'));
                return (
                  <tr key={l.id} style={sens ? { background: 'var(--atlas-warning-soft)' } : undefined}>
                    <td className="u-nowrap u-sm u-mono-num">{U.fmtTimestamp(l.timestamp)}</td>
                    <td className="u-sm"><div className="u-row u-gap-2">{u ? <Avatar nome={u.nome} cor={u.avatarCor} tamanho="sm" /> : null}<span>{u ? u.nome : 'Sistema'}</span></div></td>
                    <td className="u-xs u-muted u-nowrap">{u ? u.perfil + (u.servicoId ? ' · ' + data.siglaServico(u.servicoId) : '') : '—'}</td>
                    <td><span className={'badge ' + classeBadge}>{rotuloAcao(l.acao)}</span></td>
                    <td className="u-sm">{p ? <a href={'#/paciente/' + p.id} onClick={(e) => { e.preventDefault(); navigate('/paciente/' + p.id); }}>{U.nomeParcial(p.nomeCompleto)}</a> : <span className="u-faint">—</span>}</td>
                    <td className="u-xs u-muted" style={{ maxWidth: 340 }}>{l.detalhe || '—'}</td>
                    <td className="u-xs u-faint u-nowrap">{l.ip || '—'}</td>
                  </tr>
                );
              })}
            </tbody></table></div>
            {logs.length > 300 ? <div className="card-foot u-center u-xs u-muted">Exibindo os 300 registros mais recentes de {logs.length}. Use os filtros ou exporte o CSV completo.</div> : null}
          </>
        ) : <Vazio icone="auditoria" titulo="Nenhum registro encontrado" texto="Ajuste os filtros ou amplie o período." />}
      </div>
    </div>
  );
}
