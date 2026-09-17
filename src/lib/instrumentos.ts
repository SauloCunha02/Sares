/* SARES — Instrumentos de anamnese. Porte de js/data/instrumentos.js.
   Transcrição estruturada das fichas de papel do anexo do documento da SEPLATI.
   Cada ficha é um formulário declarativo: as telas não conhecem os campos,
   apenas percorrem este catálogo.

   A.2 — Anamnese Psicológica            (psicólogo do NAPE)
   A.3 — Anamnese Psicopedagógica        (psicopedagogo do NAPE)
   A.4 — Instrumental da Educadora Física (educadora física do NAPE) */

import type { TipoAnamnese } from './types';

export type TipoCampo = 'texto' | 'numero' | 'area' | 'selecao' | 'multipla';

export interface CampoInstrumento {
  nome: string;
  rotulo: string;
  tipo: TipoCampo;
  opcoes?: string[];
  linhas?: number;
  obrigatorio?: boolean;
  dica?: string;
}

export interface SecaoInstrumento {
  titulo: string;
  campos: CampoInstrumento[];
}

export interface Instrumento {
  id: TipoAnamnese;
  rotulo: string;
  ficha: string;
  icone: string;
  profissoes: string[];
  resumo: string;
  mostrarConcomitantes?: boolean;
  secoes: SecaoInstrumento[];
}

const SIM_NAO = ['Sim', 'Não'];
const FREQ = ['Sempre', 'Às vezes', 'Raramente', 'Nunca'];
const GRAU = ['Adequado para a idade', 'Parcialmente adequado', 'Abaixo do esperado', 'Não observado'];
const ESCOLARIDADE = ['Não alfabetizado', 'Fundamental incompleto', 'Fundamental completo',
  'Médio incompleto', 'Médio completo', 'Superior incompleto', 'Superior completo', 'Não informado'];

