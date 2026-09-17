/* SARES — Gráficos em SVG escritos à mão. Porte de js/lib/charts.js.
   Continuam gerando HTML/SVG como string (fiel ao original, sem reescrever
   ~450 linhas de geometria em JSX) — renderizados via o componente
   <ChartBox html={...}/> com dangerouslySetInnerHTML, seguro porque a
   entrada é sempre número/texto escapado por esc(), nunca HTML do usuário. */
import { U } from './utils';

interface PontoRotulado { rotulo: string; valor: number; cor?: string }
interface PontoSerie { rotulo: string; chave: string; total: number; compareceu: number; faltou: number }

const C = {
  hue: '#4A6B48',
  hueForte: '#314A2F',
  hueMedio: '#7C9B72',
  hueClaro: '#B4CBAA',
  hueSuave: '#E8EEE6',

  prioridade: { 'URGENTE': '#A8443A', 'CURTO PRAZO': '#D69A24', 'LISTA DE ESPERA': '#2E8B6B' } as Record<string, string>,
  presenca: { compareceu: '#2E8B6B', faltou: '#A8443A', justificou: '#8B9795' },

  grade: '#E3E7E2',
  eixo: '#CBD2CB',
  tinta: '#1D2A2C',
  tintaFraca: '#5F6E6D',
  tintaTenue: '#8B9795',
  superficie: '#FFFFFF'
};

function esc(s: unknown): string { return U.esc(s); }

function barraV(x: number, y: number, w: number, h: number, r0?: number): string {
  if (h <= 0) return '';
  const r = Math.min(r0 || 4, w / 2, h);
  return 'M' + x + ',' + (y + h) +
    'V' + (y + r) +
    'a' + r + ',' + r + ' 0 0 1 ' + r + ',' + -r +
    'h' + (w - 2 * r) +
    'a' + r + ',' + r + ' 0 0 1 ' + r + ',' + r +
    'V' + (y + h) + 'Z';
}

function barraH(x: number, y: number, w: number, h: number, r0?: number): string {
  if (w <= 0) return '';
  const r = Math.min(r0 || 4, h / 2, w);
  return 'M' + x + ',' + y +
    'h' + (w - r) +
    'a' + r + ',' + r + ' 0 0 1 ' + r + ',' + r +
    'v' + (h - 2 * r) +
    'a' + r + ',' + r + ' 0 0 1 ' + -r + ',' + r +
    'H' + x + 'Z';
}

function escalaY(max: number, altura: number, topo: number) {
  const m = max > 0 ? max : 1;
  return (v: number) => topo + altura - (v / m) * altura;
}

function ticks(max: number, n0?: number): number[] {
  const n = n0 || 4;
  if (max <= 0) return [0, 1];

  if (max <= 6 && max === Math.round(max)) {
    const inteiros: number[] = [];
    for (let i = 0; i <= max; i++) inteiros.push(i);
    return inteiros;
  }

  const bruto = max / n;
  const magnitude = Math.pow(10, Math.floor(Math.log10(bruto)));
  let passo = magnitude * 10;
  [1, 2, 2.5, 5, 10].some((m) => {
    if (magnitude * m >= bruto) { passo = magnitude * m; return true; }
    return false;
  });

  const topo = Math.ceil(max / passo) * passo;
  const saida: number[] = [];
  for (let v = 0; v <= topo + passo * 0.001; v += passo) saida.push(Math.round(v * 1000) / 1000);
  return saida;
}

function tip(texto: string): string {
  return ' data-tip="' + esc(texto) + '" tabindex="0" role="img" aria-label="' + esc(texto) + '"';
}

function defsTextura(id: string, cor: string): string {
  return '<defs><pattern id="' + id + '" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
    '<rect width="6" height="6" fill="' + cor + '"/>' +
    '<line x1="0" y1="0" x2="0" y2="6" stroke="' + C.superficie + '" stroke-width="2" opacity=".55"/>' +
    '</pattern></defs>';
}

function legenda(itens: { cor: string; rotulo: string; icone?: string }[]): string {
  return '<div class="chart-legend">' + itens.map((i) =>
    '<span class="cl-item">' +
    (i.icone ? '<span aria-hidden="true">' + i.icone + '</span>' : '') +
    '<span class="dot" style="background:' + i.cor + '"></span>' + esc(i.rotulo) +
    '</span>'
  ).join('') + '</div>';
}

