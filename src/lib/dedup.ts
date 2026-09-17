/* SARES — Motor de deduplicação. Porte de js/lib/dedup.js.
   Funções puras sobre arrays — quem tinha `SARES.db.pacientes()` embutido
   agora recebe a lista de pacientes por parâmetro (o estado vem do React,
   não de um singleton global). Comportamento idêntico ao original. */

import { U } from './utils';
import type { Paciente } from './types';

/* ===================== Similaridade de cadeias ===================== */

/* Jaro — proporção de caracteres coincidentes dentro de uma janela,
   descontando transposições. */
function jaro(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  const l1 = s1.length, l2 = s2.length;
  if (!l1 || !l2) return 0;

  const janela = Math.max(0, Math.floor(Math.max(l1, l2) / 2) - 1);
  const m1 = new Array(l1).fill(false);
  const m2 = new Array(l2).fill(false);
  let coincidencias = 0;

  for (let i = 0; i < l1; i++) {
    const ini = Math.max(0, i - janela);
    const fim = Math.min(i + janela + 1, l2);
    for (let j = ini; j < fim; j++) {
      if (m2[j] || s1[i] !== s2[j]) continue;
      m1[i] = true; m2[j] = true; coincidencias++;
      break;
    }
  }
  if (!coincidencias) return 0;

  let k = 0, transposicoes = 0;
  for (let x = 0; x < l1; x++) {
    if (!m1[x]) continue;
    while (!m2[k]) k++;
    if (s1[x] !== s2[k]) transposicoes++;
    k++;
  }
  transposicoes = transposicoes / 2;

  return (coincidencias / l1 + coincidencias / l2 + (coincidencias - transposicoes) / coincidencias) / 3;
}

/* Jaro-Winkler — favorece cadeias com prefixo igual, o que é adequado a nomes. */
export function jaroWinkler(a: string, b: string): number {
  const j = jaro(a, b);
  if (j < 0.7) return j;
  let prefixo = 0;
  const max = Math.min(4, a.length, b.length);
  for (let i = 0; i < max; i++) {
    if (a[i] !== b[i]) break;
    prefixo++;
  }
  return j + prefixo * 0.1 * (1 - j);
}

/* Comparação de um par de tokens, tolerante a abreviação.
   "A." vs "Alves" conta como coincidência parcial: a inicial bate, mas há
   menos informação, então não vale 100%. */
function simToken(a: string, b: string): number {
  if (a === b) return 1;
  const abrevA = a.length <= 2;
  const abrevB = b.length <= 2;
  if (abrevA || abrevB) {
    return a[0] === b[0] ? 0.9 : 0;
  }
  return jaroWinkler(a, b);
}

/* Similaridade entre nomes completos: casa token a token nos dois sentidos e
   compara também as cadeias inteiras, ficando com o melhor resultado. */
export function similaridadeNome(n1?: string | null, n2?: string | null): number {
  const a = U.normalizar(n1), b = U.normalizar(n2);
  if (!a || !b) return 0;
  if (a === b) return 1;

  const ta = a.split(' ').filter(Boolean);
  const tb = b.split(' ').filter(Boolean);
  if (!ta.length || !tb.length) return 0;

  function mediaMelhores(origem: string[], destino: string[]): number {
    let soma = 0;
    origem.forEach((t) => {
      let melhor = 0;
      destino.forEach((d) => {
        const s = simToken(t, d);
        if (s > melhor) melhor = s;
      });
      soma += melhor;
    });
    return soma / origem.length;
  }

  const porToken = (mediaMelhores(ta, tb) + mediaMelhores(tb, ta)) / 2;
  const inteiro = jaroWinkler(a.replace(/ /g, ''), b.replace(/ /g, ''));

  return Math.max(porToken, inteiro);
}

function soDigitos(v?: string | null): string { return String(v || '').replace(/\D/g, ''); }
function pctTexto(v: number): string { return Math.round(v * 100) + '%'; }

/* Limiares de decisão */
export const LIMITE_BLOQUEIO = 95; // impede salvar até o operador decidir
export const LIMITE_ALERTA = 80;   // alerta visível, permite prosseguir
export const LIMITE_REGISTRO = 60; // apenas informa; não gera alerta nem bloqueia

export interface Comparacao {
  score: number;
  criterios: string[];
  simNome: number;
  simMae: number;
}

type PacienteParcial = Partial<Paciente>;

/* ===================== Comparação de pacientes ===================== */

/* Recebe dois objetos com formato de paciente (o segundo pode ser parcial,
   vindo do formulário de cadastro ainda em preenchimento). */