const INSTRUMENTOS: Record<TipoAnamnese, Instrumento> = {
  /* ============================================================ A.2 */
  psicologica: {
    id: 'psicologica',
    rotulo: 'Anamnese Psicológica',
    ficha: 'A.2',
    icone: 'prontuario',
    profissoes: ['Psicologia'],
    resumo: 'Entrevista inicial para levantar o histórico do aluno antes do início do atendimento psicológico.',
    secoes: [
      { titulo: 'Dados familiares', campos: [
        { nome: 'numeroIrmaos', rotulo: 'Nº de irmãos e idades', tipo: 'texto' },
        { nome: 'pessoasResidencia', rotulo: 'Pessoas na residência', tipo: 'numero' },
        { nome: 'situacaoConjugalPais', rotulo: 'Situação conjugal dos pais', tipo: 'selecao',
          opcoes: ['Casados', 'União estável', 'Separados', 'Mãe solo', 'Pai solo', 'Outro'] }
      ] },
      { titulo: 'Identificação do problema', campos: [
        { nome: 'queixa', rotulo: 'Queixa — motivação da busca pelo serviço', tipo: 'area', linhas: 3, obrigatorio: true },
        { nome: 'acoesRealizadas', rotulo: 'Ações já realizadas pela instituição de ensino, saúde ou assistência', tipo: 'area', linhas: 2 }
      ] },
      { titulo: 'Histórico da escolaridade', campos: [
        { nome: 'inicioEscolarizacao', rotulo: 'Início da escolarização', tipo: 'texto', dica: 'ex.: aos 4 anos, em 2022' },
        { nome: 'apoioPedagogicoCasa', rotulo: 'Tem apoio pedagógico em casa?', tipo: 'selecao', opcoes: SIM_NAO },
        { nome: 'dificuldadeEducacional', rotulo: 'Dificuldade educacional apresentada', tipo: 'area', linhas: 2 },
        { nome: 'avaliacaoPrevia', rotulo: 'Já foi avaliado por profissional?', tipo: 'selecao', opcoes: SIM_NAO },
        { nome: 'reforcoOuAEE', rotulo: 'Acompanhamento com reforço escolar ou AEE', tipo: 'selecao',
          opcoes: ['Reforço escolar', 'AEE — sala de recursos', 'Ambos', 'Nenhum'] },
        { nome: 'atividadesExtra', rotulo: 'Atividades extraescolares', tipo: 'texto' }
      ] },
      { titulo: 'Aspectos motores', campos: [
        { nome: 'dificuldadeLocomocao', rotulo: 'Dificuldade de locomoção, postura ou coordenação', tipo: 'selecao', opcoes: SIM_NAO },
        { nome: 'idadeAndou', rotulo: 'Idade em que começou a andar', tipo: 'texto', dica: 'em meses' },
        { nome: 'idadeFalou', rotulo: 'Idade em que começou a falar', tipo: 'texto', dica: 'em meses' },
        { nome: 'coordenacaoFina', rotulo: 'Coordenação motora fina', tipo: 'selecao', opcoes: GRAU }
      ] },
      { titulo: 'Aspectos perceptivos', campos: [
        { nome: 'dificuldadeVisual', rotulo: 'Dificuldade visual', tipo: 'selecao', opcoes: SIM_NAO },
        { nome: 'dificuldadeAuditiva', rotulo: 'Dificuldade auditiva', tipo: 'selecao', opcoes: SIM_NAO },
        { nome: 'desatencao', rotulo: 'Desatenção', tipo: 'selecao', opcoes: FREQ },
        { nome: 'agitacao', rotulo: 'Agitação', tipo: 'selecao', opcoes: FREQ }
      ] },
      { titulo: 'Aspectos emocionais', campos: [
        { nome: 'perfilEmocional', rotulo: 'Perfil predominante', tipo: 'multipla',
          opcoes: ['Tranquilo', 'Ansioso', 'Alegre', 'Queixoso', 'Intolerante'] }
      ] },
      { titulo: 'Sociabilidade', campos: [
        { nome: 'fazAmigos', rotulo: 'Facilidade para fazer amigos', tipo: 'selecao', opcoes: FREQ },
        { nome: 'brincaSozinho', rotulo: 'Prefere brincar', tipo: 'selecao', opcoes: ['Sozinho', 'Em grupo', 'Indiferente'] },
        { nome: 'toleranciaFrustracao', rotulo: 'Tolerância à frustração', tipo: 'selecao', opcoes: GRAU },
        { nome: 'adaptacaoAmbientes', rotulo: 'Adaptação a novos ambientes', tipo: 'selecao', opcoes: GRAU },
        { nome: 'usoTelas', rotulo: 'Uso de telas', tipo: 'selecao',
          opcoes: ['Menos de 1h/dia', '1 a 3h/dia', '3 a 6h/dia', 'Mais de 6h/dia'] }
      ] },
      { titulo: 'Atitudes sociais predominantes', campos: [
        { nome: 'atitudesSociais', rotulo: 'Atitudes observadas', tipo: 'multipla',
          opcoes: ['Obediente', 'Independente', 'Comunicativo', 'Agressivo', 'Cooperador'] }
      ] },
      { titulo: 'Sono', campos: [
        { nome: 'sono', rotulo: 'Padrão de sono', tipo: 'selecao', opcoes: ['Normal', 'Insônia', 'Pesadelos', 'Hipersonia'] }
      ] },
      { titulo: 'Saúde', campos: [
        { nome: 'diagnosticoPrevio', rotulo: 'Diagnóstico prévio', tipo: 'texto' },
        { nome: 'apoioEducacionalEspecial', rotulo: 'Necessita apoio educacional especial', tipo: 'selecao', opcoes: SIM_NAO },
        { nome: 'medicacao', rotulo: 'Uso de medicação', tipo: 'texto' }
      ] },
      { titulo: 'Rotina e observações', campos: [
        { nome: 'rotina', rotulo: 'Rotina', tipo: 'area', linhas: 3 },
        { nome: 'observacoes', rotulo: 'Observações', tipo: 'area', linhas: 3 }
      ] },
      { titulo: 'Dados da triagem', campos: [
        { nome: 'queixaPrincipal', rotulo: 'Queixa principal', tipo: 'texto', obrigatorio: true },
        { nome: 'encaminhamentoTriagem', rotulo: 'Encaminhamento', tipo: 'texto' },
        { nome: 'responsavelAssinou', rotulo: 'Responsável ciente e de acordo', tipo: 'selecao', opcoes: SIM_NAO,
          dica: 'Substitui a assinatura do responsável na ficha de papel' }
      ] }
    ]
  },

  /* ============================================================ A.3 */
  psicopedagogica: {
    id: 'psicopedagogica',
    rotulo: 'Anamnese Psicopedagógica',
    ficha: 'A.3',
    icone: 'escola',
    profissoes: ['Psicopedagogia'],
    resumo: 'Levantamento voltado às dificuldades de aprendizagem e ao desenvolvimento escolar.',
    secoes: [
      { titulo: 'Dados familiares', campos: [
        { nome: 'escolaridadeMae', rotulo: 'Escolaridade da mãe', tipo: 'selecao', opcoes: ESCOLARIDADE },
        { nome: 'ocupacaoMae', rotulo: 'Ocupação da mãe', tipo: 'texto' },
        { nome: 'escolaridadePai', rotulo: 'Escolaridade do pai', tipo: 'selecao', opcoes: ESCOLARIDADE },
        { nome: 'ocupacaoPai', rotulo: 'Ocupação do pai', tipo: 'texto' }
      ] },
      { titulo: 'Concepção e gestação', campos: [
        { nome: 'filhoNaturalAdotivo', rotulo: 'Filho natural ou adotivo', tipo: 'selecao', opcoes: ['Natural', 'Adotivo'] },
        { nome: 'gravidezPlanejada', rotulo: 'Gravidez planejada', tipo: 'selecao', opcoes: SIM_NAO },
        { nome: 'gestacoesAbortos', rotulo: 'Nº de gestações / abortos', tipo: 'texto' },
        { nome: 'problemaSaudeGestacao', rotulo: 'Problema de saúde na gestação', tipo: 'texto' },
        { nome: 'tipoParto', rotulo: 'Tipo de parto', tipo: 'selecao',
          opcoes: ['Normal', 'Cesárea', 'Fórceps', 'Não informado'] },
        { nome: 'medicamentoGravidez', rotulo: 'Uso de medicamento na gravidez', tipo: 'texto' }
      ] },
      { titulo: 'Identificação do problema', campos: [
        { nome: 'queixaAtual', rotulo: 'História e queixa atual', tipo: 'area', linhas: 3, obrigatorio: true },
        { nome: 'historicoQuadro', rotulo: 'Histórico do desenvolvimento do quadro', tipo: 'area', linhas: 2 },
        { nome: 'intervencoesEscola', rotulo: 'Medidas de intervenção já feitas pela escola', tipo: 'area', linhas: 2 }
      ] },
      { titulo: 'Histórico escolar', campos: [
        { nome: 'inicioEscolarizacao', rotulo: 'Início da escolarização', tipo: 'texto' },
        { nome: 'adaptacaoEscolar', rotulo: 'Adaptação escolar', tipo: 'selecao', opcoes: GRAU },
        { nome: 'escolasFrequentadas', rotulo: 'Escolas frequentadas', tipo: 'texto' },
        { nome: 'rotinaTarefas', rotulo: 'Rotina de tarefas de casa', tipo: 'texto' },
        { nome: 'maiorDificuldade', rotulo: 'Maior dificuldade apresentada', tipo: 'area', linhas: 2 },
        { nome: 'disciplinasDificuldade', rotulo: 'Disciplinas com dificuldade', tipo: 'texto' },
        { nome: 'repetencia', rotulo: 'Repetência', tipo: 'selecao', opcoes: SIM_NAO },
        { nome: 'necessitaAEE', rotulo: 'Necessita AEE', tipo: 'selecao', opcoes: SIM_NAO },
        { nome: 'reforcoEscolar', rotulo: 'Participa de reforço escolar', tipo: 'selecao', opcoes: SIM_NAO },
        { nome: 'tiposDificuldade', rotulo: 'Tipos de dificuldade', tipo: 'multipla',
          opcoes: ['Leitura', 'Escrita', 'Coordenação motora', 'Contar', 'Calcular', 'Atenção', 'Concentração', 'Memória'] }
      ] },
      { titulo: 'Desenvolvimento da linguagem', campos: [
        { nome: 'idadeFalou', rotulo: 'Idade em que começou a falar', tipo: 'texto' },
        { nome: 'problemasFala', rotulo: 'Problemas de fala', tipo: 'texto' },
        { nome: 'compreendeOrdens', rotulo: 'Compreensão de ordens', tipo: 'selecao',
          opcoes: ['Ordens complexas', 'Ordens simples', 'Somente com apoio visual', 'Não compreende'] },
        { nome: 'formaComunicacao', rotulo: 'Forma de comunicação', tipo: 'selecao',
          opcoes: ['Verbal', 'Verbal com apoio', 'Gestos', 'Comunicação alternativa (CAA)', 'Não comunica'] }
      ] },
      { titulo: 'Aspectos cognitivos, motores e saúde', campos: [
        { nome: 'outrosProfissionais', rotulo: 'Acompanhamento com outros profissionais', tipo: 'texto' },
        { nome: 'medicacao', rotulo: 'Uso de medicação', tipo: 'texto' },
        { nome: 'dificuldadesMotoras', rotulo: 'Dificuldades motoras', tipo: 'texto' },
        { nome: 'coordenacaoFina', rotulo: 'Coordenação motora fina', tipo: 'selecao', opcoes: GRAU },
        { nome: 'dominanciaManual', rotulo: 'Dominância manual', tipo: 'selecao',
          opcoes: ['Destro', 'Canhoto', 'Ambidestro', 'Não definida'] },
        { nome: 'desatencaoAgitacao', rotulo: 'Desatenção / agitação', tipo: 'selecao', opcoes: FREQ }
      ] },
      { titulo: 'Sociabilidade', campos: [
        { nome: 'comportamentoPublico', rotulo: 'Comportamento em público', tipo: 'area', linhas: 2 },
        { nome: 'atividadesForaEscola', rotulo: 'Atividades fora da escola', tipo: 'texto' },
        { nome: 'brincaSozinho', rotulo: 'Prefere brincar', tipo: 'selecao', opcoes: ['Sozinho', 'Acompanhado', 'Indiferente'] },
        { nome: 'amizades', rotulo: 'Amizades', tipo: 'texto' },
        { nome: 'relacaoEscolaFamilia', rotulo: 'Relação na escola e na família', tipo: 'area', linhas: 2 },
        { nome: 'acessoBrinquedosTelas', rotulo: 'Acesso a brinquedos e telas', tipo: 'texto' }
      ] },
      { titulo: 'Observações', campos: [
        { nome: 'observacoes', rotulo: 'Observações', tipo: 'area', linhas: 3 }
      ] },
      { titulo: 'Dados da triagem', campos: [
        { nome: 'necessidadeAcompanhamento', rotulo: 'Necessidade de acompanhamento', tipo: 'selecao',
          opcoes: ['URGENTE', 'CURTO PRAZO', 'LISTA DE ESPERA'], obrigatorio: true,
          dica: 'Mesma classificação usada na fila de atendimento' },
        { nome: 'encaminhamentosInternos', rotulo: 'Encaminhamentos internos', tipo: 'multipla',
          opcoes: ['Psicólogo', 'Nutricionista', 'Fonoaudiólogo', 'Terapeuta ocupacional', 'Assistente social'] },
        { nome: 'responsavelAssinou', rotulo: 'Responsável ciente e de acordo', tipo: 'selecao', opcoes: SIM_NAO }
      ] }
    ]
  },

  /* ============================================================ A.4 */
  educacao_fisica: {
    id: 'educacao_fisica',
    rotulo: 'Instrumental da Educadora Física',
    ficha: 'A.4',
    icone: 'grupo',
    profissoes: ['Educação Física Adaptada'],
    resumo: 'Avaliação motora e física, incluindo o mapeamento dos atendimentos que o aluno já recebe na rede.',
    /* A ficha de papel pede uma tabela de "atendimentos concomitantes" preenchida
       à mão. No SARES ela é montada pela própria rede — ver a tela da anamnese. */
    mostrarConcomitantes: true,
    secoes: [
      { titulo: 'Habilidades motoras grossas', campos: [
        { nome: 'correrEquilibrio', rotulo: 'Corre com equilíbrio', tipo: 'selecao', opcoes: GRAU },
        { nome: 'saltarDoisPes', rotulo: 'Salta com os dois pés', tipo: 'selecao', opcoes: GRAU },
        { nome: 'arremessarChutar', rotulo: 'Arremessa, chuta e recebe bola', tipo: 'selecao', opcoes: GRAU },
        { nome: 'nocaoEspacoTempo', rotulo: 'Noção de espaço e tempo', tipo: 'selecao', opcoes: GRAU }
      ] },
      { titulo: 'Coordenação motora fina', campos: [
        { nome: 'manipulaObjetos', rotulo: 'Manipulação de objetos pequenos', tipo: 'selecao', opcoes: GRAU },
        { nome: 'coordenacaoOlhoMao', rotulo: 'Coordenação olho-mão', tipo: 'selecao', opcoes: GRAU }
      ] },
      { titulo: 'Desenvolvimento cognitivo e atenção', campos: [
        { nome: 'mantemAtencao', rotulo: 'Mantém a atenção na atividade', tipo: 'selecao', opcoes: GRAU },
        { nome: 'compreendeComandos', rotulo: 'Compreende comandos verbais', tipo: 'selecao', opcoes: GRAU },
        { nome: 'executaSequencias', rotulo: 'Executa sequências de movimentos', tipo: 'selecao', opcoes: GRAU }
      ] },
      { titulo: 'Aspectos sociais e emocionais', campos: [
        { nome: 'interacaoColegas', rotulo: 'Interação com colegas', tipo: 'selecao', opcoes: GRAU },
        { nome: 'controleEmocional', rotulo: 'Controle emocional', tipo: 'selecao', opcoes: GRAU },
        { nome: 'aceitaOrientacoes', rotulo: 'Aceita orientações e correções', tipo: 'selecao', opcoes: GRAU }
      ] },
      { titulo: 'Condicionamento físico', campos: [
        { nome: 'resistencia', rotulo: 'Resistência compatível com a idade', tipo: 'selecao', opcoes: GRAU },
        { nome: 'forca', rotulo: 'Força adequada às atividades', tipo: 'selecao', opcoes: GRAU }
      ] },
      { titulo: 'Fechamento', campos: [
        { nome: 'objetivosPropostos', rotulo: 'Objetivos propostos para o atendimento', tipo: 'area', linhas: 3, obrigatorio: true },
        { nome: 'estrategias', rotulo: 'Estratégias, intervenções pedagógicas e recursos de acessibilidade', tipo: 'area', linhas: 3 },
        { nome: 'avaliacaoFinal', rotulo: 'Avaliação final', tipo: 'area', linhas: 2 },
        { nome: 'encaminhamentosFinais', rotulo: 'Encaminhamentos', tipo: 'texto' }
      ] }
    ]
  }
};

const ORDEM: TipoAnamnese[] = ['psicologica', 'psicopedagogica', 'educacao_fisica'];

export const instrumentos = {
  TIPOS: INSTRUMENTOS,
  ORDEM,

  lista(): Instrumento[] {
    return ORDEM.map((id) => INSTRUMENTOS[id]);
  },

  obter(id: TipoAnamnese): Instrumento | null {
    return INSTRUMENTOS[id] || null;
  },

  /* Todos os campos de um instrumento, achatados — usado na validação e no
     preenchimento automático da demonstração. */
  campos(id: TipoAnamnese): CampoInstrumento[] {
    const inst = INSTRUMENTOS[id];
    if (!inst) return [];
    const todos: CampoInstrumento[] = [];
    inst.secoes.forEach((s) => s.campos.forEach((c) => todos.push(c)));
    return todos;
  },

  /* Instrumento sugerido para a especialidade de quem está atendendo */
  paraEspecialidade(especialidade?: string | null): Instrumento | null {
    for (let i = 0; i < ORDEM.length; i++) {
      if (INSTRUMENTOS[ORDEM[i]].profissoes.indexOf(especialidade || '') >= 0) return INSTRUMENTOS[ORDEM[i]];
    }
    return null;
  }
};
