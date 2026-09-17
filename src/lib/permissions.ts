/* SARES — Permissões. Porte de js/lib/auth.js.
   Única mudança estrutural: cada função recebia o usuário logado de um
   singleton global (SARES.db.state.sessao); aqui recebe por parâmetro —
   quem chama já tem o usuário vindo do useAuth(). Toda a lógica (quem pode
   o quê, e em qual escopo) é idêntica ao original. */

import type { Usuario, Perfil, Atendimento, FilaItem, Alerta } from './types';

export const PERFIS: Record<Perfil, { rotulo: string; curto: string; icone: string }> = {
  recepcao: { rotulo: 'Recepção / Acolhimento', curto: 'Recepção', icone: 'usuario' },
  profissional: { rotulo: 'Profissional', curto: 'Profissional', icone: 'prontuario' },
  coordenador: { rotulo: 'Coordenação de serviço', curto: 'Coordenação', icone: 'grupo' },
  gestor: { rotulo: 'Gestão municipal', curto: 'Gestão', icone: 'indicadores' }
};

export type Acao =
  | 'cadastrar_paciente' | 'editar_paciente' | 'inserir_fila' | 'ver_fila' | 'priorizar_fila'
  | 'registrar_atendimento' | 'registrar_anamnese' | 'agendar' | 'ver_evolucao' | 'encaminhar'
  | 'ver_duplicidades' | 'resolver_duplicidade' | 'ver_indicadores' | 'ver_auditoria'
  | 'gerenciar_usuarios' | 'ver_configuracoes';

/* ===================== Matriz de permissões =====================
   Quem PODE fazer o quê. O escopo (em qual serviço/especialidade) é uma
   segunda camada, aplicada pelas funções podeInserirNoServico/
   podeAgendarNestaFila/podeResolverAlerta/podeVerEvolucao/
   podeCancelarVinculoDeSobreposicao/podeManterSobreposicao logo abaixo —
   estar na lista de um perfil aqui não dá alcance sobre a rede inteira, só
   sobre o que aquele perfil legitimamente toca. */
export const PERMISSOES: Record<Acao, Perfil[]> = {
  cadastrar_paciente: ['recepcao', 'coordenador'],
  editar_paciente: ['recepcao', 'coordenador'],
  inserir_fila: ['recepcao', 'coordenador', 'profissional'],
  ver_fila: ['recepcao', 'profissional', 'coordenador', 'gestor'],
  priorizar_fila: ['coordenador', 'gestor'],
  registrar_atendimento: ['profissional', 'coordenador'],
  registrar_anamnese: ['profissional', 'coordenador'],
  agendar: ['recepcao', 'profissional', 'coordenador'],
  ver_evolucao: ['profissional', 'coordenador'],
  encaminhar: ['profissional', 'coordenador'],
  ver_duplicidades: ['recepcao', 'coordenador', 'gestor'],
  resolver_duplicidade: ['coordenador', 'gestor'],
  ver_indicadores: ['coordenador', 'gestor'],
  ver_auditoria: ['gestor'],
  gerenciar_usuarios: ['coordenador', 'gestor'],
  ver_configuracoes: ['gestor']
};

export function pode(usuario: Usuario | null, acao: Acao): boolean {
  if (!usuario) return false;
  const lista = PERMISSOES[acao];
  return !!lista && lista.indexOf(usuario.perfil) >= 0;
}

/* Regra de sigilo clínico entre serviços (LGPD). A evolução de um
   atendimento de outro serviço fica mascarada até que o profissional
   registre uma justificativa. */
export function podeVerEvolucao(usuario: Usuario | null, atendimento: Atendimento): boolean {
  if (!pode(usuario, 'ver_evolucao')) return false;
  return !!usuario!.servicoId && atendimento.servicoId === usuario!.servicoId;
}

/* Um alerta é "visível" quando tem a ver com quem está olhando — gestão vê
   a rede inteira, coordenação e recepção só o próprio serviço. Profissional
   não vê (ver_duplicidades não inclui esse perfil). */
export function alertaVisivel(
  usuario: Usuario | null,
  alerta: Alerta,
  alertaDoServico: (a: Alerta, servicoId: string | null) => boolean
): boolean {
  if (!pode(usuario, 'ver_duplicidades')) return false;
  if (usuario!.perfil === 'gestor') return true;
  return alertaDoServico(alerta, usuario!.servicoId); // recepcao e coordenador
}

