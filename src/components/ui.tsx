/* SARES — Componentes de UI reutilizáveis. Porte de js/ui/components.js
   (as fábricas de HTML viram componentes React; mesmas classes CSS). */
import { useEffect, useRef, useState, type ReactNode, type InputHTMLAttributes } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import type { Prioridade, Presenca, Paciente } from '../lib/types';
import { U } from '../lib/utils';

const CLASSE_PRIO: Record<Prioridade, string> = {
  'URGENTE': 'prio-urgente',
  'CURTO PRAZO': 'prio-curto',
  'LISTA DE ESPERA': 'prio-espera'
};

/* ---------- Identidade ---------- */
export function Avatar({ nome, cor, tamanho }: { nome: string; cor?: string | null; tamanho?: 'sm' | 'lg' }) {
  const cls = tamanho === 'sm' ? ' avatar-sm' : (tamanho === 'lg' ? ' avatar-lg' : '');
  const iniciais = nome ? nome.trim().split(/\s+/).filter((x) => x.length > 2) : [];
  const texto = !nome ? '?' : (!iniciais.length ? nome.slice(0, 2).toUpperCase()
    : iniciais.length === 1 ? iniciais[0].slice(0, 2).toUpperCase()
      : (iniciais[0][0] + iniciais[iniciais.length - 1][0]).toUpperCase());
  return (
    <span className={'avatar' + cls} style={{ ['--av' as string]: cor || 'var(--atlas-primary)' }} aria-hidden="true">
      {texto}
    </span>
  );
}

export function ChipServico({ sigla, cor, nome }: { sigla: string; cor: string; nome: string }) {
  return <span className="chip-servico" style={{ ['--sv' as string]: cor }} title={nome}>{sigla}</span>;
}

export function ChipsServicos({ servicos }: { servicos: { id: string; sigla: string; cor: string; nome: string }[] }) {
  if (!servicos.length) return <span className="u-xs u-faint">nenhum vínculo</span>;
  return <>{servicos.map((s) => <ChipServico key={s.id} sigla={s.sigla} cor={s.cor} nome={s.nome} />)}</>;
}

export function BadgePrioridade({ prioridade }: { prioridade: Prioridade }) {
  return <span className={'badge badge-prio ' + (CLASSE_PRIO[prioridade] || '')}>{prioridade}</span>;
}

export function BadgePresenca({ presenca }: { presenca: Presenca | 'cancelado' }) {
  if (presenca === 'compareceu') return <span className="badge badge-ok">✓ Compareceu</span>;
  if (presenca === 'faltou') return <span className="badge badge-bad">✗ Faltou</span>;
  if (presenca === 'justificou') return <span className="badge badge-warn">~ Ausência justificada</span>;
  return <span className="badge badge-muted">Cancelado</span>;
}

/* ---------- Formulário ---------- */
type Largura = 2 | 'all' | undefined;

function larguraClasse(largura: Largura) {
  return largura === 2 ? ' span-2' : (largura === 'all' ? ' span-all' : '');
}

interface CampoProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'size'> {
  id?: string;
  rotulo: string;
  largura?: Largura;
  obrigatorio?: boolean;
  dica?: string;
}

export function Campo({ rotulo, largura, obrigatorio, dica, id, name, ...resto }: CampoProps) {
  const elId = id || name;
  return (
    <div className={'field' + larguraClasse(largura)}>
      <label htmlFor={elId}>{rotulo}{obrigatorio ? <span className="req" aria-hidden="true">*</span> : null}</label>
      <input className="input" id={elId} name={name} required={obrigatorio} aria-required={obrigatorio} {...resto} />
      {dica ? <span className="hint">{dica}</span> : null}
    </div>
  );
}

export interface Opcao { valor: string; rotulo: string }

/* Select "solto" de barra de filtro — sem .field/label, como os seletores
   de toolbar do protótipo original (seletor() em pacientes.js/auditoria.js). */
export function SeletorSimples({ rotuloVazio, opcoes, valor, onChange, ariaLabel, id }: {
  rotuloVazio: string; opcoes: (string | Opcao)[]; valor: string; onChange: (v: string) => void; ariaLabel?: string; id?: string;
}) {
  return (
    <select className="select" id={id} aria-label={ariaLabel || rotuloVazio} value={valor} onChange={(e) => onChange(e.target.value)}>
      <option value="">{rotuloVazio}</option>
      {opcoes.map((op) => {
        const v = typeof op === 'string' ? op : op.valor;
        const r = typeof op === 'string' ? op : op.rotulo;
        return <option value={v} key={v}>{r}</option>;
      })}
    </select>
  );
}

interface SelecaoProps {
  id?: string; name?: string; rotulo: string; largura?: Largura; obrigatorio?: boolean; dica?: string;
  opcoes: (string | Opcao)[]; valor?: string; placeholder?: string; vazio?: boolean; desabilitado?: boolean;
  onChange?: (v: string) => void;
}

