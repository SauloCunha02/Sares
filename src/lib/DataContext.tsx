/* SARES — Camada de leitura. Porte das consultas/derivados de
   js/data/store.js, adaptado para Firestore: em vez de um objeto
   `db.state` único em memória (localStorage), cada coleção é mantida
   atualizada por um listener `onSnapshot` — o resto do app lê os mesmos
   arrays que lia antes, só que agora sempre em tempo real entre abas.

   `logs` (auditoria) fica de fora desse grupo de propósito: é a coleção
   que mais cresce (uma linha por atendimento/acesso) e só duas telas
   usam (Auditoria e a aba de privacidade do prontuário) — manter um
   listener global dela releria a coleção inteira em toda sessão, de todo
   mundo, mesmo para quem nunca abre essas telas. Cada uma faz sua
   própria consulta, escopada (por período ou por paciente) — ver
   src/screens/Auditoria.tsx e a AbaLGPD em PacienteDetalhe.tsx. */
import {
  createContext, useContext, useEffect, useMemo, useState, type ReactNode
} from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { U } from './utils';
import type {
  Servico, Usuario, Paciente, FilaItem, Atendimento, Anamnese, Alerta, Indicadores, PontoSerieMensal
} from './types';

function useLiveCollection<T extends { id: string }>(nome: string): { itens: T[]; carregando: boolean } {
  const [itens, setItens] = useState<T[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, nome), (snap) => {
      setItens(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<T, 'id'>) } as T)));
      setCarregando(false);
    }, (err) => {
      console.error('Falha ao ler ' + nome, err);
      setCarregando(false);
    });
    return unsub;
  }, [nome]);

  return { itens, carregando };
}

interface DataState {
  carregando: boolean;

  servicos: Servico[];
  usuarios: Usuario[];
  pacientesTodos: Paciente[]; // inclui statusRegistro === 'mesclado'
  pacientes: Paciente[]; // só ativos — equivalente a db.pacientes()
  filas: FilaItem[];
  atendimentos: Atendimento[];
  anamneses: Anamnese[];
  alertas: Alerta[];

  servico: (id: string | null | undefined) => Servico | null;
  siglaServico: (id: string | null | undefined) => string;
  corServico: (id: string | null | undefined) => string;
  usuario: (id: string | null | undefined) => Usuario | null;
  nomeUsuario: (id: string | null | undefined) => string;
  usuariosDoServico: (servicoId: string) => Usuario[];
  emailEmUso: (email: string, excluirId?: string) => boolean;

  paciente: (id: string | null | undefined) => Paciente | null;
  filaItem: (id: string | null | undefined) => FilaItem | null;
  filasDoServico: (servicoId?: string | null, especialidade?: string | null) => FilaItem[];
  filasDoPaciente: (pacienteId: string) => FilaItem[];
  agendados: (servicoId?: string | null) => FilaItem[];

  atendimento: (id: string | null | undefined) => Atendimento | null;
  atendimentosDoPaciente: (pacienteId: string) => Atendimento[];
  proximaSessao: (pacienteId: string, servicoId: string, especialidade: string) => number;

  anamnese: (id: string | null | undefined) => Anamnese | null;
  anamnesesDoPaciente: (pacienteId: string) => Anamnese[];

  alerta: (id: string | null | undefined) => Alerta | null;
  alertasAbertos: (tipo?: Alerta['tipo']) => Alerta[];
  alertaDoPaciente: (pacienteId: string) => Alerta | null;
  alertaDoServico: (a: Alerta, servicoId: string | null | undefined) => boolean;

  servicosDoPaciente: (pacienteId: string) => string[];
  ultimaVisita: (pacienteId: string) => string | null;
  encaminhamentosAtivos: () => FilaItem[];

  indicadores: (dias?: number, servicoId?: string | null) => Indicadores;
  serieMensal: (meses?: number, servicoId?: string | null) => PontoSerieMensal[];
}

