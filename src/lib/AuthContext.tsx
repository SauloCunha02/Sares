/* SARES — Sessão. Porte do essencial de js/lib/auth.js, adaptado para
   Firebase Auth: a sessão em si (quem está logado) vem do Firebase; este
   contexto só resolve QUAL documento em `usuarios` corresponde à conta
   autenticada (via o campo `authUid`, ver scripts/seed.ts) e replica a
   expiração por inatividade (LGPD) que o protótipo já tinha. */
import {
  createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode
} from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut
} from 'firebase/auth';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';
import { LIMITE_INATIVIDADE } from './permissions';
import { SENHA_DEMO } from './seed';
import type { Usuario } from './types';

async function buscarUsuarioPorAuthUid(authUid: string): Promise<Usuario | null> {
  const q = query(collection(db, 'usuarios'), where('authUid', '==', authUid), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<Usuario, 'id'>) };
}

interface AuthState {
  usuario: Usuario | null;
  carregando: boolean;
  entrarPorCredenciais: (email: string, senha: string) => Promise<Usuario | null>;
  entrarComo: (alvo: Usuario) => Promise<void>;
  sair: () => Promise<void>;
  tocar: () => void;
  ociosoHa: () => number;
  restanteSessao: () => number;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const ultimaAtividade = useRef(Date.now());

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUsuario(null);
        setCarregando(false);
        return;
      }
      const u = await buscarUsuarioPorAuthUid(firebaseUser.uid);
      setUsuario(u);
      ultimaAtividade.current = Date.now();
      setCarregando(false);
    });
    return unsub;
  }, []);

  const entrarPorCredenciais = useCallback(async (email: string, senha: string) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), senha);
    const u = await buscarUsuarioPorAuthUid(cred.user.uid);
    setUsuario(u);
    return u;
  }, []);

  /* Troca instantânea de perfil, sem digitar senha — ferramenta de
     administração restrita à gestão (única com ver_configuracoes),
     igual à guarda que já existe na tela que a usa. Verificada de novo
     aqui como defesa em profundidade. */
  const entrarComo = useCallback(async (alvo: Usuario) => {
    if (usuario?.perfil !== 'gestor') return;
    await firebaseSignOut(auth);
    await signInWithEmailAndPassword(auth, alvo.email, SENHA_DEMO);
    setUsuario(alvo);
  }, [usuario]);

  const sair = useCallback(async () => {
    await firebaseSignOut(auth);
    setUsuario(null);
  }, []);

  const tocar = useCallback(() => { ultimaAtividade.current = Date.now(); }, []);
  const ociosoHa = useCallback(() => Date.now() - ultimaAtividade.current, []);
  const restanteSessao = useCallback(() => Math.max(0, LIMITE_INATIVIDADE - ociosoHa()), [ociosoHa]);

  return (
    <AuthCtx.Provider value={{ usuario, carregando, entrarPorCredenciais, entrarComo, sair, tocar, ociosoHa, restanteSessao }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth() precisa estar dentro de <AuthProvider>');
  return ctx;
}