export function Selecao({ rotulo, largura, obrigatorio, dica, id, name, opcoes, valor, placeholder, vazio = true, desabilitado, onChange }: SelecaoProps) {
  const elId = id || name;
  return (
    <div className={'field' + larguraClasse(largura)}>
      <label htmlFor={elId}>{rotulo}{obrigatorio ? <span className="req" aria-hidden="true">*</span> : null}</label>
      <select className="select" id={elId} name={name} required={obrigatorio} disabled={desabilitado}
        value={valor ?? ''} onChange={(e) => onChange?.(e.target.value)}>
        {vazio ? <option value="">{placeholder || 'Selecione…'}</option> : null}
        {opcoes.map((op) => {
          const v = typeof op === 'string' ? op : op.valor;
          const r = typeof op === 'string' ? op : op.rotulo;
          return <option value={v} key={v}>{r}</option>;
        })}
      </select>
      {dica ? <span className="hint">{dica}</span> : null}
    </div>
  );
}

interface AreaTextoProps {
  id?: string; name?: string; rotulo: string; largura?: 2 | 'all'; obrigatorio?: boolean; dica?: string;
  linhas?: number; placeholder?: string; valor?: string; onChange?: (v: string) => void;
}

export function AreaTexto({ rotulo, largura = 'all', obrigatorio, dica, id, name, linhas, placeholder, valor, onChange }: AreaTextoProps) {
  const elId = id || name;
  return (
    <div className={'field' + (largura === 2 ? ' span-2' : ' span-all')}>
      <label htmlFor={elId}>{rotulo}{obrigatorio ? <span className="req" aria-hidden="true">*</span> : null}</label>
      <textarea className="textarea" id={elId} name={name} placeholder={placeholder} rows={linhas}
        value={valor || ''} onChange={(e) => onChange?.(e.target.value)} />
      {dica ? <span className="hint">{dica}</span> : null}
    </div>
  );
}

/* ---------- Blocos ---------- */
export function Kpi({ rotulo, valor, unidade, delta, inverterTom, nota }: {
  rotulo: string; valor: string | number; unidade?: string; delta?: number | null; inverterTom?: boolean; nota?: string;
}) {
  let deltaNode: ReactNode = null;
  if (delta !== undefined && delta !== null && isFinite(delta)) {
    let dir = delta > 0 ? 'up' : (delta < 0 ? 'down' : 'flat');
    if (inverterTom && dir !== 'flat') dir = dir === 'up' ? 'down' : 'up';
    const seta = delta > 0 ? '▲' : (delta < 0 ? '▼' : '—');
    deltaNode = <span className={'k-delta ' + dir}>{seta} {Math.abs(delta)}%</span>;
  }
  return (
    <div className="kpi">
      <span className="k-label">{rotulo}</span>
      <span className="k-value">{valor}{unidade ? <span className="k-unit">{unidade}</span> : null}</span>
      <span className="k-foot">
        {deltaNode}
        {!deltaNode && nota ? <span className="u-xs u-faint">{nota}</span> : null}
      </span>
    </div>
  );
}

export function Vazio({ icone = 'info', titulo, texto, acao }: { icone?: string; titulo: string; texto?: string; acao?: ReactNode }) {
  return (
    <div className="empty">
      <div className="e-icon"><Icon nome={icone} tamanho={22} /></div>
      <h3>{titulo}</h3>
      {texto ? <p>{texto}</p> : null}
      {acao ? <div className="u-mt-3">{acao}</div> : null}
    </div>
  );
}

export function Alerta({ tom, titulo, texto, acao }: { tom?: 'ok' | 'bad' | 'warn' | 'info'; titulo: string; texto?: ReactNode; acao?: ReactNode }) {
  const icone = tom === 'bad' ? 'alerta' : (tom === 'warn' ? 'alerta' : (tom === 'ok' ? 'check' : 'info'));
  return (
    <div className={'alert' + (tom && tom !== 'info' ? ' alert-' + tom : '')}>
      <span className="a-icon" aria-hidden="true"><Icon nome={icone} tamanho={16} /></span>
      <div className="u-grow">
        <div className="a-title">{titulo}</div>
        {texto ? <div>{texto}</div> : null}
      </div>
      {acao}
    </div>
  );
}

export function Stepper({ etapas, atual }: { etapas: string[]; atual: number }) {
  return (
    <div className="stepper" role="list">
      {etapas.map((e, i) => {
        const estado = i === atual ? ' is-on' : (i < atual ? ' is-done' : '');
        return (
          <span key={e}>
            {i ? <span className="step-sep" aria-hidden="true" /> : null}
            <span className={'step' + estado} role="listitem" aria-current={i === atual ? 'step' : 'false'}>
              <span className="s-num">{i < atual ? '✓' : i + 1}</span>
              <span className="s-label">{e}</span>
            </span>
          </span>
        );
      })}
    </div>
  );
}