export function comparar(a: PacienteParcial, b: PacienteParcial): Comparacao {
  let criterios: string[] = [];
  let score = 0;

  const cnsA = soDigitos(a.cns), cnsB = soDigitos(b.cns);
  const cpfA = soDigitos(a.cpf), cpfB = soDigitos(b.cpf);
  const telA = soDigitos(a.telefone), telB = soDigitos(b.telefone);

  const mesmaData = !!(a.dataNascimento && b.dataNascimento && a.dataNascimento === b.dataNascimento);
  const simNome = similaridadeNome(a.nomeCompleto, b.nomeCompleto);
  const simMae = (a.nomeMae && b.nomeMae) ? similaridadeNome(a.nomeMae, b.nomeMae) : 0;

  function propor(valor: number, criterio: string[]) {
    if (valor > score) {
      score = valor;
      criterios = criterio.slice();
    }
  }

  /* Regras em cascata — vale a maior pontuação. */

  if (cnsA && cnsB && cnsA === cnsB && cnsA.length >= 11) {
    propor(100, ['CNS idêntico'].concat(
      simNome >= 0.8 ? ['Nome ' + pctTexto(simNome) + ' similar'] : [],
      mesmaData ? ['Mesma data de nascimento'] : [],
      simMae >= 0.9 ? ['Mesmo nome da mãe'] : []
    ));
  }

  if (cpfA && cpfB && cpfA === cpfB && cpfA.length === 11) {
    propor(100, ['CPF idêntico'].concat(mesmaData ? ['Mesma data de nascimento'] : []));
  }

  if (simNome === 1 && mesmaData) {
    propor(97, ['Nome idêntico', 'Mesma data de nascimento']);
  }

  if (simNome >= 0.90 && mesmaData && simMae >= 0.90) {
    propor(92, ['Nome ' + pctTexto(simNome) + ' similar', 'Mesma data de nascimento', 'Nome da mãe ' + pctTexto(simMae) + ' similar']);
  }

  if (simNome >= 0.85 && mesmaData) {
    propor(88, ['Nome ' + pctTexto(simNome) + ' similar', 'Mesma data de nascimento']);
  }

  if (simNome >= 0.85 && simMae >= 0.90) {
    propor(85, ['Nome ' + pctTexto(simNome) + ' similar', 'Nome da mãe ' + pctTexto(simMae) + ' similar']);
  }

  if (mesmaData && simMae === 1 && simNome >= 0.70) {
    propor(80, ['Mesma data de nascimento', 'Nome da mãe idêntico', 'Nome ' + pctTexto(simNome) + ' similar']);
  }

  if (telA && telB && telA === telB && telA.length >= 10 && simNome >= 0.80) {
    propor(75, ['Telefone idêntico', 'Nome ' + pctTexto(simNome) + ' similar']);
  }

  /* Sinais complementares — não alteram a faixa, mas ajudam quem decide */
  if (score >= LIMITE_ALERTA) {
    if (a.endereco && b.endereco && a.endereco.bairro && a.endereco.bairro === b.endereco.bairro) {
      criterios.push('Mesmo bairro (' + a.endereco.bairro + ')');
    }
    if (a.escola && b.escola && U.normalizar(a.escola) === U.normalizar(b.escola)) {
      criterios.push('Mesma escola');
    }
  }

  /* Datas de nascimento divergentes desqualificam a duplicata: são homônimos.
     Ainda assim, nome muito parecido merece verificação humana — por isso o
     caso cai para a faixa 62, que apenas registra o alerta sem alarmar. */
  const documentoBate = !!((cnsA && cnsA === cnsB) || (cpfA && cpfA === cpfB));
  if (a.dataNascimento && b.dataNascimento && !mesmaData && !documentoBate) {
    if (simNome >= 0.80) {
      score = 62;
      criterios = ['Nome ' + pctTexto(simNome) + ' similar', 'Datas de nascimento DIFERENTES'];
      if (simMae && simMae < 0.90) criterios.push('Nomes das mães diferentes');
    } else {
      score = Math.min(score, 62);
    }
  }

  return { score: Math.round(score), criterios, simNome, simMae };
}

export function nivel(score: number): 'bloqueio' | 'alerta' | 'registro' | 'ignorar' {
  if (score >= LIMITE_BLOQUEIO) return 'bloqueio';
  if (score >= LIMITE_ALERTA) return 'alerta';
  if (score >= LIMITE_REGISTRO) return 'registro';
  return 'ignorar';
}

