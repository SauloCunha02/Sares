/* SARES — Configurações: usuários, serviços e (só para a gestão) o
   ambiente de demonstração. Porte de js/screens/configuracoes.js — a aba
   "Ambiente de demonstração" e "Entrar como" ficam restritas a quem tem
   ver_configuracoes (só gestor): são ferramentas de administração da
   base, não algo que qualquer perfil deveria ver. */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Vazio, Abas, Avatar, ChipServico, Campo, Selecao, Kpi } from '../components/ui';
import { Icon } from '../components/Icon';
import { useAuth } from '../lib/AuthContext';
import { useData } from '../lib/DataContext';
import { useMutations } from '../lib/mutations';
import { useTopbar } from '../lib/TopbarContext';
import { pode, PERFIS } from '../lib/permissions';
import { getSecondaryAuth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, getCountFromServer } from 'firebase/firestore';
import { SENHA_DEMO } from '../lib/seed';
import { U } from '../lib/utils';
import { abrirModal, confirmar } from '../lib/modal';
import { ok as toastOk, aviso as toastAviso, info as toastInfo } from '../lib/toast';
import type { Perfil, Servico, Usuario } from '../lib/types';

export default function Configuracoes() {
  const { usuario } = useAuth();
  const data = useData();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const podeTudo = !!usuario && pode(usuario, 'ver_configuracoes');
  const podeEquipe = !!usuario && pode(usuario, 'gerenciar_usuarios');
  const permitido = podeTudo || podeEquipe;

  const aba = podeTudo ? (params.get('aba') || 'usuarios') : 'usuarios';
  const meuServico = usuario?.servicoId ? data.servico(usuario.servicoId) : null;

  useTopbar(
    permitido ? (podeTudo ? 'Configurações' : 'Equipe do ' + (meuServico?.sigla || '')) : 'Acesso restrito',
    permitido ? (podeTudo ? 'Administração da rede municipal' : 'Cadastro e situação dos profissionais do ' + (meuServico?.nome || '')) : undefined
  );

  if (!usuario) return null;

  if (!permitido) {
    return <div className="view-narrow">
      <Vazio icone="cadeado" titulo="Configurações restritas" texto="A gestão municipal administra a rede completa, e a coordenação de cada serviço administra a própria equipe."
        acao={<a className="btn btn-secondary" href="#/inicio" onClick={(e) => { e.preventDefault(); navigate('/inicio'); }}>Voltar</a>} />
    </div>;
  }

  return (
    <div className="view-wide">
      <div className="page-head"><div className="ph-title">
        <h1>{podeTudo ? 'Configurações' : 'Equipe do ' + (meuServico?.sigla || '')}</h1>
        <p>{podeTudo ? 'Usuários e serviços da rede municipal.' : 'Quem tem acesso ao sistema em nome do ' + (meuServico?.nome || '') + '.'}</p>
      </div></div>

      {podeTudo ? (
        <Abas itens={[
          { id: 'usuarios', rotulo: 'Usuários', contador: data.usuarios.length },
          { id: 'servicos', rotulo: 'Serviços da rede', contador: data.servicos.length },
          { id: 'demo', rotulo: 'Ambiente de demonstração' }
        ]} ativa={aba} aoTrocar={(a) => navigate('/configuracoes?aba=' + a)} />
      ) : null}

      <div className="u-mt-4">
        {aba === 'usuarios' && <AbaUsuarios escopoServicoId={podeTudo ? null : (meuServico?.id || null)} podeImpersonar={podeTudo} />}
        {aba === 'servicos' && podeTudo && <AbaServicos />}
        {aba === 'demo' && podeTudo && <AbaDemonstracao />}
      </div>
    </div>
  );
}

