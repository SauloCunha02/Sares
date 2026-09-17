/* SARES — Trilha de auditoria (LGPD). Porte de js/lib/audit.js.
   `log()` grava direto no Firestore (não precisa passar pelas outras
   coleções em memória), então não depende de useMutations() — só do
   usuário logado, vindo de quem chama. */
import { addDoc, collection } from 'firebase/firestore';
import { db } from './firebase';
import type { Usuario, Atendimento } from './types';

export const ACOES: Record<string, { rotulo: string; tom: 'muted' | 'ok' | 'warn' | 'info' | 'bad' }> = {
  login: { rotulo: 'Entrou no sistema', tom: 'muted' },
  logout: { rotulo: 'Saiu do sistema', tom: 'muted' },
  troca_perfil_demo: { rotulo: 'Trocou de perfil (demonstração)', tom: 'muted' },
  criou_paciente: { rotulo: 'Criou cadastro de paciente', tom: 'ok' },
  editou_paciente: { rotulo: 'Editou cadastro de paciente', tom: 'warn' },
  visualizou_prontuario: { rotulo: 'Visualizou prontuário', tom: 'info' },
  acessou_evolucao_outro_servico: { rotulo: 'Acessou evolução de outro serviço', tom: 'bad' },
  registrou_atendimento: { rotulo: 'Registrou atendimento', tom: 'ok' },
  registrou_anamnese: { rotulo: 'Registrou anamnese', tom: 'ok' },
  agendou_atendimento: { rotulo: 'Agendou atendimento', tom: 'info' },
  consolidou_filas: { rotulo: 'Consolidou vínculos de fila', tom: 'warn' },
  acesso_negado: { rotulo: 'Acesso negado pelo sistema', tom: 'bad' },
  criou_usuario: { rotulo: 'Criou usuário', tom: 'ok' },
  editou_usuario: { rotulo: 'Editou usuário', tom: 'warn' },
  inseriu_fila: { rotulo: 'Inseriu paciente em fila', tom: 'info' },
  alterou_prioridade: { rotulo: 'Alterou prioridade na fila', tom: 'warn' },
  removeu_fila: { rotulo: 'Removeu vínculo de fila', tom: 'warn' },
  mesclou_cadastros: { rotulo: 'Mesclou cadastros duplicados', tom: 'warn' },
  descartou_alerta: { rotulo: 'Descartou alerta de duplicidade', tom: 'muted' },
  exportou_dados: { rotulo: 'Exportou dados', tom: 'bad' },
  solicitou_exclusao: { rotulo: 'Solicitou exclusão de dados', tom: 'bad' },
  encaminhou: { rotulo: 'Gerou encaminhamento', tom: 'ok' }
};

export function rotuloAcao(acao: string): string { return ACOES[acao]?.rotulo || acao; }
export function tomAcao(acao: string): string { return ACOES[acao]?.tom || 'muted'; }

/* Ações consideradas sensíveis — destacadas na tela de auditoria */
export function sensivel(acao: string): boolean {
  return ['acessou_evolucao_outro_servico', 'exportou_dados', 'solicitou_exclusao', 'mesclou_cadastros'].indexOf(acao) >= 0;
}

export async function log(
  usuario: Usuario | null, acao: string, entidade: string | null,
  entidadeId: string | null, pacienteId: string | null, detalhe: string
) {
  await addDoc(collection(db, 'logs'), {
    usuarioId: usuario ? usuario.id : null,
    acao, entidade: entidade || null, entidadeId: entidadeId || null,
    pacienteId: pacienteId || null, detalhe: detalhe || '',
    timestamp: Date.now(), ip: '10.12.0.1'
  });
}

/* Registra a quebra de sigilo com a justificativa informada pelo profissional */
export async function logQuebraSigilo(
  usuario: Usuario | null, atendimento: Atendimento, justificativa: string, siglaServico: (id: string) => string
) {
  await log(usuario, 'acessou_evolucao_outro_servico', 'atendimento', atendimento.id, atendimento.pacienteId,
    'Serviço de origem: ' + siglaServico(atendimento.servicoId) + ' — Justificativa: "' + justificativa + '"');
}

export function filtrar<T extends { usuarioId: string | null; acao: string; pacienteId: string | null; timestamp: number; detalhe: string }>(
  logs: T[], opcoes: { usuarioId?: string; acao?: string; pacienteId?: string; somenteSensiveis?: boolean; desde?: number; busca?: string },
  nomeUsuario: (id: string | null) => string
): T[] {
  const o = opcoes || {};
  return logs.filter((l) => {
    if (o.usuarioId && l.usuarioId !== o.usuarioId) return false;
    if (o.acao && l.acao !== o.acao) return false;
    if (o.pacienteId && l.pacienteId !== o.pacienteId) return false;
    if (o.somenteSensiveis && !sensivel(l.acao)) return false;
    if (o.desde && l.timestamp < o.desde) return false;
    if (o.busca) {
      const alvo = (nomeUsuario(l.usuarioId) + ' ' + rotuloAcao(l.acao) + ' ' + (l.detalhe || '')).toLowerCase();
      if (alvo.indexOf(String(o.busca).toLowerCase()) < 0) return false;
    }
    return true;
  });
}
