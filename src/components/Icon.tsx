/* SARES — Ícones SVG inline. Porte de js/lib/icons.js.
   Os paths são markup estático e confiável (não vem de entrada do usuário),
   por isso dangerouslySetInnerHTML aqui é seguro — é só a forma mais direta
   de reaproveitar as ~48 definições sem reescrever cada uma como JSX. */

const PATHS: Record<string, string> = {
  inicio: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
  pacientes: '<circle cx="9" cy="8" r="3.2"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M17 11.5a2.8 2.8 0 1 0 0-5.6"/><path d="M18.5 20a5.6 5.6 0 0 0-2.2-4.4"/>',
  fila: '<rect x="3" y="4" width="18" height="4.2" rx="1.4"/><rect x="3" y="10" width="18" height="4.2" rx="1.4"/><rect x="3" y="16" width="11" height="4.2" rx="1.4"/>',
  duplicidade: '<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 5.5H5.5a2 2 0 0 0-2 2v10"/><path d="m11.5 14 2 2 4-4"/>',
  indicadores: '<path d="M3 20h18"/><rect x="5" y="11" width="3.6" height="7" rx="1"/><rect x="10.2" y="6.5" width="3.6" height="11.5" rx="1"/><rect x="15.4" y="13.5" width="3.6" height="4.5" rx="1"/>',
  auditoria: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6"/><path d="M9 17h4"/>',
  config: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.5 19l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 13.6H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 3V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.3z"/>',
  busca: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m21 21-5.8-5.8"/>',
  sino: '<path d="M18 8.5a6 6 0 1 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14.5 18 8.5"/><path d="M13.7 20a2 2 0 0 1-3.4 0"/>',
  mais: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  seta_dir: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  seta_esq: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  seta_baixo: '<path d="M12 5v14"/><path d="m5 12 7 7 7-7"/>',
  seta_cima: '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>',
  check: '<path d="m4.5 12.5 5 5 10-11"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  alerta: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0"/><path d="M12 9v4.5"/><path d="M12 17.2h.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4.5"/><path d="M12 8h.01"/>',
  cadeado: '<rect x="4" y="10.5" width="16" height="10.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
  cadeado_ok: '<rect x="4" y="10.5" width="16" height="10.5" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/><path d="m9.5 15.7 1.8 1.8 3.4-3.4"/>',
  olho: '<path d="M2.2 12S5.7 5.5 12 5.5 21.8 12 21.8 12 18.3 18.5 12 18.5 2.2 12 2.2 12"/><circle cx="12" cy="12" r="3"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5.2l3.2 1.9"/>',
  calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M8 3v4"/><path d="M16 3v4"/>',
  prontuario: '<path d="M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2"/><path d="M9.5 3h5v3h-5z"/><path d="M9.5 11h5"/><path d="M9.5 15h3"/>',
  encaminhar: '<path d="M4 17v-2a5 5 0 0 1 5-5h10"/><path d="m15 6 4 4-4 4"/>',
  sair: '<path d="M9.5 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.5"/><path d="m16 16 5-4-5-4"/><path d="M21 12H9.5"/>',
  menu: '<path d="M3 6h18"/><path d="M3 12h18"/><path d="M3 18h18"/>',
  pontos: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
  raio: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  baixar: '<path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/>',
  mesclar: '<circle cx="7" cy="7" r="3.5"/><circle cx="7" cy="17" r="3.5"/><path d="M10.5 7h4a4 4 0 0 1 4 4v2"/><path d="M10.5 17h4a4 4 0 0 0 4-4"/>',
  usuario: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
  escudo: '<path d="M12 2.5 4 5.5v6c0 5 3.4 9.1 8 10.5 4.6-1.4 8-5.5 8-10.5v-6z"/><path d="m9 12 2 2 4-4"/>',
  filtro: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  mapa: '<path d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11"/><circle cx="12" cy="10" r="2.6"/>',
  grupo: '<circle cx="8.5" cy="9" r="3"/><path d="M2.5 19a6 6 0 0 1 12 0"/><circle cx="17" cy="7.5" r="2.4"/><path d="M15.5 19a5.5 5.5 0 0 1 6-4.6"/>',
  play: '<path d="M6 4.5 19 12 6 19.5z"/>',
  recarregar: '<path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1"/><path d="M20.5 4v5h-5"/>',
  lixeira: '<path d="M4 7h16"/><path d="M9.5 7V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2"/><path d="M6 7v12.5a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5V7"/>',
  editar: '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  escola: '<path d="M12 3 2 8l10 5 10-5z"/><path d="M6 10.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-5.5"/>',
  casa: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  ligar: '<path d="M21 16.9v2.5a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 3.1 2h2.5a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L6.7 9.8a16 16 0 0 0 6 6l1.1-1.1a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/>'
};

export const ICON_NAMES = Object.keys(PATHS);

export function Icon({ nome, tamanho = 24, className }: { nome: string; tamanho?: number; className?: string }) {
  const d = PATHS[nome] || PATHS.info;
  return (
    <svg
      viewBox="0 0 24 24" width={tamanho} height={tamanho} fill="none" stroke="currentColor"
      strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
      className={className}
      dangerouslySetInnerHTML={{ __html: d }}
    />
  );
}