/* ===================== Usuários ===================== */
function AbaUsuarios({ escopoServicoId, podeImpersonar }: { escopoServicoId: string | null; podeImpersonar: boolean }) {
  const data = useData();
  const { usuario, entrarComo } = useAuth();
  const navigate = useNavigate();
  const mut = useMutations();
  _mutationsAtual = mut;
  const [, render] = useState(0);
  const lista = escopoServicoId ? data.usuariosDoServico(escopoServicoId) : data.usuarios;

  async function onEntrarComo(alvo: Usuario) {
    await entrarComo(alvo);
    toastInfo('Perfil alterado', 'Agora você está como ' + alvo.nome + ' — ' + PERFIS[alvo.perfil].rotulo + '.');
    navigate('/inicio');
  }

  function podeGerenciarEsteUsuario(alvo: Usuario | null): boolean {
    if (!alvo) return false;
    if (pode(usuario, 'ver_configuracoes')) return true;
    return alvo.servicoId === usuario?.servicoId;
  }

  async function alternarAtivo(alvo: Usuario) {
    if (!podeGerenciarEsteUsuario(alvo)) return;
    if (alvo.id === usuario?.id) { toastAviso('Ação não permitida', 'Você não pode desativar o próprio usuário.'); return; }
    const mut = obterMutations();
    const novoStatus = !alvo.ativo;
    await mut.atualizarUsuario(alvo.id, { ativo: novoStatus });
    toastOk(novoStatus ? 'Usuário ativado' : 'Usuário desativado', alvo.nome);
  }

  return (
    <div className="card">
      <div className="card-head"><h3>{escopoServicoId ? 'Equipe' : 'Usuários da rede'}</h3>
        <div className="u-row u-gap-3">
          <button className="btn btn-sm btn-primary" onClick={() => abrirUsuarioModal(null, usuario!, data, () => render((n) => n + 1))}>
            <Icon nome="mais" tamanho={14} /> Novo</button>
        </div>
      </div>
      {lista.length ? (
        <div className="table-wrap"><table className="table"><thead><tr>
          <th>Usuário</th><th>Perfil</th>{!escopoServicoId ? <th>Serviço</th> : null}<th>Especialidade</th><th>Conselho</th><th>Situação</th><th></th>
        </tr></thead><tbody>
          {lista.map((u) => (
            <tr key={u.id}>
              <td><div className="u-row u-gap-3"><Avatar nome={u.nome} cor={u.avatarCor} tamanho="sm" />
                <div><div className="u-medium">{u.nome}</div><div className="u-xs u-faint">{u.email}</div></div></div></td>
              <td><span className="badge">{PERFIS[u.perfil].curto}</span></td>
              {!escopoServicoId ? <td>{u.servicoId ? <ChipServicoDe servicoId={u.servicoId} /> : <span className="u-xs u-faint">Rede municipal</span>}</td> : null}
              <td className="u-sm">{u.especialidade || '—'}</td>
              <td className="u-xs u-muted">{u.conselho || '—'}</td>
              <td>{u.ativo ? <span className="badge badge-ok">Ativo</span> : <span className="badge badge-muted">Inativo</span>}</td>
              <td className="u-right u-nowrap">
                <button className="btn btn-sm btn-ghost" onClick={() => { if (podeGerenciarEsteUsuario(u)) abrirUsuarioModal(u, usuario!, data, () => render((n) => n + 1)); }}>Editar</button>{' '}
                {podeImpersonar ? <>
                  <button className="btn btn-sm btn-secondary" onClick={() => onEntrarComo(u)}>Entrar como</button>{' '}
                </> : null}
                <button className="btn btn-sm btn-ghost" onClick={() => alternarAtivo(u)}>{u.ativo ? 'Desativar' : 'Ativar'}</button>
              </td>
            </tr>
          ))}
        </tbody></table></div>
      ) : <div className="card-body"><Vazio icone="usuario" titulo="Nenhum profissional cadastrado" texto="Cadastre o primeiro profissional deste serviço." /></div>}
    </div>
  );
}

function ChipServicoDe({ servicoId }: { servicoId: string }) {
  const data = useData();
  const s = data.servico(servicoId);
  if (!s) return null;
  return <ChipServico sigla={s.sigla} cor={s.cor} nome={s.nome} />;
}

/* ===================== Criar / editar usuário (modal) =====================
   Coordenador só cadastra recepção e profissional, sempre no próprio
   serviço — mesmo que o formulário seja adulterado, o handler de
   confirmação força esses dois limites de novo (defesa em profundidade,
   mesmo padrão usado em filas.js). */
interface FormUsuario { nome: string; email: string; emailTocado: boolean; perfil: Perfil; servicoId: string; especialidade: string; conselho: string }