export function rotuloNivel(score: number): string {
  const n = nivel(score);
  if (n === 'bloqueio') return 'Duplicata praticamente certa';
  if (n === 'alerta') return 'Provável duplicata';
  if (n === 'registro') return 'Semelhança a verificar';
  return 'Sem semelhança relevante';
}

export interface Similar { paciente: Paciente; score: number; criterios: string[] }

/* Busca candidatos a duplicata para um conjunto de dados (mesmo parcial).
   Usado ao vivo no formulário de cadastro. */
export function buscarSimilares(pacientes: Paciente[], dados: PacienteParcial, excluirId?: string): Similar[] {
  if (!dados) return [];
  const temNome = !!(dados.nomeCompleto && U.normalizar(dados.nomeCompleto).length >= 5);
  const temCNS = soDigitos(dados.cns).length >= 11;
  const temCPF = soDigitos(dados.cpf).length === 11;
  if (!temNome && !temCNS && !temCPF) return [];

  const resultados: Similar[] = [];
  pacientes.forEach((p) => {
    if (p.id === excluirId) return;
    const r = comparar(p, dados);
    if (r.score >= LIMITE_REGISTRO) {
      resultados.push({ paciente: p, score: r.score, criterios: r.criterios });
    }
  });

  return U.ordenarPor(resultados, (r) => r.score, true).slice(0, 3);
}

export interface AchadoDuplicidade { a: Paciente; b: Paciente; score: number; criterios: string[] }

/* Varredura completa da base — usada na tela de duplicidades e ao iniciar o app */
export function varrerBase(pacientes: Paciente[]): AchadoDuplicidade[] {
  const achados: AchadoDuplicidade[] = [];
  for (let i = 0; i < pacientes.length; i++) {
    for (let j = i + 1; j < pacientes.length; j++) {
      const r = comparar(pacientes[i], pacientes[j]);
      if (r.score >= LIMITE_REGISTRO) {
        achados.push({ a: pacientes[i], b: pacientes[j], score: r.score, criterios: r.criterios });
      }
    }
  }
  return U.ordenarPor(achados, (x) => x.score, true);
}

/* Campos comparados lado a lado na tela de duplicidades */
export const CAMPOS_COMPARACAO: { chave: string; rotulo: string; fmt?: (v: unknown) => string }[] = [
  { chave: 'nomeCompleto', rotulo: 'Nome completo' },
  { chave: 'dataNascimento', rotulo: 'Data de nascimento', fmt: (v) => U.fmtData(v as string) },
  { chave: 'cns', rotulo: 'CNS', fmt: (v) => (v ? U.fmtCNS(v as string) : '— não informado —') },
  { chave: 'cpf', rotulo: 'CPF', fmt: (v) => (v ? U.fmtCPF(v as string) : '— não informado —') },
  { chave: 'nomeMae', rotulo: 'Nome da mãe' },
  { chave: 'sexo', rotulo: 'Sexo' },
  { chave: 'telefone', rotulo: 'Telefone', fmt: (v) => U.fmtTel(v as string) },
  { chave: 'enderecoTexto', rotulo: 'Endereço' },
  { chave: 'escola', rotulo: 'Escola' },
  { chave: 'hipoteseDiagnostica', rotulo: 'Hipótese diagnóstica' },
  { chave: 'nivelSuporte', rotulo: 'Nível de suporte' },
  { chave: 'numeroProntuario', rotulo: 'Nº do prontuário' },
  { chave: 'servicoTexto', rotulo: 'Serviços vinculados' },
  { chave: 'dataAbertura', rotulo: 'Cadastro aberto em', fmt: (v) => U.fmtData(v as string) }
];

/* Monta o valor exibido de um campo, inclusive os derivados.
   `servicosDoPaciente`/`siglaServico` vêm por parâmetro — dependem do
   estado de `filas`/`servicos`, que no React vive fora deste módulo. */
export function valorCampo(
  paciente: Paciente,
  chave: string,
  servicosDoPaciente: (pacienteId: string) => string[],
  siglaServico: (servicoId: string) => string
): unknown {
  if (chave === 'enderecoTexto') {
    const e = paciente.endereco || ({} as Paciente['endereco']);
    return [e.logradouro, e.numero].filter(Boolean).join(', ') + (e.bairro ? ' — ' + e.bairro : '');
  }
  if (chave === 'servicoTexto') {
    const ids = servicosDoPaciente(paciente.id);
    return ids.length ? ids.map(siglaServico).join(', ') : '— nenhum —';
  }
  return (paciente as unknown as Record<string, unknown>)[chave];
}