function tabelaAlternativa(titulo: string, cabecalho: string[], linhas: (string | number)[][]): string {
  return '<details class="u-mt-3">' +
    '<summary class="u-xs u-muted" style="cursor:pointer">Ver ' + esc(titulo) + ' em tabela</summary>' +
    '<div class="table-wrap u-mt-2"><table class="table"><thead><tr>' +
    cabecalho.map((c) => '<th>' + esc(c) + '</th>').join('') +
    '</tr></thead><tbody>' +
    linhas.map((l) => '<tr>' + l.map((c, i) => '<td' + (i > 0 ? ' class="num"' : '') + '>' + esc(c) + '</td>').join('') + '</tr>').join('') +
    '</tbody></table></div></details>';
}

/* ===================== 1. Barras empilhadas por mês (presença) ===================== */
export function barrasMensais(serie: PontoSerie[], opcoes?: { titulo?: string }): string {
  const o = opcoes || {};
  const L = 44, R = 12, T = 18, B = 34;
  const W = 640, H = 240;
  const largura = W - L - R, altura = H - T - B;

  const max = Math.max(...serie.map((s) => s.total), 1);
  const tk = ticks(max, 4);
  const topo = tk[tk.length - 1];
  const y = escalaY(topo, altura, T);

  const passo = largura / serie.length;
  const bw = Math.min(38, passo * 0.56);

  const chaveHoje = U.chaveMes(U.hojeISO());
  const temParcial = serie.some((s) => s.chave === chaveHoje);

  let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.titulo || 'Atendimentos por mês') + '">';
  svg += defsTextura('hatch-faltou', C.presenca.faltou);

  tk.forEach((t) => {
    const yy = y(t);
    svg += '<line x1="' + L + '" y1="' + yy + '" x2="' + (W - R) + '" y2="' + yy + '" stroke="' + C.grade + '" stroke-width="1"/>';
    svg += '<text x="' + (L - 8) + '" y="' + (yy + 4) + '" text-anchor="end" font-size="11" fill="' + C.tintaTenue + '">' + t + '</text>';
  });

  serie.forEach((s, i) => {
    const cx = L + passo * i + passo / 2;
    const x = cx - bw / 2;
    const parcial = s.chave === chaveHoje;

    const hFal = (s.faltou / topo) * altura;
    const hCom = (s.compareceu / topo) * altura;
    const base = T + altura;

    const yFal = base - hFal;
    const yCom = yFal - hCom - (hFal > 0 && hCom > 0 ? 2 : 0);

    svg += '<g' + (parcial ? ' opacity=".55"' : '') + '>';
    if (hFal > 0) {
      svg += '<path d="' + barraV(x, yFal, bw, hFal, 0) + '" fill="url(#hatch-faltou)"' +
        tip(s.rotulo + ': ' + s.faltou + ' faltas' + (parcial ? ' (mês em curso, parcial)' : '')) + '/>';
    }
    if (hCom > 0) {
      svg += '<path d="' + barraV(x, yCom, bw, hCom, 4) + '" fill="' + C.presenca.compareceu + '"' +
        (parcial ? ' stroke="' + C.presenca.compareceu + '" stroke-dasharray="3 2" stroke-width="1.5" fill-opacity=".6"' : '') +
        tip(s.rotulo + ': ' + s.compareceu + ' comparecimentos' + (parcial ? ' (mês em curso, parcial)' : '')) + '/>';
    }
    svg += '</g>';

    if (s.total > 0) {
      svg += '<text x="' + cx + '" y="' + (yCom - 7) + '" text-anchor="middle" font-size="11" font-weight="600" fill="' + C.tintaFraca + '">' + s.total + (parcial ? '*' : '') + '</text>';
    }
    svg += '<text x="' + cx + '" y="' + (H - 12) + '" text-anchor="middle" font-size="11" fill="' + C.tintaFraca + '">' + esc(s.rotulo) + (parcial ? '*' : '') + '</text>';
  });

  svg += '<line x1="' + L + '" y1="' + (T + altura) + '" x2="' + (W - R) + '" y2="' + (T + altura) + '" stroke="' + C.eixo + '" stroke-width="1"/>';
  svg += '</svg>';

  return '<div class="chart-box">' + svg +
    legenda([
      { cor: C.presenca.compareceu, rotulo: 'Compareceu', icone: '✓' },
      { cor: C.presenca.faltou, rotulo: 'Faltou (hachurado)', icone: '✗' }
    ]) +
    (temParcial ? '<div class="u-xs u-faint u-mt-2">* mês em curso — contagem parcial, ainda não fechou.</div>' : '') +
    tabelaAlternativa('atendimentos por mês', ['Mês', 'Compareceu', 'Faltou', 'Total'],
      serie.map((s) => [s.rotulo, s.compareceu, s.faltou, s.total])) +
    '</div>';
}

