/* SARES — Utilitários gerais. Porte de js/lib/utils.js (mesmo comportamento,
   tipado). qs/qsa/delegar (DOM direto) não são portados — não fazem sentido
   em React, onde a manipulação de DOM é declarativa via JSX. */

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];
const MESES_ABR = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

let _seq = 0;

export const U = {
  /* ---------- Identificadores ---------- */
  uid(prefixo?: string): string {
    _seq += 1;
    return (prefixo || 'id') + '-' + Date.now().toString(36) + '-' + _seq.toString(36);
  },

  /* ---------- Gerador pseudoaleatório determinístico (mulberry32) ----------
     A seed fixa garante que a demonstração seja sempre idêntica. */
  rng(seed: number): () => number {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },
  pick<T>(rand: () => number, arr: T[]): T { return arr[Math.floor(rand() * arr.length)]; },
  intBetween(rand: () => number, min: number, max: number): number {
    return Math.floor(rand() * (max - min + 1)) + min;
  },

  /* ---------- Datas (ISO yyyy-mm-dd em todo o app) ---------- */
  hojeISO(): string { return U.toISO(new Date()); },

  toISO(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + dd;
  },

  parseISO(iso?: string | null): Date | null {
    if (!iso) return null;
    const p = String(iso).split('-');
    if (p.length < 3) return null;
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  },

  addDias(iso: string, n: number): string {
    const d = U.parseISO(iso);
    if (!d) return iso;
    d.setDate(d.getDate() + n);
    return U.toISO(d);
  },

  fmtData(iso?: string | null): string {
    const d = U.parseISO(iso);
    if (!d) return '—';
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  },

  fmtDataCurta(iso?: string | null): string {
    const d = U.parseISO(iso);
    if (!d) return '—';
    return String(d.getDate()).padStart(2, '0') + ' ' + MESES_ABR[d.getMonth()];
  },

  fmtDataHora(iso?: string | null, hora?: string | null): string {
    return U.fmtData(iso) + (hora ? ' às ' + hora : '');
  },

  fmtTimestamp(ts: number): string {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return '—';
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' +
      d.getFullYear() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  },

  mesAno(iso?: string | null): string {
    const d = U.parseISO(iso);
    if (!d) return '—';
    return MESES[d.getMonth()] + ' de ' + d.getFullYear();
  },

  mesAbr(iso?: string | null): string {
    const d = U.parseISO(iso);
    return d ? MESES_ABR[d.getMonth()] : '—';
  },

  chaveMes(iso: string): string { return String(iso).slice(0, 7); },

  diffDias(isoA: string, isoB?: string): number {
    const a = U.parseISO(isoA), b = U.parseISO(isoB || U.hojeISO());
    if (!a || !b) return 0;
    return Math.round((b.getTime() - a.getTime()) / 86400000);
  },

  idade(isoNasc: string): number {
    const n = U.parseISO(isoNasc);
    if (!n) return 0;
    const h = new Date();
    let anos = h.getFullYear() - n.getFullYear();
    const m = h.getMonth() - n.getMonth();
    if (m < 0 || (m === 0 && h.getDate() < n.getDate())) anos--;
    return anos;
  },

  idadeTexto(isoNasc: string): string {
    const a = U.idade(isoNasc);
    return a + (a === 1 ? ' ano' : ' anos');
  },

  /* ---------- Formatação de documentos ---------- */
  fmtCNS(cns?: string | null): string {
    if (!cns) return '—';
    const s = String(cns).replace(/\D/g, '');
    if (s.length !== 15) return cns;
    return s.slice(0, 3) + ' ' + s.slice(3, 7) + ' ' + s.slice(7, 11) + ' ' + s.slice(11);
  },

  /* Minimização de dados (LGPD): só os extremos ficam visíveis em listagens */
  maskCNS(cns?: string | null): string {
    if (!cns) return '—';
    const s = String(cns).replace(/\D/g, '');
    if (s.length < 8) return '•••';
    return s.slice(0, 3) + ' •••• •••• ' + s.slice(-4);
  },

  fmtCPF(cpf?: string | null): string {
    if (!cpf) return '—';
    const s = String(cpf).replace(/\D/g, '');
    if (s.length !== 11) return cpf;
    return s.slice(0, 3) + '.' + s.slice(3, 6) + '.' + s.slice(6, 9) + '-' + s.slice(9);
  },

  maskCPF(cpf?: string | null): string {
    if (!cpf) return '—';
    const s = String(cpf).replace(/\D/g, '');
    if (s.length !== 11) return cpf;
    return '•••.' + s.slice(3, 6) + '.•••-' + s.slice(9);
  },

  /* ---------- Validação de documentos ----------
     O CNS é a chave mais forte do motor de duplicidade: um dígito trocado
     na redigitação da ficha de papel cria um cadastro novo em silêncio. Por
     isso o número é conferido de fato, não só contado. */

  /* CNS — Portaria 1.560/GM. Definitivo começa em 1 ou 2; provisório em 7, 8 ou 9.
     Em ambos os casos a soma ponderada dos 15 dígitos deve fechar em múltiplo de 11. */
  cnsValido(cns?: string | null): boolean {
    const s = String(cns || '').replace(/\D/g, '');
    if (s.length !== 15) return false;
    if ('12789'.indexOf(s[0]) < 0) return false;
    let soma = 0;
    for (let i = 0; i < 15; i++) soma += Number(s[i]) * (15 - i);
    return soma % 11 === 0;
  },

  /* CPF — dois dígitos verificadores (módulo 11). */
  cpfValido(cpf?: string | null): boolean {
    const s = String(cpf || '').replace(/\D/g, '');
    if (s.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(s)) return false; // 000.000.000-00 e afins
    for (let d = 0; d < 2; d++) {
      let soma = 0;
      const peso = 10 + d;
      for (let i = 0; i < 9 + d; i++) soma += Number(s[i]) * (peso - i);
      let dv = (soma * 10) % 11;
      if (dv === 10) dv = 0;
      if (dv !== Number(s[9 + d])) return false;
    }
    return true;
  },

  /* Gera um CNS provisório válido — usado apenas pela base de demonstração. */
  gerarCNSValido(rand: () => number): string {
    for (let tentativa = 0; tentativa < 200; tentativa++) {
      const d = [8, 9, 8];
      for (let i = 3; i < 14; i++) d.push(Math.floor(rand() * 10));
      let soma = 0;
      for (let j = 0; j < 14; j++) soma += d[j] * (15 - j);
      const ultimo = (11 - (soma % 11)) % 11; // peso do 15º dígito é 1
      if (ultimo === 10) continue; // impossível fechar: sorteia de novo
      return d.join('') + ultimo;
    }
    return '898000000000007';
  },

  /* Gera um CPF válido — usado apenas pela base de demonstração. */
  gerarCPFValido(rand: () => number): string {
    const n: number[] = [];
    for (let i = 0; i < 9; i++) n.push(Math.floor(rand() * 10));
    for (let d = 0; d < 2; d++) {
      let soma = 0;
      const peso = 10 + d;
      for (let k = 0; k < 9 + d; k++) soma += n[k] * (peso - k);
      const dv = (soma * 10) % 11;
      n.push(dv === 10 ? 0 : dv);
    }
    return n.join('');
  },

  fmtTel(t?: string | null): string {
    if (!t) return '—';
    const s = String(t).replace(/\D/g, '');
    if (s.length === 11) return '(' + s.slice(0, 2) + ') ' + s.slice(2, 7) + '-' + s.slice(7);
    if (s.length === 10) return '(' + s.slice(0, 2) + ') ' + s.slice(2, 6) + '-' + s.slice(6);
    return t;
  },

  fmtCEP(c?: string | null): string {
    if (!c) return '—';
    const s = String(c).replace(/\D/g, '');
    return s.length === 8 ? s.slice(0, 5) + '-' + s.slice(5) : c;
  },

  /* ---------- Nomes ---------- */
  iniciais(nome?: string | null): string {
    if (!nome) return '?';
    const p = String(nome).trim().split(/\s+/).filter((x) => x.length > 2);
    if (!p.length) return String(nome).slice(0, 2).toUpperCase();
    if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
    return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  },

  /* Minimização: "Maria Eduarda Alves Lima" -> "Maria E. A. L." */
  nomeParcial(nome?: string | null): string {
    if (!nome) return '—';
    const p = String(nome).trim().split(/\s+/);
    if (p.length === 1) return p[0];
    return p[0] + ' ' + p.slice(1).map((x) => (x.length <= 3 ? x : x[0].toUpperCase() + '.')).join(' ');
  },

  primeiroNome(nome?: string | null): string { return String(nome || '').trim().split(/\s+/)[0] || '—'; },

  /* ---------- Texto ---------- */
  esc(s: unknown): string {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },

  normalizar(s?: string | null): string {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  },

  pluralizar(n: number, sing: string, plur: string): string { return n + ' ' + (n === 1 ? sing : plur); },

  pct(parte: number, total: number, casas?: number): number {
    if (!total) return 0;
    const v = (parte / total) * 100;
    return casas ? Math.round(v * Math.pow(10, casas)) / Math.pow(10, casas) : Math.round(v);
  },

  /* ---------- Exportação CSV/JSON (client-side, Blob) ---------- */
  baixarCSV(nomeArquivo: string, cabecalho: string[], linhas: unknown[][]): void {
    const sep = ';';
    const esc = (v: unknown) => {
      const s = (v === null || v === undefined) ? '' : String(v);
      return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const corpo = [cabecalho.map(esc).join(sep)]
      .concat(linhas.map((l) => l.map(esc).join(sep)))
      .join('\r\n');
    // BOM para o Excel reconhecer os acentos
    const blob = new Blob(['﻿' + corpo], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nomeArquivo;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 500);
  },

  baixarJSON(nomeArquivo: string, objeto: unknown): void {
    const blob = new Blob([JSON.stringify(objeto, null, 2)], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nomeArquivo;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 500);
  },

  /* ---------- Agrupamento ---------- */
  agruparPor<T>(arr: T[], fn: (x: T) => string): Record<string, T[]> {
    const m: Record<string, T[]> = {};
    arr.forEach((x) => {
      const k = fn(x);
      (m[k] = m[k] || []).push(x);
    });
    return m;
  },

  somar<T>(arr: T[], fn?: (x: T) => number): number {
    return arr.reduce((t: number, x) => t + (fn ? fn(x) : (x as unknown as number)), 0);
  },

  ordenarPor<T>(arr: T[], fn: (x: T) => string | number, desc?: boolean): T[] {
    return arr.slice().sort((a, b) => {
      const va = fn(a), vb = fn(b);
      if (va < vb) return desc ? 1 : -1;
      if (va > vb) return desc ? -1 : 1;
      return 0;
    });
  }
};
