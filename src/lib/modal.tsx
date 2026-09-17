/* SARES — Janelas modais. Porte de js/ui/modal.js.
   Mesmo padrão singleton do toast.tsx — `abrirModal`/`fecharModal` são
   chamados de fora de componentes (ex.: de dentro de uma mutação), então um
   Context normal não serviria tão bem quanto um estado módulo + listeners. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { AreaTexto } from '../components/ui';
import { aviso } from './toast';

export interface ModalOptions {
  titulo: string;
  subtitulo?: ReactNode;
  tamanho?: 'sm' | 'lg';
  corpo: ReactNode | ((fechar: () => void) => ReactNode);
  rodape?: ReactNode | ((fechar: () => void) => ReactNode);
  aoFechar?: () => void;
}

interface EstadoModal { opcoes: ModalOptions; chave: number }

let _estado: EstadoModal | null = null;
let _seq = 0;
const _ouvintes = new Set<(e: EstadoModal | null) => void>();

function _notificar() { _ouvintes.forEach((fn) => fn(_estado)); }

export function abrirModal(opcoes: ModalOptions) {
  _seq += 1;
  _estado = { opcoes, chave: _seq };
  _notificar();
}

export function fecharModal() {
  if (!_estado) return;
  const aoFechar = _estado.opcoes.aoFechar;
  _estado = null;
  _notificar();
  aoFechar?.();
}

export interface ConfirmarOptions {
  titulo?: string;
  subtitulo?: string;
  mensagem?: string;
  rotuloConfirmar?: string;
  perigo?: boolean;
  exigeJustificativa?: boolean;
  placeholderJustificativa?: string;
}

/* Confirmação — usada antes de qualquer ação destrutiva */
export function confirmar(opcoes: ConfirmarOptions, aoConfirmar: (justificativa: string | null) => void) {
  abrirModal({
    titulo: opcoes.titulo || 'Confirmar ação',
    subtitulo: opcoes.subtitulo,
    corpo: (fechar) => <CorpoConfirmar opcoes={opcoes} fechar={fechar} aoConfirmar={aoConfirmar} />,
    rodape: (fechar) => (
      <ConfirmarRodape opcoes={opcoes} fechar={fechar} aoConfirmar={aoConfirmar} />
    )
  });
}

function CorpoConfirmar({ opcoes }: { opcoes: ConfirmarOptions; fechar: () => void; aoConfirmar: (j: string | null) => void }) {
  return (
    <>
      <p className="u-sm">{opcoes.mensagem || 'Deseja prosseguir?'}</p>
      {opcoes.exigeJustificativa ? (
        <div className="field u-mt-4">
          <label htmlFor="mdl-just">Justificativa <span className="req">*</span></label>
          <AreaTexto rotulo="" id="mdl-just" name="mdl-just" placeholder={opcoes.placeholderJustificativa || 'Descreva o motivo desta ação'} />
          <span className="hint">Esta justificativa fica registrada na trilha de auditoria.</span>
        </div>
      ) : null}
    </>
  );
}

function ConfirmarRodape({ opcoes, fechar, aoConfirmar }: { opcoes: ConfirmarOptions; fechar: () => void; aoConfirmar: (j: string | null) => void }) {
  function confirmarClick() {
    const just = document.getElementById('mdl-just') as HTMLTextAreaElement | null;
    if (opcoes.exigeJustificativa && (!just || just.value.trim().length < 5)) {
      just?.classList.add('is-error');
      just?.focus();
      aviso('Justificativa obrigatória', 'Descreva o motivo com pelo menos 5 caracteres.');
      return;
    }
    const valor = just ? just.value.trim() : null;
    fechar();
    aoConfirmar(valor);
  }
  return (
    <>
      <button className="btn btn-secondary" onClick={fechar}>Cancelar</button>
      <button className={'btn ' + (opcoes.perigo ? 'btn-danger' : 'btn-primary')} onClick={confirmarClick}>
        {opcoes.rotuloConfirmar || 'Confirmar'}
      </button>
    </>
  );
}

function focaveis(raiz: HTMLElement) {
  return Array.from(raiz.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
    .filter((el) => !(el as HTMLButtonElement).disabled && el.offsetParent !== null);
}

export function ModalRoot() {
  const [estado, setEstado] = useState<EstadoModal | null>(_estado);
  const origemRef = useRef<HTMLElement | null>(null);
  const fundoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: EstadoModal | null) => setEstado(e);
    _ouvintes.add(fn);
    return () => { _ouvintes.delete(fn); };
  }, []);

  useEffect(() => {
    if (!estado) return;
    origemRef.current = document.activeElement as HTMLElement;
    document.body.style.overflow = 'hidden';

    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); fecharModal(); }
      if (e.key === 'Tab' && fundoRef.current) {
        const f = focaveis(fundoRef.current);
        if (!f.length) return;
        const primeiro = f[0], ultimo = f[f.length - 1];
        if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
      }
    };
    document.addEventListener('keydown', aoTeclar);

    const t = setTimeout(() => {
      const primeiro = fundoRef.current?.querySelector<HTMLElement>('.modal-body input, .modal-body select, .modal-body textarea, .modal-foot .btn-primary');
      primeiro?.focus();
    }, 0);

    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = '';
      clearTimeout(t);
      try { origemRef.current?.focus(); } catch { /* elemento pode ter sumido */ }
    };
  }, [estado]);

  if (!estado) return null;
  const { opcoes } = estado;

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) fecharModal(); }}>
      <div className={'modal ' + (opcoes.tamanho ? 'modal-' + opcoes.tamanho : '')} role="dialog" aria-modal="true"
        aria-label={opcoes.titulo || 'Janela'} ref={fundoRef}>
        <div className="modal-head">
          <div>
            <h2>{opcoes.titulo}</h2>
            {opcoes.subtitulo ? <p>{opcoes.subtitulo}</p> : null}
          </div>
          <button className="btn-icon" aria-label="Fechar" onClick={fecharModal}>
            <Icon nome="x" tamanho={18} />
          </button>
        </div>
        <div className="modal-body">{typeof opcoes.corpo === 'function' ? opcoes.corpo(fecharModal) : opcoes.corpo}</div>
        {opcoes.rodape ? <div className="modal-foot">{typeof opcoes.rodape === 'function' ? opcoes.rodape(fecharModal) : opcoes.rodape}</div> : null}
      </div>
    </div>
  );
}
