/* Envolve o HTML/SVG gerado por src/lib/charts.ts — a entrada é sempre
   número/texto passado por esc(), nunca conteúdo do usuário, então
   dangerouslySetInnerHTML é seguro aqui (mesmo raciocínio do Icon.tsx). */
export function ChartBox({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
