/* SARES — Consultas escopadas da trilha de auditoria.
   `logs` não é carregado globalmente (ver DataContext.tsx) — cada tela que
   precisa busca só o que usa, com um teto explícito, em vez de reler a
   coleção inteira a cada sessão. */
import { useEffect, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from './firebase';
import type { LogEntry } from './types';

function mapSnap(snap: { docs: { id: string; data: () => unknown }[] }): LogEntry[] {
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<LogEntry, 'id'>) }));
}

/* Auditoria: janela de tempo (mesmo seletor "últimos N dias" que já existia
   na tela), com um teto de segurança — mesmo campo no filtro e no orderBy,
   não precisa de índice composto. */
export function useLogsPorPeriodo(desde: number, teto = 1000) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    const q = query(collection(db, 'logs'), where('timestamp', '>=', desde), orderBy('timestamp', 'desc'), limit(teto));
    const unsub = onSnapshot(q, (snap) => {
      setLogs(mapSnap(snap));
      setCarregando(false);
    }, (err) => { console.error('Falha ao ler logs', err); setCarregando(false); });
    return unsub;
  }, [desde, teto]);

  return { logs, carregando };
}

/* Aba de privacidade do prontuário: só os acessos a UM paciente. */
export function useLogsDoPaciente(pacienteId: string | null | undefined, teto = 50) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!pacienteId) { setLogs([]); setCarregando(false); return; }
    setCarregando(true);
    const q = query(collection(db, 'logs'), where('pacienteId', '==', pacienteId), orderBy('timestamp', 'desc'), limit(teto));
    const unsub = onSnapshot(q, (snap) => {
      setLogs(mapSnap(snap));
      setCarregando(false);
    }, (err) => { console.error('Falha ao ler logs do paciente', err); setCarregando(false); });
    return unsub;
  }, [pacienteId, teto]);

  return { logs, carregando };
}