/* ===================== 2. Rosca — filas por prioridade ===================== */
export function rosca(dados: PontoRotulado[], opcoes?: { titulo?: string }): string {
  const o = opcoes || {};
  const W = 260, H = 260, cx = 130, cy = 126, rExt = 96, rInt = 62;
  const total = U.somar(dados, (d) => d.valor);

  let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.titulo || 'Distribuição por prioridade') + '">';

  if (!total) {
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + ((rExt + rInt) / 2) + '" fill="none" stroke="' + C.grade + '" stroke-width="' + (rExt - rInt) + '"/>';
    svg += '<text x="' + cx + '" y="' + (cy + 5) + '" text-anchor="middle" font-size="13" fill="' + C.tintaTenue + '">Sem dados</text>';
    svg += '</svg>';
    return '<div class="chart-box">' + svg + '</div>';
  }

  let angulo = -Math.PI / 2;
  const folga = 0.028;

  dados.forEach((d) => {
    if (!d.valor) return;
    const fatia = (d.valor / total) * Math.PI * 2;
    const a0 = angulo + folga / 2;
    let a1 = angulo + fatia - folga / 2;
    if (a1 <= a0) a1 = a0 + 0.001;

    const grande = (a1 - a0) > Math.PI ? 1 : 0;
    const x0 = cx + rExt * Math.cos(a0), y0 = cy + rExt * Math.sin(a0);
    const x1 = cx + rExt * Math.cos(a1), y1 = cy + rExt * Math.sin(a1);
    const x2 = cx + rInt * Math.cos(a1), y2 = cy + rInt * Math.sin(a1);
    const x3 = cx + rInt * Math.cos(a0), y3 = cy + rInt * Math.sin(a0);

    svg += '<path d="M' + x0 + ',' + y0 + ' A' + rExt + ',' + rExt + ' 0 ' + grande + ' 1 ' + x1 + ',' + y1 +
      ' L' + x2 + ',' + y2 + ' A' + rInt + ',' + rInt + ' 0 ' + grande + ' 0 ' + x3 + ',' + y3 + ' Z" ' +
      'fill="' + (d.cor || C.hue) + '"' + tip(d.rotulo + ': ' + d.valor + ' (' + U.pct(d.valor, total) + '%)') + '/>';

    if (d.valor / total > 0.08) {
      const am = (a0 + a1) / 2;
      const rm = (rExt + rInt) / 2;
      svg += '<text x="' + (cx + rm * Math.cos(am)) + '" y="' + (cy + rm * Math.sin(am) + 4) +
        '" text-anchor="middle" font-size="12" font-weight="700" fill="' + C.superficie + '">' + d.valor + '</text>';
    }
    angulo += fatia;
  });

  svg += '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" font-size="30" font-weight="700" fill="' + C.tinta + '">' + total + '</text>';
  svg += '<text x="' + cx + '" y="' + (cy + 18) + '" text-anchor="middle" font-size="11" fill="' + C.tintaFraca + '">na fila</text>';
  svg += '</svg>';

  return '<div class="chart-box">' + svg +
    legenda(dados.map((d) => ({ cor: d.cor || C.hue, rotulo: d.rotulo + ' (' + d.valor + ')' }))) +
    tabelaAlternativa('prioridades', ['Prioridade', 'Pessoas', '%'],
      dados.map((d) => [d.rotulo, d.valor, U.pct(d.valor, total) + '%'])) +
    '</div>';
}