function abrirUsuarioModal(usuarioExistente: Usuario | null, usuario: Usuario, data: ReturnType<typeof useData>, recarregar: () => void) {
  const souGestor = pode(usuario, 'ver_configuracoes');
  const meuServicoId = usuario.servicoId || '';
  const editando = !!usuarioExistente;

  let perfisPermitidos: Perfil[] = souGestor ? ['recepcao', 'profissional', 'coordenador', 'gestor'] : ['recepcao', 'profissional'];
  if (editando && !perfisPermitidos.includes(usuarioExistente!.perfil)) perfisPermitidos = [...perfisPermitidos, usuarioExistente!.perfil];

  const servicos: Servico[] = souGestor ? data.servicos : [data.servico(meuServicoId)].filter((s): s is Servico => !!s);

  const formState: FormUsuario = {
    nome: editando ? usuarioExistente!.nome : '',
    email: editando ? usuarioExistente!.email : '',
    emailTocado: editando,
    perfil: editando ? usuarioExistente!.perfil : (perfisPermitidos[1] || perfisPermitidos[0]),
    servicoId: editando ? (usuarioExistente!.servicoId || '') : meuServicoId,
    especialidade: editando ? (usuarioExistente!.especialidade || '') : '',
    conselho: editando ? (usuarioExistente!.conselho || '') : ''
  };

  abrirModal({
    titulo: editando ? 'Editar usuário' : 'Novo usuário',
    subtitulo: souGestor ? 'Gestão municipal — qualquer serviço e perfil' : 'Equipe do ' + (data.servico(meuServicoId)?.sigla || '') + ' — recepção ou profissional',
    tamanho: 'lg',
    corpo: () => (
      <CorpoUsuarioModal formState={formState} perfisPermitidos={perfisPermitidos} souGestor={souGestor} servicos={servicos}
        meuServicoId={meuServicoId} data={data} />
    ),
    rodape: (fechar) => (
      <RodapeUsuarioModal fechar={fechar} formState={formState} perfisPermitidos={perfisPermitidos} souGestor={souGestor}
        meuServicoId={meuServicoId} editando={editando} usuarioExistente={usuarioExistente} data={data} recarregar={recarregar} />
    )
  });
}

function CorpoUsuarioModal({ formState, perfisPermitidos, souGestor, servicos, meuServicoId, data }: {
  formState: FormUsuario; perfisPermitidos: Perfil[]; souGestor: boolean; servicos: Servico[]; meuServicoId: string; data: ReturnType<typeof useData>;
}) {
  const [, render] = useState(0);
  const svAtualId = souGestor ? formState.servicoId : meuServicoId;
  const svAtual = svAtualId ? data.servico(svAtualId) : null;
  const precisaEsp = formState.perfil === 'profissional' || formState.perfil === 'coordenador';

  function atualizar<K extends keyof FormUsuario>(campo: K, valor: FormUsuario[K]) {
    formState[campo] = valor;
    render((n) => n + 1);
  }

  return (
    <div className="form-grid">
      <Campo rotulo="Nome completo" obrigatorio largura={2} value={formState.nome}
        onChange={(e) => atualizar('nome', e.target.value)}
        onBlur={() => {
          if (formState.emailTocado || !formState.nome.trim()) return;
          atualizar('email', U.normalizar(formState.nome).split(' ').slice(0, 2).join('.') + '@crateus.ce.gov.br');
        }} />
      <Campo rotulo="E-mail institucional" type="email" obrigatorio largura={2} dica="Sugerido a partir do nome — pode ajustar"
        value={formState.email} onChange={(e) => { formState.emailTocado = true; atualizar('email', e.target.value); }} />
      <Selecao rotulo="Perfil" obrigatorio vazio={false} valor={formState.perfil}
        opcoes={perfisPermitidos.map((p) => ({ valor: p, rotulo: PERFIS[p].rotulo }))}
        onChange={(v) => atualizar('perfil', v as Perfil)} />
      {souGestor ? (
        <Selecao rotulo="Serviço" placeholder="Rede municipal (sem serviço)" valor={formState.servicoId}
          opcoes={servicos.map((s) => ({ valor: s.id, rotulo: s.sigla + ' — ' + s.nome }))}
          onChange={(v) => atualizar('servicoId', v)} />
      ) : (
        <div className="field"><label>Serviço</label><input className="input" disabled value={(data.servico(meuServicoId)?.sigla || '') + ' — ' + (data.servico(meuServicoId)?.nome || '')} /></div>
      )}
      {precisaEsp ? (
        <Selecao rotulo="Especialidade" valor={formState.especialidade} opcoes={svAtual ? svAtual.especialidades : []}
          onChange={(v) => atualizar('especialidade', v)} />
      ) : null}
      <Campo rotulo="Conselho profissional" placeholder="ex.: CRP 11/09233" value={formState.conselho} onChange={(e) => atualizar('conselho', e.target.value)} />
    </div>
  );
}