export function Abas({ itens, ativa, aoTrocar }: { itens: { id: string; rotulo: string; contador?: number }[]; ativa: string; aoTrocar: (id: string) => void }) {
  return (
    <div className="tabs" role="tablist">
      {itens.map((i) => (
        <a className={'tab' + (i.id === ativa ? ' is-on' : '')} role="tab" aria-selected={i.id === ativa}
          href={'#'} key={i.id}
          onClick={(e) => { e.preventDefault(); aoTrocar(i.id); }}>
          {i.rotulo}{i.contador !== undefined ? <span className="count">{i.contador}</span> : null}
        </a>
      ))}
    </div>
  );
}

export function ItemDado({ rotulo, valor, vazio }: { rotulo: string; valor?: string | number | null; vazio?: string }) {
  const v = (valor === null || valor === undefined || valor === '') ? null : valor;
  return (
    <div className="data-item">
      <div className="di-k">{rotulo}</div>
      <div className={'di-v' + (v ? '' : ' empty-v')}>{v ?? (vazio || 'não informado')}</div>
    </div>
  );
}

/* ---------- Utilidades de interação ---------- */
export function Dropdown({ itens, rotuloAcessivel }: { itens: ReactNode; rotuloAcessivel?: string }) {
  const [aberto, setAberto] = useState(false);
  const raiz = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(e: MouseEvent) {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    }
    function aoTeclar(e: KeyboardEvent) { if (e.key === 'Escape') setAberto(false); }
    document.addEventListener('click', aoClicarFora);
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('click', aoClicarFora);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [aberto]);

  return (
    <span className="dropdown" ref={raiz}>
      <button className="btn-icon" aria-haspopup="true" aria-expanded={aberto} aria-label={rotuloAcessivel || 'Mais ações'}
        onClick={(e) => { e.stopPropagation(); setAberto((v) => !v); }}>
        <Icon nome="pontos" tamanho={16} />
      </button>
      <div className={'dropdown-menu' + (aberto ? '' : ' u-hidden')} onClick={() => setAberto(false)}>
        {itens}
      </div>
    </span>
  );
}

/* ---------- Paciente ---------- */
export function LinhaPaciente({ paciente, servicos, alerta, ultimaVisita, nomeCompletoSempre }: {
  paciente: Paciente;
  servicos: { id: string; sigla: string; cor: string; nome: string }[];
  alerta: boolean;
  ultimaVisita: string | null;
  nomeCompletoSempre?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <tr className="clickable" onClick={() => navigate('/paciente/' + paciente.id)}>
      <td>
        <div className="u-row u-gap-3">
          <Avatar nome={paciente.nomeCompleto} cor={servicos[0]?.cor} tamanho="sm" />
          <div className="u-grow">
            <div className="u-medium">{nomeCompletoSempre ? paciente.nomeCompleto : U.nomeParcial(paciente.nomeCompleto)}</div>
            <div className="u-xs u-faint">{paciente.endereco.bairro} · {paciente.endereco.zona}</div>
          </div>
        </div>
      </td>
      <td className="num u-nowrap">{U.idade(paciente.dataNascimento)}</td>
      <td className="u-nowrap u-xs u-muted">{U.maskCNS(paciente.cns)}</td>
      <td><ChipsServicos servicos={servicos} /></td>
      <td className="u-nowrap u-sm">{ultimaVisita ? U.fmtData(ultimaVisita) : <span className="u-faint">nunca</span>}</td>
      <td>{alerta ? <span className="badge badge-warn">⚠ Possível duplicidade</span> : <span className="badge badge-ok">Ativo</span>}</td>
    </tr>
  );
}

export function CartaoPaciente({ paciente, servicos, alerta }: {
  paciente: Paciente;
  servicos: { id: string; sigla: string; cor: string; nome: string }[];
  alerta: boolean;
}) {
  const navigate = useNavigate();
  return (
    <button className="pac-card" onClick={() => navigate('/paciente/' + paciente.id)}>
      <Avatar nome={paciente.nomeCompleto} cor={servicos[0]?.cor} />
      <span className="u-grow" style={{ minWidth: 0 }}>
        <span className="u-medium u-truncate" style={{ display: 'block' }}>{U.nomeParcial(paciente.nomeCompleto)}</span>
        <span className="u-xs u-faint">{U.idadeTexto(paciente.dataNascimento)} · {paciente.endereco.bairro}</span>
        <span style={{ display: 'block', marginTop: 6 }}>
          <ChipsServicos servicos={servicos} />{alerta ? <span className="badge badge-warn"> ⚠</span> : null}
        </span>
      </span>
      <Icon nome="seta_dir" tamanho={16} />
    </button>
  );
}
