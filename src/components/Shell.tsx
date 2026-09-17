/* SARES — Estrutura da aplicação. Porte de js/ui/shell.js. */
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { Icon } from './Icon';
import { Avatar, ChipsServicos } from './ui';
import { useAuth } from '../lib/AuthContext';
import { useData } from '../lib/DataContext';
import { PERFIS, pode, type Acao } from '../lib/permissions';
import { confirmar } from '../lib/modal';
import { U } from '../lib/utils';
import { TopbarProvider } from '../lib/TopbarContext';
import type { Usuario } from '../lib/types';

interface NavItem {
  id: string; rota: string; rotulo: string; icone: string;
  permissao: Acao | Acao[] | null; mobile: boolean; badge?: boolean;
}

const NAV: NavItem[] = [
  { id: 'inicio', rota: '/inicio', rotulo: 'Início', icone: 'inicio', permissao: null, mobile: true },
  { id: 'pacientes', rota: '/pacientes', rotulo: 'Pacientes', icone: 'pacientes', permissao: null, mobile: true },
  { id: 'filas', rota: '/filas', rotulo: 'Filas', icone: 'fila', permissao: 'ver_fila', mobile: true },
  { id: 'duplicidades', rota: '/duplicidades', rotulo: 'Duplicidades', icone: 'duplicidade', permissao: 'ver_duplicidades', mobile: true, badge: true },
  { id: 'indicadores', rota: '/indicadores', rotulo: 'Indicadores', icone: 'indicadores', permissao: 'ver_indicadores', mobile: true },
  { id: 'auditoria', rota: '/auditoria', rotulo: 'Auditoria', icone: 'auditoria', permissao: 'ver_auditoria', mobile: false },
  { id: 'configuracoes', rota: '/configuracoes', rotulo: 'Configurações', icone: 'config', permissao: ['ver_configuracoes', 'gerenciar_usuarios'], mobile: false }
];

function itensVisiveis(usuario: Usuario | null): NavItem[] {
  return NAV.filter((n) => {
    if (!n.permissao) return true;
    const lista = Array.isArray(n.permissao) ? n.permissao : [n.permissao];
    return lista.some((p) => pode(usuario, p));
  });
}

function Marca({ comTexto = true }: { comTexto?: boolean }) {
  return (
    <>
      <img className="brand-mark" src="/SARES.png" alt="" aria-hidden="true" />
      {comTexto ? (
        <span className="brand-text">
          <span className="bt-name">SARES</span>
          <span className="bt-sub">Rede de cuidado TEA</span>
        </span>
      ) : null}
    </>
  );
}