function RodapeUsuarioModal({ fechar, formState, perfisPermitidos, souGestor, meuServicoId, editando, usuarioExistente, data, recarregar }: {
  fechar: () => void; formState: FormUsuario; perfisPermitidos: Perfil[]; souGestor: boolean; meuServicoId: string;
  editando: boolean; usuarioExistente: Usuario | null; data: ReturnType<typeof useData>; recarregar: () => void;
}) {
  const mut = useMutations();

  async function confirmarClick() {
    const nome = formState.nome.trim();
    const email = formState.email.trim();
    let perfil = formState.perfil;
    const especialidade0 = formState.especialidade || null;
    const conselho = formState.conselho.trim() || null;

    if (!nome || !email || !perfil) { toastAviso('Campos obrigatórios', 'Preencha nome, e-mail e perfil.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toastAviso('E-mail inválido', 'Confira o endereço institucional.'); return; }
    if (data.emailEmUso(email, editando ? usuarioExistente!.id : undefined)) { toastAviso('E-mail já cadastrado', 'Já existe um usuário com este e-mail na rede.'); return; }

    let servicoId: string | null;
    if (souGestor) {
      servicoId = formState.servicoId || null;
    } else {
      if (!perfisPermitidos.includes(perfil)) perfil = 'profissional';
      servicoId = meuServicoId;
    }
    const especialidade = (perfil === 'recepcao') ? null : especialidade0;

    if (editando) {
      await mut.atualizarUsuario(usuarioExistente!.id, { nome, email, perfil, servicoId, especialidade, conselho });
      toastOk('Usuário atualizado', nome);
    } else {
      /* createUserWithEmailAndPassword na sessão principal trocaria quem
         está logado agora por essa conta nova — por isso roda numa
         instância secundária do Firebase App, descartável, que nunca
         fica "logada" no resto do app. */
      const secAuth = getSecondaryAuth();
      let authUid: string | null = null;
      try {
        const cred = await createUserWithEmailAndPassword(secAuth, email, SENHA_DEMO);
        authUid = cred.user.uid;
        await signOut(secAuth);
      } catch (err: unknown) {
        toastAviso('Não foi possível criar a conta', (err as { message?: string })?.message || 'Tente novamente.');
        return;
      }
      const s = servicoId ? data.servico(servicoId) : null;
      const novo = await mut.criarUsuario({ nome, email, perfil, servicoId, especialidade, conselho, avatarCor: s ? s.cor : null });
      // authUid liga a conta recém-criada ao documento; authUsers é o que as
      // regras do Firestore checam para liberar leitura/escrita protegida.
      await mut.atualizarUsuario(novo.id, { authUid });
      if (authUid) await mut.provisionarAuthUser(authUid, novo.id);
      toastOk('Usuário cadastrado', nome + ' já pode entrar com a senha padrão da rede.');
    }

    fechar();
    recarregar();
  }

  return (
    <>
      <button className="btn btn-secondary" onClick={fechar}>Cancelar</button>
      <button className="btn btn-primary" onClick={confirmarClick}>{editando ? 'Salvar alterações' : 'Cadastrar usuário'}</button>
    </>
  );
}

/* ===================== Serviços ===================== */
function AbaServicos() {
  const data = useData();
  return (
    <div className="grid grid-2">
      {data.servicos.map((s) => {
        const fila = data.filasDoServico(s.id).length;
        const ats = data.atendimentos.filter((a) => a.servicoId === s.id).length;
        const profs = data.usuarios.filter((u) => u.servicoId === s.id).length;
        return (
          <div className="card" key={s.id}>
            <div className="card-head">
              <div className="u-row u-gap-3">
                <span className="dot" style={{ background: s.cor, width: 12, height: 12 }} />
                <div><h3>{s.sigla}</h3><p className="u-xs u-muted">{s.nome}</p></div>
              </div>
            </div>
            <div className="card-body">
              <div className="data-grid u-mb-4">
                <div className="data-item"><div className="di-k">Secretaria</div><div className="di-v">{s.secretaria}</div></div>
                <div className="data-item"><div className="di-k">Endereço</div><div className="di-v">{s.endereco}</div></div>
              </div>
              <div className="u-row u-gap-5 u-wrap u-mb-4">
                <div><div className="u-bold" style={{ fontSize: 20 }}>{fila}</div><div className="u-xs u-faint">na fila</div></div>
                <div><div className="u-bold" style={{ fontSize: 20 }}>{ats}</div><div className="u-xs u-faint">atendimentos</div></div>
                <div><div className="u-bold" style={{ fontSize: 20 }}>{profs}</div><div className="u-xs u-faint">usuários</div></div>
              </div>
              <div className="di-k u-mb-2">Especialidades</div>
              <div className="u-row u-gap-2 u-wrap">
                {s.especialidades.map((e) => <span className="badge badge-muted" key={e}>{e}</span>)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ===================== Ambiente de demonstração (só gestão) =====================
   Ferramentas de administração da base — regeneram a mesma seed
   determinística de scripts/seed.ts direto no Firestore, sem precisar
   rodar nada no terminal. usuarios/servicos nunca são tocados (têm conta
   de Firebase Auth de verdade atrelada). */
function AbaDemonstracao() {
  const data = useData();
  const mut = useMutations();
  const [emAndamento, setEmAndamento] = useState<string | null>(null);
  const [totalLogs, setTotalLogs] = useState<number | null>(null);

  const vinculosAguardando = data.filas.filter((f) => f.status === 'aguardando').length;

  useEffect(() => {
    /* getCountFromServer conta no servidor sem baixar os documentos — custa
       1 leitura fixa, não uma por registro de auditoria (que não é
       carregado globalmente, ver DataContext.tsx). */
    getCountFromServer(collection(db, 'logs')).then((snap) => setTotalLogs(snap.data().count)).catch(() => setTotalLogs(null));
  }, []);

  function reiniciarDados() {
    confirmar({
      titulo: 'Reiniciar dados de demonstração',
      mensagem: 'Pacientes, filas, atendimentos, anamneses e alertas voltam ao estado original da seed (42 pacientes, as quatro duplicidades plantadas e todo o histórico). Usuários e serviços não são alterados. Tudo o que foi criado depois é descartado — esta ação não pode ser desfeita.',
      rotuloConfirmar: 'Reiniciar', perigo: true
    }, async () => {
      setEmAndamento('reiniciar');
      try {
        await mut.reiniciarDados();
        toastOk('Dados restaurados', 'A base voltou ao estado original da seed.');
      } finally {
        setEmAndamento(null);
      }
    });
  }

  function avancarTempo() {
    confirmar({
      titulo: 'Avançar o tempo em 30 dias',
      mensagem: 'As datas de atendimentos, filas e cadastros recuam 30 dias, simulando a passagem de um mês. Os indicadores e os tempos de espera são recalculados a partir disso.',
      rotuloConfirmar: 'Avançar 30 dias'
    }, async () => {
      setEmAndamento('avancar');
      try {
        await mut.avancarTempo30Dias();
        toastOk('Tempo avançado', 'A base agora reflete o mês seguinte. Veja os indicadores.');
      } finally {
        setEmAndamento(null);
      }
    });
  }

  return (
    <>
      <div className="card u-mb-4">
        <div className="card-head"><h3>Estado atual da base</h3></div>
        <div className="card-body"><div className="grid grid-4">
          <Kpi rotulo="Pacientes" valor={data.pacientes.length} />
          <Kpi rotulo="Atendimentos" valor={data.atendimentos.length} />
          <Kpi rotulo="Vínculos de fila aguardando" valor={vinculosAguardando} />
          <Kpi rotulo="Registros de auditoria" valor={totalLogs ?? '—'} />
        </div></div>
      </div>

      <div className="grid grid-2">
        <div className="card"><div className="card-body">
          <h3 className="u-mb-2"><Icon nome="recarregar" tamanho={18} /> Reiniciar dados</h3>
          <p className="u-sm u-muted u-mb-4">Restaura a base original da seed: 42 pacientes, as quatro duplicidades plantadas e todo o histórico de atendimentos. Usuários e serviços não são afetados.</p>
          <button className="btn btn-secondary" disabled={!!emAndamento} onClick={reiniciarDados}>
            {emAndamento === 'reiniciar' ? 'Reiniciando…' : 'Reiniciar dados de demonstração'}
          </button>
        </div></div>

        <div className="card"><div className="card-body">
          <h3 className="u-mb-2"><Icon nome="calendario" tamanho={18} /> Avançar o tempo</h3>
          <p className="u-sm u-muted u-mb-4">Recua todas as datas em 30 dias para simular o mês seguinte. Útil para mostrar a evolução dos indicadores.</p>
          <button className="btn btn-secondary" disabled={!!emAndamento} onClick={avancarTempo}>
            {emAndamento === 'avancar' ? 'Avançando…' : 'Avançar 30 dias'}
          </button>
        </div></div>
      </div>
    </>
  );
}

/* Modal aberto fora de componente React — mesmo truque de ponte usado em Duplicidades.tsx. */
let _mutationsAtual: ReturnType<typeof useMutations> | null = null;
function obterMutations() {
  if (!_mutationsAtual) throw new Error('mutations ainda não inicializado');
  return _mutationsAtual;
}