/* ===================== 3. Linha — taxa de falta ===================== */
export function linha(serie: PontoRotulado[], opcoes?: { sufixo?: string; titulo?: string }): string {
  const o = opcoes || {};
  const L = 40, R = 16, T = 20, B = 32;
  const W = 640, H = 220;
  const largura = W - L - R, altura = H - T - B;

  const valores = serie.map((s) => s.valor);
  const max = Math.max(...valores, 10);
  const tk = ticks(max, 4);
  const topo = tk[tk.length - 1];
  const y = escalaY(topo, altura, T);
  const passo = serie.length > 1 ? largura / (serie.length - 1) : 0;
  const px = (i: number) => L + passo * i;

  let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.titulo || 'Evolução') + '">';

  tk.forEach((t) => {
    const yy = y(t);
    svg += '<line x1="' + L + '" y1="' + yy + '" x2="' + (W - R) + '" y2="' + yy + '" stroke="' + C.grade + '" stroke-width="1"/>';
    svg += '<text x="' + (L - 8) + '" y="' + (yy + 4) + '" text-anchor="end" font-size="11" fill="' + C.tintaTenue + '">' + t + (o.sufixo || '') + '</text>';
  });

  const d = serie.map((s, i) => (i ? 'L' : 'M') + px(i) + ',' + y(s.valor)).join(' ');
  svg += '<path d="' + d + ' L' + px(serie.length - 1) + ',' + (T + altura) + ' L' + L + ',' + (T + altura) + ' Z" fill="' + C.hue + '" opacity=".08"/>';
  svg += '<path d="' + d + '" fill="none" stroke="' + C.hue + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';

  serie.forEach((s, i) => {
    svg += '<circle cx="' + px(i) + '" cy="' + y(s.valor) + '" r="4.5" fill="' + C.superficie + '" stroke="' + C.hue + '" stroke-width="2"/>';
    svg += '<circle cx="' + px(i) + '" cy="' + y(s.valor) + '" r="14" fill="transparent"' +
      tip(s.rotulo + ': ' + s.valor + (o.sufixo || '')) + '/>';
    svg += '<text x="' + px(i) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="11" fill="' + C.tintaFraca + '">' + esc(s.rotulo) + '</text>';
  });

  const ultimo = serie[serie.length - 1];
  if (ultimo) {
    svg += '<text x="' + (px(serie.length - 1) - 6) + '" y="' + (y(ultimo.valor) - 12) + '" text-anchor="end" font-size="12" font-weight="700" fill="' + C.tinta + '">' + ultimo.valor + (o.sufixo || '') + '</text>';
  }

  svg += '<line x1="' + L + '" y1="' + (T + altura) + '" x2="' + (W - R) + '" y2="' + (T + altura) + '" stroke="' + C.eixo + '" stroke-width="1"/>';
  svg += '</svg>';

  return '<div class="chart-box">' + svg + '</div>';
}

/* ===================== 4. Barras horizontais — hue única ===================== */
export function barrasHorizontais(dados: PontoRotulado[], opcoes?: { larguraRotulo?: number; titulo?: string; sufixo?: string }): string {
  const o = opcoes || {};
  const rotuloL = o.larguraRotulo || 150;
  const alturaBarra = 22, espaco = 12;
  const W = 640;
  const H = dados.length * (alturaBarra + espaco) + 10;
  const largura = W - rotuloL - 56;

  const max = Math.max(...dados.map((d) => d.valor), 1);

  let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.titulo || 'Distribuição') + '">';

  dados.forEach((d, i) => {
    const yy = i * (alturaBarra + espaco) + 4;
    const w = Math.max(3, (d.valor / max) * largura);

    svg += '<text x="' + (rotuloL - 10) + '" y="' + (yy + alturaBarra / 2 + 4) + '" text-anchor="end" font-size="12" fill="' + C.tintaFraca + '">' + esc(d.rotulo) + '</text>';
    svg += '<rect x="' + rotuloL + '" y="' + yy + '" width="' + largura + '" height="' + alturaBarra + '" rx="4" fill="' + C.hueSuave + '"/>';
    svg += '<path d="' + barraH(rotuloL, yy, w, alturaBarra, 4) + '" fill="' + (d.cor || C.hue) + '"' +
      tip(d.rotulo + ': ' + d.valor + (o.sufixo || '')) + '/>';
    svg += '<text x="' + (rotuloL + w + 8) + '" y="' + (yy + alturaBarra / 2 + 4) + '" font-size="12" font-weight="600" fill="' + C.tinta + '">' + d.valor + (o.sufixo || '') + '</text>';
  });

  svg += '</svg>';
  return '<div class="chart-box">' + svg + '</div>';
}

