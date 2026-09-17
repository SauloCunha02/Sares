/* Cabeçalho persistente (topbar) com busca global — o original mantinha
   #app-topbar fora do nó que trocava a cada navegação; aqui cada tela
   define seu título via useTopbar() num useEffect, e o <Topbar/> do Shell
   fica montado o tempo todo. */
import { createContext, useContext, useEffect, type ReactNode } from 'react';

interface TopbarState {
  titulo: string;
  subtitulo?: string;
  acoes?: ReactNode;
}

interface TopbarCtxValue {
  estado: TopbarState;
  set: (s: TopbarState) => void;
}

const TopbarCtx = createContext<TopbarCtxValue | null>(null);

export function TopbarProvider({ children, value }: { children: ReactNode; value: TopbarCtxValue }) {
  return <TopbarCtx.Provider value={value}>{children}</TopbarCtx.Provider>;
}

export function useTopbarState() {
  const ctx = useContext(TopbarCtx);
  if (!ctx) throw new Error('useTopbarState() precisa estar dentro do Shell');
  return ctx;
}

/* Chamado por cada tela: define título/subtítulo/ações no cabeçalho persistente. */
export function useTopbar(titulo: string, subtitulo?: string, acoes?: ReactNode) {
  const { set } = useTopbarState();
  useEffect(() => {
    set({ titulo, subtitulo, acoes });
  }, [titulo, subtitulo, acoes, set]);
}
