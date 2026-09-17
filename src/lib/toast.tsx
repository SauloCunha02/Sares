/* SARES — Avisos temporários. Porte de js/ui/toast.js.
   Singleton simples (array + listeners) em vez de Context: o original é
   chamado de qualquer lugar (inclusive de dentro de funções de mutação,
   longe de qualquer componente), então uma função importável comum
   (`toast/ok/erro/aviso/info`) é mais fiel ao uso original que um hook. */
import { useEffect, useState } from 'react';
import { Icon } from '../components/Icon';

export type Tom = 'ok' | 'bad' | 'warn' | 'info';

export interface ToastItem {
  id: number;
  titulo: string;
  mensagem?: string;
  tom: Tom;
  itens?: string[];
}

let _seq = 0;
let _itens: ToastItem[] = [];
const _ouvintes = new Set<(itens: ToastItem[]) => void>();

function _notificar() {
  _ouvintes.forEach((fn) => fn(_itens));
}

const LIMITE = 4;

export function toast(titulo: string, mensagem?: string, tom: Tom = 'info', itens?: string[], duracao?: number): number {
  _seq += 1;
  const id = _seq;
  _itens = [..._itens, { id, titulo, mensagem, tom, itens }];
  if (_itens.length > LIMITE) _itens = _itens.slice(_itens.length - LIMITE);
  _notificar();

  const ms = duracao || (itens && itens.length ? 8000 : 4500);
  setTimeout(() => fechar(id), ms);
  return id;
}

export function fechar(id: number) {
  _itens = _itens.filter((t) => t.id !== id);
  _notificar();
}

export const ok = (t: string, m?: string, itens?: string[]) => toast(t, m, 'ok', itens);
export const erro = (t: string, m?: string) => toast(t, m, 'bad');
export const aviso = (t: string, m?: string) => toast(t, m, 'warn');
export const info = (t: string, m?: string) => toast(t, m, 'info');

const ICONES: Record<Tom, string> = { ok: 'check', bad: 'x', warn: 'alerta', info: 'info' };

export function ToastStack() {
  const [itens, setItens] = useState<ToastItem[]>(_itens);

  useEffect(() => {
    const fn = (novo: ToastItem[]) => setItens(novo);
    _ouvintes.add(fn);
    return () => { _ouvintes.delete(fn); };
  }, []);

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {itens.map((t) => (
        <div className={'toast ' + t.tom} key={t.id}>
          <span className="t-icon" aria-hidden="true"><Icon nome={ICONES[t.tom]} tamanho={14} /></span>
          <div className="u-grow">
            <div className="t-title">{t.titulo}</div>
            {(t.mensagem || (t.itens && t.itens.length)) ? (
              <div className="t-msg">
                {t.mensagem || ''}
                {t.itens && t.itens.length ? (
                  <ul>{t.itens.map((i, idx) => <li key={idx}>{i}</li>)}</ul>
                ) : null}
              </div>
            ) : null}
          </div>
          <button className="btn-icon" aria-label="Fechar aviso" style={{ flex: 'none', width: 24, height: 24 }}
            onClick={() => fechar(t.id)}>
            <Icon nome="x" tamanho={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