const DataCtx = createContext<DataState | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { itens: servicos, carregando: c1 } = useLiveCollection<Servico>('servicos');
  const { itens: usuarios, carregando: c2 } = useLiveCollection<Usuario>('usuarios');
  const { itens: pacientesTodos, carregando: c3 } = useLiveCollection<Paciente>('pacientes');
  const { itens: filas, carregando: c4 } = useLiveCollection<FilaItem>('filas');
  const { itens: atendimentos, carregando: c5 } = useLiveCollection<Atendimento>('atendimentos');
  const { itens: anamneses, carregando: c6 } = useLiveCollection<Anamnese>('anamneses');
  const { itens: alertas, carregando: c7 } = useLiveCollection<Alerta>('alertas');

  const carregando = c1 || c2 || c3 || c4 || c5 || c6 || c7;

  const valor = useMemo<DataState>(() => {
    const pacientes = pacientesTodos.filter((p) => p.statusRegistro !== 'mesclado');

    const servico = (id: string | null | undefined) => servicos.find((s) => s.id === id) || null;
    const siglaServico = (id: string | null | undefined) => servico(id)?.sigla || '—';
    const corServico = (id: string | null | undefined) => servico(id)?.cor || 'var(--atlas-primary)';
    const usuario = (id: string | null | undefined) => usuarios.find((u) => u.id === id) || null;
    const nomeUsuario = (id: string | null | undefined) => usuario(id)?.nome || '—';
    const usuariosDoServico = (servicoId: string) => usuarios.filter((u) => u.servicoId === servicoId);
    const emailEmUso = (email: string, excluirId?: string) => {
      const alvo = String(email || '').trim().toLowerCase();
      return usuarios.some((u) => u.id !== excluirId && u.email.toLowerCase() === alvo);
    };

    const paciente = (id: string | null | undefined) => pacientesTodos.find((p) => p.id === id) || null;
    const filaItem = (id: string | null | undefined) => filas.find((f) => f.id === id) || null;
    const filasDoServico = (servicoId?: string | null, especialidade?: string | null) => filas.filter((f) => {
      if (f.status !== 'aguardando' && f.status !== 'agendado') return false;
      if (servicoId && f.servicoId !== servicoId) return false;
      if (especialidade && f.especialidade !== especialidade) return false;
      const p = paciente(f.pacienteId);
      return !!p && p.statusRegistro === 'ativo';
    });
    const filasDoPaciente = (pacienteId: string) => filas.filter((f) =>
      f.pacienteId === pacienteId && (f.status === 'aguardando' || f.status === 'agendado'));
    const agendados = (servicoId?: string | null) => {
      const hoje = U.hojeISO();
      return U.ordenarPor(filas.filter((f) =>
        f.status === 'agendado' && f.dataAgendada && f.dataAgendada >= hoje && (!servicoId || f.servicoId === servicoId)
      ), (f) => f.dataAgendada + (f.horarioAgendado || ''));
    };

    const atendimento = (id: string | null | undefined) => atendimentos.find((a) => a.id === id) || null;
    const atendimentosDoPaciente = (pacienteId: string) => U.ordenarPor(
      atendimentos.filter((a) => a.pacienteId === pacienteId), (a) => a.data + (a.horario || ''), true
    );
    const proximaSessao = (pacienteId: string, servicoId: string, especialidade: string) =>
      atendimentos.filter((a) => a.pacienteId === pacienteId && a.servicoId === servicoId && a.especialidade === especialidade).length + 1;

    const anamnese = (id: string | null | undefined) => anamneses.find((a) => a.id === id) || null;
    const anamnesesDoPaciente = (pacienteId: string) => U.ordenarPor(
      anamneses.filter((a) => a.pacienteId === pacienteId), (a) => a.data, true
    );

    const alerta = (id: string | null | undefined) => alertas.find((a) => a.id === id) || null;
    const alertasAbertos = (tipo?: Alerta['tipo']) => alertas.filter((a) => a.status === 'aberto' && (!tipo || a.tipo === tipo));
    const alertaDoPaciente = (pacienteId: string) => alertas.find((a) => a.status === 'aberto' && a.pacienteIds.indexOf(pacienteId) >= 0) || null;

    const servicosDoPaciente = (pacienteId: string) => {
      const ids: Record<string, boolean> = {};
      atendimentos.forEach((a) => { if (a.pacienteId === pacienteId) ids[a.servicoId] = true; });
      filas.forEach((f) => { if (f.pacienteId === pacienteId && (f.status === 'aguardando' || f.status === 'agendado')) ids[f.servicoId] = true; });
      return Object.keys(ids);
    };

    /* Um alerta é "do serviço" quando pelo menos um dos pacientes envolvidos
       tem vínculo (atendimento ou fila) com ele — qualquer especialidade. */
    const alertaDoServico = (a: Alerta, servicoId: string | null | undefined) => {
      if (!servicoId) return true;
      return a.pacienteIds.some((pid) => servicosDoPaciente(pid).indexOf(servicoId) >= 0);
    };

    const ultimaVisita = (pacienteId: string) => {
      const ats = atendimentos.filter((a) => a.pacienteId === pacienteId && a.presenca === 'compareceu');
      if (!ats.length) return null;
      return U.ordenarPor(ats, (a) => a.data, true)[0].data;
    };

    const encaminhamentosAtivos = () => filas.filter((f) =>
      f.origem === 'encaminhamento' && (f.status === 'aguardando' || f.status === 'agendado'));

    const indicadores = (dias = 90, servicoId?: string | null): Indicadores => {
      const limite = U.addDias(U.hojeISO(), -dias);
      const limiteAnterior = U.addDias(U.hojeISO(), -dias * 2);
      const noPeriodo = (a: Atendimento, de: string, ate: string) => a.data >= de && a.data < ate;
      const filtroServico = <T extends { servicoId: string }>(x: T) => !servicoId || x.servicoId === servicoId;

      const ats = atendimentos.filter(filtroServico);
      const atual = ats.filter((a) => noPeriodo(a, limite, U.addDias(U.hojeISO(), 1)));
      const anterior = ats.filter((a) => noPeriodo(a, limiteAnterior, limite));

      const taxaComparecimento = (lista: Atendimento[]) => {
        if (!lista.length) return 0;
        const c = lista.filter((a) => a.presenca === 'compareceu').length;
        return U.pct(c, lista.length);
      };

      const filasAtivas = filas.filter((f) => (f.status === 'aguardando' || f.status === 'agendado') && filtroServico(f));
      const esperaMedia = filasAtivas.length
        ? Math.round(U.somar(filasAtivas, (f) => U.diffDias(f.dataEntrada)) / filasAtivas.length)
        : 0;

      const pacientesAtivos: Record<string, boolean> = {};
      atual.forEach((a) => { pacientesAtivos[a.pacienteId] = true; });
      filasAtivas.forEach((f) => { pacientesAtivos[f.pacienteId] = true; });
      const pacientesAnterior: Record<string, boolean> = {};
      anterior.forEach((a) => { pacientesAnterior[a.pacienteId] = true; });

      const duplicidadesAbertas = alertasAbertos().filter((a) => alertaDoServico(a, servicoId)).length;
      const duplicidadesResolvidas = alertas.filter((a) => a.status === 'mesclado').filter((a) => alertaDoServico(a, servicoId)).length;

      return {
        periodo: dias, servicoId: servicoId || null,
        pacientesAtivos: Object.keys(pacientesAtivos).length,
        pacientesAtivosAnterior: Object.keys(pacientesAnterior).length,
        atendimentos: atual.length, atendimentosAnterior: anterior.length,
        comparecimento: taxaComparecimento(atual), comparecimentoAnterior: taxaComparecimento(anterior),
        faltas: atual.filter((a) => a.presenca === 'faltou').length,
        esperaMedia, naFila: filasAtivas.length,
        urgentes: filasAtivas.filter((f) => f.prioridade === 'URGENTE').length,
        encaminhamentosAtivos: encaminhamentosAtivos().filter(filtroServico).length,
        duplicidadesAbertas, duplicidadesResolvidas,
        atendimentosLista: atual
      };
    };

    const serieMensal = (meses = 6, servicoId?: string | null): PontoSerieMensal[] => {
      const hoje = new Date();
      const chaves: { chave: string; rotulo: string }[] = [];
      const MESES_ABR = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
      for (let i = meses - 1; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        chaves.push({ chave: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'), rotulo: MESES_ABR[d.getMonth()] });
      }
      return chaves.map((c) => {
        const lista = atendimentos.filter((a) => U.chaveMes(a.data) === c.chave && (!servicoId || a.servicoId === servicoId));
        return {
          rotulo: c.rotulo, chave: c.chave, total: lista.length,
          compareceu: lista.filter((a) => a.presenca === 'compareceu').length,
          faltou: lista.filter((a) => a.presenca === 'faltou').length,
          porServico: U.agruparPor(lista, (a) => a.servicoId)
        };
      });
    };

    return {
      carregando,
      servicos, usuarios, pacientesTodos, pacientes, filas, atendimentos, anamneses, alertas,
      servico, siglaServico, corServico, usuario, nomeUsuario, usuariosDoServico, emailEmUso,
      paciente, filaItem, filasDoServico, filasDoPaciente, agendados,
      atendimento, atendimentosDoPaciente, proximaSessao,
      anamnese, anamnesesDoPaciente,
      alerta, alertasAbertos, alertaDoPaciente, alertaDoServico,
      servicosDoPaciente, ultimaVisita, encaminhamentosAtivos,
      indicadores, serieMensal
    };
  }, [servicos, usuarios, pacientesTodos, filas, atendimentos, anamneses, alertas, carregando]);

  return <DataCtx.Provider value={valor}>{children}</DataCtx.Provider>;
}

export function useData(): DataState {
  const ctx = useContext(DataCtx);
  if (!ctx) throw new Error('useData() precisa estar dentro de <DataProvider>');
  return ctx;
}