function Sidebar() {
  const { usuario, sair } = useAuth();
  const { servico, alertaDoServico, alertasAbertos } = useData();
  const navigate = useNavigate();
  if (!usuario) return null;
  const sv = usuario.servicoId ? servico(usuario.servicoId) : null;
  const abertos = usuario.perfil === 'gestor'
    ? alertasAbertos().length
    : alertasAbertos().filter((a) => alertaDoServico(a, usuario.servicoId)).length;
  const visivel = pode(usuario, 'ver_duplicidades') ? abertos : 0;

  function onSair() {
    confirmar({
      titulo: 'Sair do sistema',
      mensagem: 'Deseja encerrar a sessão?',
      rotuloConfirmar: 'Sair'
    }, async () => {
      await sair();
      navigate('/login');
    });
  }

  return (
    <aside className="sidebar" id="app-sidebar">
      <div className="brand"><Marca /></div>
      <nav className="nav" aria-label="Navegação principal">
        {itensVisiveis(usuario).map((n) => (
          <NavLink className={({ isActive }) => 'nav-item' + (isActive ? ' is-on' : '')} to={n.rota} key={n.id}>
            <Icon nome={n.icone} tamanho={18} /><span>{n.rotulo}</span>
            {n.badge && visivel ? <span className="nav-badge">{visivel}</span> : null}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-user">
        <Avatar nome={usuario.nome} cor={usuario.avatarCor} />
        <div className="su-meta">
          <div className="su-name">{usuario.nome}</div>
          <div className="su-role">{PERFIS[usuario.perfil].curto + (sv ? ' · ' + sv.sigla : ' · Rede')}</div>
        </div>
        <button className="btn-icon" aria-label="Sair do sistema" title="Sair" onClick={onSair}>
          <Icon nome="sair" tamanho={17} />
        </button>
      </div>
    </aside>
  );
}

function BottomNav() {
  const { usuario } = useAuth();
  const { alertaDoServico, alertasAbertos } = useData();
  if (!usuario) return null;
  const abertos = usuario.perfil === 'gestor'
    ? alertasAbertos().length
    : alertasAbertos().filter((a) => alertaDoServico(a, usuario.servicoId)).length;
  const visivel = pode(usuario, 'ver_duplicidades') ? abertos : 0;

  return (
    <nav className="bottomnav" aria-label="Navegação">
      {itensVisiveis(usuario).filter((n) => n.mobile).slice(0, 5).map((n) => (
        <NavLink className={({ isActive }) => 'bn-item' + (isActive ? ' is-on' : '')} to={n.rota} key={n.id}>
          <Icon nome={n.icone} tamanho={21} /><span>{n.rotulo}</span>
          {n.badge && visivel ? <span className="bn-badge">{visivel}</span> : null}
        </NavLink>
      ))}
    </nav>
  );
}

function BuscaGlobal() {
  const { pacientes, servicosDoPaciente, corServico, alertaDoPaciente, servico } = useData();
  const [termo, setTermo] = useState('');
  const [aberta, setAberta] = useState(false);
  const navigate = useNavigate();

  const achados = useMemo(() => {
    const norm = U.normalizar(termo);
    if (norm.length < 2) return [];
    const soDigitos = termo.replace(/\D/g, '');
    return pacientes.filter((p) =>
      U.normalizar(p.nomeCompleto).indexOf(norm) >= 0 ||
      U.normalizar(p.nomeMae).indexOf(norm) >= 0 ||
      (soDigitos.length >= 3 && (String(p.cns).indexOf(soDigitos) >= 0 || String(p.cpf).indexOf(soDigitos) >= 0)) ||
      p.dataNascimento === termo
    ).slice(0, 8);
  }, [termo, pacientes]);

  function irPara(pacienteId: string) {
    setAberta(false); setTermo('');
    navigate('/paciente/' + pacienteId);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (achados.length === 1) irPara(achados[0].id);
    else if (termo.trim().length >= 2) {
      setAberta(false);
      navigate('/pacientes?busca=' + encodeURIComponent(termo.trim()));
    }
  }

  return (
    <div className="topbar-search">
      <div className="searchbox">
        <Icon nome="busca" tamanho={17} />
        <input className="input" type="search" id="busca-global" placeholder="Buscar paciente…  /" autoComplete="off"
          aria-label="Buscar paciente por nome, CNS, CPF ou nome da mãe"
          value={termo}
          onChange={(e) => { setTermo(e.target.value); setAberta(e.target.value.length >= 2); }}
          onFocus={() => { if (termo.length >= 2) setAberta(true); }}
          onBlur={() => setTimeout(() => setAberta(false), 150)}
          onKeyDown={onKeyDown}
        />
      </div>
      <div className={'search-results' + (aberta && termo.length >= 2 ? '' : ' u-hidden')} id="busca-resultados">
        {achados.length ? achados.map((p) => {
          const svs = servicosDoPaciente(p.id);
          const alerta = alertaDoPaciente(p.id);
          return (
            <button className="sr-item" key={p.id} onMouseDown={(e) => e.preventDefault()} onClick={() => irPara(p.id)}>
              <Avatar nome={p.nomeCompleto} cor={corServico(svs[0])} tamanho="sm" />
              <span className="u-grow" style={{ minWidth: 0 }}>
                <span className="u-medium u-truncate" style={{ display: 'block' }}>
                  {p.nomeCompleto}{alerta ? <span className="badge badge-warn sr-dup"> ⚠ duplicidade</span> : null}
                </span>
                <span className="u-xs u-faint">{U.idadeTexto(p.dataNascimento)} · {U.maskCNS(p.cns)}</span>
                <span style={{ display: 'block', marginTop: 4 }}>
                  <ChipsServicos servicos={svs.map((id) => { const s = servico(id)!; return { id, sigla: s.sigla, cor: s.cor, nome: s.nome }; })} />
                </span>
              </span>
            </button>
          );
        }) : <div className="sr-empty">Nenhum paciente encontrado para "{termo}"</div>}
      </div>
    </div>
  );
}

function Topbar({ estado }: { estado: { titulo: string; subtitulo?: string; acoes?: ReactNode } }) {
  const { usuario } = useAuth();
  const { alertaDoServico, alertasAbertos } = useData();
  if (!usuario) return null;
  const abertos = usuario.perfil === 'gestor'
    ? alertasAbertos().length
    : alertasAbertos().filter((a) => alertaDoServico(a, usuario.servicoId)).length;

  return (
    <header className="topbar" id="app-topbar">
      <span className="mobile-brand"><Marca comTexto={false} /></span>
      <div style={{ minWidth: 0 }}>
        <h1 className="u-truncate">{estado.titulo}</h1>
        {estado.subtitulo ? <div className="tb-sub u-truncate">{estado.subtitulo}</div> : null}
      </div>
      <span className="tb-spacer" />
      {estado.acoes}
      <BuscaGlobal />
      {pode(usuario, 'ver_duplicidades') ? (
        <NavLink className="btn-icon bell" to="/duplicidades" aria-label={abertos + ' alertas de duplicidade abertos'} title="Alertas de duplicidade">
          <Icon nome="sino" tamanho={18} />
          {abertos ? <span className="bell-count">{abertos}</span> : null}
        </NavLink>
      ) : null}
    </header>
  );
}

export function Shell() {
  const [topbarEstado, setTopbarEstado] = useState<{ titulo: string; subtitulo?: string; acoes?: ReactNode }>({ titulo: '' });
  const set = useCallback((s: { titulo: string; subtitulo?: string; acoes?: ReactNode }) => setTopbarEstado(s), []);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#app-view">Pular para o conteúdo</a>
      <div className="app-body">
        <Sidebar />
        <main className="main">
          <Topbar estado={topbarEstado} />
          <div className="view" id="app-view" tabIndex={-1}>
            <TopbarProvider value={{ estado: topbarEstado, set }}>
              <Outlet />
            </TopbarProvider>
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