/* ===================== 5. Funil — encaminhamentos ===================== */
export function funil(etapas: PontoRotulado[]): string {
  const W = 640, alturaEtapa = 54, espaco = 10;
  const H = etapas.length * (alturaEtapa + espaco);
  const max = Math.max(...etapas.map((e) => e.valor), 1);
  const tons = [C.hueMedio, C.hue, C.hueForte];

  let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Funil de encaminhamentos">';

  etapas.forEach((e, i) => {
    const yy = i * (alturaEtapa + espaco);
    const w = Math.max(90, (e.valor / max) * (W - 150));
    const x = 0;

    svg += '<path d="' + barraH(x, yy, w, alturaEtapa, 6) + '" fill="' + tons[Math.min(i, tons.length - 1)] + '"' +
      tip(e.rotulo + ': ' + e.valor) + '/>';
    svg += '<text x="' + (x + 14) + '" y="' + (yy + 23) + '" font-size="13" font-weight="700" fill="' + C.superficie + '">' + e.valor + '</text>';
    svg += '<text x="' + (x + 14) + '" y="' + (yy + 40) + '" font-size="11" fill="' + C.superficie + '" opacity=".88">' + esc(e.rotulo) + '</text>';

    if (i > 0) {
      const anterior = etapas[i - 1].valor;
      const taxa = anterior ? U.pct(e.valor, anterior) : 0;
      svg += '<text x="' + (w + 14) + '" y="' + (yy + 32) + '" font-size="12" fill="' + C.tintaFraca + '">' + taxa + '% da etapa anterior</text>';
    }
  });

  svg += '</svg>';
  return '<div class="chart-box">' + svg + '</div>';
}

/* ===================== 6. Sparkline ===================== */
export function sparkline(valores: number[], cor?: string): string {
  if (!valores || valores.length < 2) return '';
  const W = 96, H = 26, pad = 3;
  const max = Math.max(...valores);
  const min = Math.min(...valores);
  const amplitude = (max - min) || 1;
  const passo = (W - pad * 2) / (valores.length - 1);

  const pts = valores.map((v, i) => (pad + i * passo) + ',' + (H - pad - ((v - min) / amplitude) * (H - pad * 2)));

  const c = cor || C.hue;
  let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" aria-hidden="true" focusable="false">';
  svg += '<polyline points="' + pts.join(' ') + '" fill="none" stroke="' + c + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>';
  const ultimo = pts[pts.length - 1].split(',');
  svg += '<circle cx="' + ultimo[0] + '" cy="' + ultimo[1] + '" r="2.8" fill="' + c + '"/>';
  svg += '</svg>';
  return svg;
}

export const cores = C;

/* ===================== Camada de dica (hover), montada uma única vez ===================== */
export function montarTooltipGlobal() {
  if (document.getElementById('chart-tip')) return;
  const el = document.createElement('div');
  el.id = 'chart-tip';
  el.setAttribute('role', 'tooltip');
  el.style.cssText = 'position:fixed;z-index:400;pointer-events:none;opacity:0;transition:opacity 120ms;' +
    'background:#1D2A2C;color:#fff;font-size:12px;font-weight:500;padding:6px 10px;' +
    'border-radius:6px;box-shadow:0 4px 14px rgba(29,42,44,.28);white-space:nowrap;max-width:280px;';
  document.body.appendChild(el);

  function posicionar(e: MouseEvent | FocusEvent, alvo: Element) {
    let x: number, yTopo: number;
    const me = e as MouseEvent;
    if (me.clientX !== undefined && me.clientX !== 0) {
      x = me.clientX; yTopo = me.clientY;
    } else {
      const r = alvo.getBoundingClientRect();
      x = r.left + r.width / 2; yTopo = r.top;
    }
    const largura = el.offsetWidth;
    el.style.left = Math.max(8, Math.min(window.innerWidth - largura - 8, x - largura / 2)) + 'px';
    el.style.top = Math.max(8, yTopo - el.offsetHeight - 10) + 'px';
  }
  function mostrar(e: MouseEvent | FocusEvent) {
    const alvo = (e.target as Element)?.closest?.('[data-tip]');
    if (!alvo) return;
    el.textContent = alvo.getAttribute('data-tip');
    el.style.opacity = '1';
    posicionar(e, alvo);
  }
  function esconder() { el.style.opacity = '0'; }

  document.addEventListener('mouseover', mostrar, true);
  document.addEventListener('mousemove', (e) => {
    if (el.style.opacity === '1') {
      const alvo = (e.target as Element)?.closest?.('[data-tip]');
      if (alvo) posicionar(e, alvo); else esconder();
    }
  }, true);
  document.addEventListener('mouseout', (e) => {
    if ((e.target as Element)?.closest?.('[data-tip]')) esconder();
  }, true);
  document.addEventListener('focusin', mostrar, true);
  document.addEventListener('focusout', esconder, true);
  window.addEventListener('scroll', esconder, true);
}