/* Coordenação só resolve (mesclar cadastro, "são pessoas diferentes")
   duplicidades que tocam o PRÓPRIO serviço. Mesclar não apaga nada
   (histórico preservado), por isso segue por alerta inteiro, não por linha.
   Gestão resolve qualquer uma.

   NÃO cobre sobreposição de atendimento — essa tem regras próprias abaixo,
   porque "cancelar" e "manter os dois" envolvem serviços diferentes um do
   outro de um jeito que cadastro não envolve. */
export function podeResolverAlerta(
  usuario: Usuario | null,
  alerta: Alerta,
  alertaDoServico: (a: Alerta, servicoId: string | null) => boolean
): boolean {
  if (!pode(usuario, 'resolver_duplicidade')) return false;
  if (usuario!.perfil === 'gestor') return true;
  return alertaDoServico(alerta, usuario!.servicoId);
}

/* Numa sobreposição entre dois serviços (ex.: NAPE × CREAES), cancelar um
   vínculo tira a vaga de UM lado só. O coordenador do NAPE não decide se o
   CREAES abre mão da vaga dele — só o coordenador do CREAES decide sobre o
   vínculo do CREAES. */
export function podeCancelarVinculoDeSobreposicao(usuario: Usuario | null, filaItem: FilaItem): boolean {
  if (!pode(usuario, 'resolver_duplicidade')) return false;
  if (usuario!.perfil === 'gestor') return true;
  return filaItem.servicoId === usuario!.servicoId;
}

/* "Manter os dois" não fecha vaga de ninguém, mas decide o DESFECHO da
   sobreposição para os dois serviços de uma vez — um coordenador de só um
   dos lados não tem autoridade para decidir, em nome do outro serviço, que
   a duplicidade "está OK assim". Só quem responde pela rede inteira toma
   essa decisão. */
export function podeManterSobreposicao(usuario: Usuario | null): boolean {
  return usuario?.perfil === 'gestor';
}

/* Recepção, profissional e coordenação só cadastram/inserem alguém na fila
   do PRÓPRIO serviço — inserir diretamente em outro serviço é papel do
   encaminhamento, não de um cadastro ou "adicionar à fila" solto.
   `especialidade` é opcional — só profissional é travado nela (não atende
   área alheia); recepção/coordenação seguem livres entre as especialidades
   do próprio serviço. */
export function podeInserirNoServico(usuario: Usuario | null, servicoId: string, especialidade?: string): boolean {
  if (!usuario) return false;
  if (usuario.perfil === 'gestor') return true;
  if (servicoId !== usuario.servicoId) return false;
  if (especialidade && usuario.perfil === 'profissional') return especialidade === usuario.especialidade;
  return true;
}

/* Mesmo princípio para agendar: recepção e coordenação só marcam data
   dentro do próprio serviço; profissional, além disso, só na própria
   especialidade (embora o quadro dele já venha travado nisso — esta é a
   defesa em profundidade, não a única barreira). */
export function podeAgendarNestaFila(usuario: Usuario | null, filaItem: FilaItem): boolean {
  if (!pode(usuario, 'agendar')) return false;
  if (usuario!.perfil === 'gestor') return true;
  if (filaItem.servicoId !== usuario!.servicoId) return false;
  if (usuario!.perfil === 'profissional') return filaItem.especialidade === usuario!.especialidade;
  return true; // recepcao, coordenador
}

/* Coordenação gerencia (prioriza/remove) só o próprio serviço, mesmo que o
   seletor deixe VER as filas dos outros 4 — visibilidade cruzada é útil
   para achar sobreposição, mas mexer na fila alheia não é papel dela.
   Gestão, que responde pela rede inteira, não tem essa restrição. */
export function podeGerenciarFila(usuario: Usuario | null, filaItem: FilaItem): boolean {
  if (!pode(usuario, 'priorizar_fila')) return false;
  if (usuario!.perfil === 'coordenador') return filaItem.servicoId === usuario!.servicoId;
  return true;
}

/* ---------- Expiração por inatividade (LGPD) ---------- */
export const LIMITE_INATIVIDADE = 15 * 60 * 1000;
