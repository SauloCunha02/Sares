/* SARES — Dados de demonstração. Porte quase literal de js/data/seed.js
   (mesma seed determinística 20260916 — a base gerada é idêntica à do
   protótipo vanilla). Todos os dados são FICTÍCIOS.

   Diferença estrutural: `gerar()` aqui não inclui `sessao` (não existe
   estado de sessão fora do Firebase Auth) nem `versao`/`criadoEm`
   (não há um blob único de localStorage — cada coleção vira uma coleção
   do Firestore, escrita pelo script scripts/seed.ts). */

import { U } from './utils';
import { instrumentos } from './instrumentos';
import type {
  Servico, Usuario, Paciente, FilaItem, Atendimento, Anamnese, Alerta, LogEntry,
  Prioridade, OrigemFila, TipoAnamnese
} from './types';

export const SERVICOS: Servico[] = [
  {
    id: 'sv-nasf', sigla: 'NASF', nome: 'Núcleo Ampliado de Saúde da Família',
    cor: '#397D87', secretaria: 'Secretaria Municipal de Saúde',
    endereco: 'Rua Firmino Rocha Aguiar, 550 — Centro',
    especialidades: ['Psicologia', 'Fonoaudiologia', 'Terapia Ocupacional', 'Fisioterapia', 'Nutrição', 'Serviço Social']
  },
  {
    id: 'sv-nape', sigla: 'NAPE', nome: 'Núcleo de Atendimento Pedagógico Especializado',
    cor: '#7FA89A', secretaria: 'Secretaria Municipal de Educação',
    endereco: 'Av. Dom Francisco, 1240 — Centro',
    especialidades: ['Psicologia', 'Psicopedagogia', 'Terapia Ocupacional', 'Fonoaudiologia', 'Educação Física Adaptada']
  },
  {
    id: 'sv-creaes', sigla: 'CREAES', nome: 'Centro de Referência em Educação Especial',
    cor: '#5C8B94', secretaria: 'Secretaria Municipal de Educação',
    endereco: 'Rua Coronel Zezé, 88 — Altamira',
    especialidades: ['Atendimento Educacional Especializado', 'Psicopedagogia', 'Fonoaudiologia', 'Terapia Ocupacional']
  },
  {
    id: 'sv-casaazul', sigla: 'CASA AZUL', nome: 'Casa Mais Azul',
    cor: '#4A7C9B', secretaria: 'Secretaria Municipal de Saúde',
    endereco: 'Rua Nogueira Acioli, 310 — Mirante',
    especialidades: ['Psicologia', 'Terapia ABA', 'Fonoaudiologia', 'Terapia Ocupacional', 'Musicoterapia', 'Neuropediatria']
  },
  {
    id: 'sv-crasf', sigla: 'CRASF', nome: 'Centro de Referência de Assistência Social à Família',
    cor: '#8CA37E', secretaria: 'Secretaria Municipal de Assistência Social',
    endereco: 'Rua Joaquim Nogueira, 77 — Venâncios',
    especialidades: ['Serviço Social', 'Psicologia', 'Orientação Familiar']
  }
];

type UsuarioSeed = Omit<Usuario, 'email' | 'senha' | 'ativo'>;

const USUARIOS_BASE: UsuarioSeed[] = [
  { id: 'u-01', nome: 'Ana Cláudia Menezes', perfil: 'recepcao', servicoId: 'sv-nasf', especialidade: null, conselho: null, avatarCor: '#397D87' },
  { id: 'u-02', nome: 'Rita de Cássia Nogueira', perfil: 'recepcao', servicoId: 'sv-nape', especialidade: null, conselho: null, avatarCor: '#7FA89A' },
  { id: 'u-03', nome: 'Larissa Feitosa Bastos', perfil: 'profissional', servicoId: 'sv-nape', especialidade: 'Fonoaudiologia', conselho: 'CRFa 5-4812', avatarCor: '#5C8B94' },
  { id: 'u-04', nome: 'Marcos Vinícius Alencar', perfil: 'profissional', servicoId: 'sv-nasf', especialidade: 'Psicologia', conselho: 'CRP 11/09233', avatarCor: '#4A7C9B' },
  { id: 'u-05', nome: 'Juliana Rocha Pinheiro', perfil: 'profissional', servicoId: 'sv-creaes', especialidade: 'Terapia Ocupacional', conselho: 'CREFITO 6/31204-TO', avatarCor: '#8CA37E' },
  { id: 'u-06', nome: 'Patrícia Sales Guimarães', perfil: 'profissional', servicoId: 'sv-nape', especialidade: 'Psicopedagogia', conselho: 'ABPp 7712', avatarCor: '#397D87' },
  { id: 'u-07', nome: 'Rodrigo Teles Barbosa', perfil: 'profissional', servicoId: 'sv-nape', especialidade: 'Educação Física Adaptada', conselho: 'CREF 8221-G/CE', avatarCor: '#7FA89A' },
  { id: 'u-08', nome: 'Camila Aragão Bezerra', perfil: 'profissional', servicoId: 'sv-casaazul', especialidade: 'Psicologia', conselho: 'CRP 11/10877', avatarCor: '#5C8B94' },
  { id: 'u-09', nome: 'Fernanda Lopes Correia', perfil: 'profissional', servicoId: 'sv-crasf', especialidade: 'Serviço Social', conselho: 'CRESS 3.812', avatarCor: '#4A7C9B' },
  { id: 'u-10', nome: 'Heitor Vasconcelos Maia', perfil: 'profissional', servicoId: 'sv-casaazul', especialidade: 'Neuropediatria', conselho: 'CRM-CE 14022', avatarCor: '#8CA37E' },
  { id: 'u-11', nome: 'Sônia Maria Farias', perfil: 'coordenador', servicoId: 'sv-nape', especialidade: 'Psicopedagogia', conselho: 'ABPp 5510', avatarCor: '#397D87' },
  { id: 'u-12', nome: 'Gilberto Nunes Prado', perfil: 'coordenador', servicoId: 'sv-nasf', especialidade: 'Fisioterapia', conselho: 'CREFITO 6/22910-F', avatarCor: '#7FA89A' },
  { id: 'u-13', nome: 'Verônica Arruda Castelo', perfil: 'coordenador', servicoId: 'sv-casaazul', especialidade: 'Psicologia', conselho: 'CRP 11/08109', avatarCor: '#5C8B94' },
  { id: 'u-14', nome: 'Adriana Moura Pessoa', perfil: 'gestor', servicoId: null, especialidade: null, conselho: null, avatarCor: '#4A7C9B' },
  /* Recepção e coordenação de CREAES, Casa Mais Azul e CRASF — a rede tem 5
     serviços; sem alguém lotado neles, gerenciar_usuarios e
     resolver_duplicidade escopados por serviço deixariam CREAES e CRASF
     dependentes da gestão para tudo, recentralizando o que o modelo
     descentraliza. */
  { id: 'u-15', nome: 'Débora Pontes Rêgo', perfil: 'recepcao', servicoId: 'sv-creaes', especialidade: null, conselho: null, avatarCor: '#5C8B94' },
  { id: 'u-16', nome: 'Vanessa Timbó Cavalcante', perfil: 'recepcao', servicoId: 'sv-casaazul', especialidade: null, conselho: null, avatarCor: '#4A7C9B' },
  { id: 'u-17', nome: 'Iolanda Bezerra Siqueira', perfil: 'recepcao', servicoId: 'sv-crasf', especialidade: null, conselho: null, avatarCor: '#8CA37E' },
  { id: 'u-18', nome: 'Rogério Aguiar Sampaio', perfil: 'coordenador', servicoId: 'sv-creaes', especialidade: 'Psicopedagogia', conselho: 'ABPp 6203', avatarCor: '#5C8B94' },
  { id: 'u-19', nome: 'Cristiane Moura Lacerda', perfil: 'coordenador', servicoId: 'sv-crasf', especialidade: 'Serviço Social', conselho: 'CRESS 4.117', avatarCor: '#8CA37E' }
];

export const SENHA_DEMO = 'sares123';

export const USUARIOS: Usuario[] = USUARIOS_BASE.map((u) => ({
  ...u,
  email: U.normalizar(u.nome).split(' ').slice(0, 2).join('.') + '@crateus.ce.gov.br',
  senha: SENHA_DEMO,
  ativo: true
}));

/* ===================== Vocabulário local ===================== */
const BAIRROS_URBANOS = ['Centro', 'Altamira', 'Venâncios', 'Mirante', 'Alto Brilhante', 'Fátima', 'São Vicente', 'Santa Luzia', 'Planalto', 'Bela Vista'];
const DISTRITOS_RURAIS = ['Realejo', 'Ibiapaba', 'Tucuns', 'Montenebo', 'Oiticica', 'Poti', 'Curral Velho'];

const ESCOLAS = [
  'EMEF Monsenhor Tabosa', 'EMEF Padre Cícero', 'EMEF Raimundo Nonato Sales',
  'EMEF Dom Bosco', 'EMEF Maria José Lima', 'EMEF João XXIII',
  'EMEF Virgílio Távora', 'Creche Municipal Sementinha', 'EMEF Francisca Pinto'
];

const UBS = ['UBS Centro', 'UBS Altamira', 'UBS Mirante', 'UBS Venâncios', 'UBS Fátima', 'UBS Santa Luzia'];

const LOGRADOUROS = ['Rua Firmino Rocha', 'Av. Dom Francisco', 'Rua Coronel Zezé', 'Rua Nogueira Acioli',
  'Rua Joaquim Nogueira', 'Travessa São José', 'Rua Padre Anchieta', 'Av. Filomeno Gomes',
  'Rua Doutor Crisanto', 'Rua Sete de Setembro', 'Rua Antônio Rodrigues', 'Rua da Aurora'];

const HD = [
  'F84.0 — Autismo infantil',
  'F84.0 — Autismo infantil',
  'F84.1 — Autismo atípico',
  'F84.5 — Síndrome de Asperger',
  'F84.9 — TGD não especificado',
  'F84.8 — Outros transtornos globais do desenvolvimento',
  'Em investigação diagnóstica (suspeita de TEA)'
];

const NIVEIS = ['Nível 1', 'Nível 1', 'Nível 2', 'Nível 2', 'Nível 3', 'Em investigação'];

const MEDICAMENTOS = [
  { nome: 'Risperidona', dosagem: '0,5 mg/dia', prescritor: 'Neuropediatria — Casa Mais Azul' },
  { nome: 'Melatonina', dosagem: '3 mg à noite', prescritor: 'Neuropediatria — Casa Mais Azul' },
  { nome: 'Metilfenidato', dosagem: '10 mg/dia', prescritor: 'Neuropediatria — Casa Mais Azul' },
  { nome: 'Ácido valproico', dosagem: '250 mg 2x/dia', prescritor: 'Neurologia — referência regional' }
];

const NOMES_M = ['João Pedro', 'Lucas Gabriel', 'Pedro Henrique', 'Miguel', 'Arthur', 'Davi Lucca', 'Samuel',
  'Benício', 'Enzo Gabriel', 'Théo', 'Gustavo', 'Francisco', 'José Vitor', 'Kauã', 'Ryan',
  'Heitor', 'Bernardo', 'Caio', 'Yuri', 'Emanuel', 'Nicolas', 'Ravi', 'Otávio', 'Anthony'];

const NOMES_F = ['Maria Eduarda', 'Ana Beatriz', 'Sophia', 'Alice', 'Laura', 'Manuela', 'Valentina',
  'Helena', 'Cecília', 'Isabela', 'Lívia', 'Rebeca', 'Maria Clara', 'Lara', 'Antonella',
  'Yasmin', 'Sarah', 'Emanuelly', 'Elisa', 'Mariana', 'Ayla', 'Melissa'];

const SOBRENOMES = ['Alves Lima', 'Sousa Marinho', 'Ferreira Gomes', 'Rodrigues Aguiar', 'Cavalcante Mota',
  'Nogueira Pinto', 'Bezerra Farias', 'Teixeira Rocha', 'Vasconcelos Sales', 'Moreira Lopes',
  'Araújo Feitosa', 'Carvalho Tavares', 'Pereira Duarte', 'Barbosa Xavier', 'Martins Fontenele',
  'Costa Andrade', 'Oliveira Pontes', 'Silva Queiroz', 'Mendes Uchôa', 'Ribeiro Nascimento',
  'Santos Colares', 'Lima Verde', 'Gonçalves Prado', 'Fernandes Maia'];

const NOMES_MAE = ['Francisca', 'Maria de Fátima', 'Antônia', 'Raimunda', 'Luciana', 'Cleide', 'Josefa',
  'Rosângela', 'Vanessa', 'Edilene', 'Márcia', 'Gilvania', 'Sandra', 'Aparecida', 'Neusa', 'Rita'];

const NOMES_PAI = ['Francisco', 'Antônio', 'José', 'Raimundo', 'Marcelo', 'Cícero', 'Edvaldo',
  'Josenildo', 'Paulo', 'Gerardo', 'Válter', 'Domingos'];

const NATURALIDADES = ['Crateús — CE', 'Crateús — CE', 'Crateús — CE', 'Independência — CE',
  'Novo Oriente — CE', 'Ipaporanga — CE', 'Tamboril — CE', 'Fortaleza — CE', 'Teresina — PI'];

const ESCOLARIDADES = ['Não alfabetizado', 'Fundamental incompleto', 'Fundamental completo',
  'Médio incompleto', 'Médio completo', 'Superior incompleto', 'Superior completo', 'Não informado'];

const OCUPACOES = ['Agricultor(a)', 'Do lar', 'Diarista', 'Comerciante', 'Autônomo(a)',
  'Motorista', 'Professor(a)', 'Auxiliar de serviços gerais', 'Pedreiro', 'Costureira',
  'Vigilante', 'Desempregado(a)', 'Aposentado(a)'];

const RESPOSTAS_ABERTAS = [
  'Responsável relata que a dificuldade se acentuou após a entrada na escola, com maior resistência a mudanças de rotina.',
  'A escola já adaptou atividades e reduziu o tempo de tarefa, com ganho parcial de participação.',
  'Apresenta melhor desempenho em atividades estruturadas e com apoio visual. Demanda mediação em situações coletivas.',
  'Família refere sobrecarga no manejo das crises e ausência de rede de apoio próxima.',
  'Rotina organizada em casa, com horários fixos de refeição e sono. Assiste vídeos curtos no período da tarde.',
  'Sem intercorrências relevantes até o momento. Mantém acompanhamento regular e boa adesão às orientações.',
  'Demonstra interesse por atividades com música e movimento; esquiva-se de ambientes com muito ruído.'
];

const RESPOSTAS_CURTAS = [
  'Aos 4 anos', 'Aos 3 anos', 'Não informado', 'Em avaliação', 'Sem alterações',
  'Conforme relato da família', 'Acompanhamento em andamento', 'Não se aplica',
  'Relatado pela escola', 'Sem queixas no momento'
];

interface TextoClinico { o: string; e: string; c: string }

const CLINICO: Record<string, TextoClinico[]> = {
  'Fonoaudiologia': [
    { o: 'Ampliar repertório de vocabulário funcional em contexto de brincadeira dirigida.',
      e: 'Criança receptiva ao setting. Emitiu 12 palavras funcionais espontaneamente, avanço em relação às 7 da sessão anterior. Mantém dificuldade em sons fricativos. Aceitou revezamento de turno com apoio visual.',
      c: 'Manter prancha de comunicação alternativa em casa. Orientada a responsável sobre nomeação de objetos na rotina.' },
    { o: 'Estimular intenção comunicativa por meio de pedido espontâneo.',
      e: 'Realizou 5 pedidos espontâneos usando o cartão PECS sem apoio físico. Contato visual sustentado por até 4 segundos. Demonstrou frustração na troca de atividade, com recuperação rápida.',
      c: 'Ampliar quadro PECS para 8 figuras. Registrar em casa os pedidos espontâneos durante a semana.' },
    { o: 'Avaliar praxia oral e funções de mastigação e deglutição.',
      e: 'Seletividade alimentar importante, restrita a alimentos de textura macia. Praxias linguais preservadas. Sem sinais de disfagia. Recusa alimentos de cor verde.',
      c: 'Encaminhamento para Nutrição. Iniciar dessensibilização oral gradual em conjunto com a família.' }
  ],
  'Psicologia': [
    { o: 'Favorecer autorregulação emocional diante de mudanças de rotina.',
      e: 'Apresentou duas crises de desregulação no início da sessão, ambas contornadas com o uso do canto de calma. Aceitou a antecipação visual da troca de atividade. Vínculo terapêutico em consolidação.',
      c: 'Orientação parental sobre antecipação visual. Manter quadro de rotina afixado em casa.' },
    { o: 'Trabalhar habilidades sociais em situação de brincadeira paralela.',
      e: 'Tolerou a presença de par por 15 minutos sem esquiva. Iniciou uma interação espontânea. Ainda não sustenta brincadeira cooperativa.',
      c: 'Incluir em grupo terapêutico quinzenal. Reavaliar em 60 dias.' },
    { o: 'Acolhimento familiar e orientação sobre manejo comportamental.',
      e: 'Mãe relata sobrecarga e ausência de rede de apoio. Refere dificuldade no manejo de crises noturnas. Demonstra disponibilidade para orientações.',
      c: 'Encaminhamento ao CRASF para avaliação socioassistencial da família.' }
  ],
  'Terapia Ocupacional': [
    { o: 'Desenvolver independência nas atividades de vida diária — vestir-se.',
      e: 'Realizou a sequência de vestir a camisa com apoio verbal apenas na etapa final. Melhora na coordenação bimanual. Hipersensibilidade tátil a tecidos com etiqueta persiste.',
      c: 'Orientar família a remover etiquetas. Manter sequência visual de vestir no quarto.' },
    { o: 'Regular perfil sensorial em ambiente com estímulos controlados.',
      e: 'Boa resposta a estímulos proprioceptivos profundos. Esquiva a sons agudos, com cobertura auricular espontânea. Tolerou 20 minutos de atividade sem sobrecarga.',
      c: 'Prescrição de dieta sensorial domiciliar. Abafador de ruído para ambiente escolar.' },
    { o: 'Treinar coordenação motora fina para uso de instrumento de escrita.',
      e: 'Preensão em pinça trípode ainda instável. Conseguiu traçar linhas horizontais dentro do limite em 6 de 10 tentativas.',
      c: 'Indicado engrossador de lápis. Atividades de pinça em casa, 10 minutos por dia.' }
  ],
  'Psicopedagogia': [
    { o: 'Avaliar nível de consciência fonológica e hipótese de escrita.',
      e: 'Encontra-se na hipótese silábico-alfabética. Reconhece 19 das 26 letras. Dificuldade em segmentação silábica de palavras com sílabas complexas.',
      c: 'Plano de intervenção com jogos de rima. Articular com a professora do AEE.' },
    { o: 'Trabalhar atenção sustentada em tarefa dirigida de 15 minutos.',
      e: 'Sustentou atenção por 9 minutos, com duas interrupções. Beneficia-se de pausas programadas e apoio visual da sequência de tarefas.',
      c: 'Sugerida adaptação de tempo de prova na escola. Enviar relatório à unidade escolar.' },
    { o: 'Acompanhar evolução do raciocínio lógico-matemático.',
      e: 'Realiza contagem até 20 com apoio concreto. Não consolidou o conceito de quantidade abstrata. Apresenta bom desempenho em sequências e padrões.',
      c: 'Uso de material dourado. Reavaliação em 90 dias.' }
  ],
  'Educação Física Adaptada': [
    { o: 'Desenvolver equilíbrio dinâmico e noção espaço-temporal.',
      e: 'Percorreu o circuito com apoio em dois pontos. Saltou com os dois pés simultaneamente em 4 de 6 tentativas. Melhora na recepção de bola grande.',
      c: 'Manter circuito adaptado 2x por semana. Envolver a família em atividades de praça.' },
    { o: 'Estimular participação em atividade coletiva de baixa demanda competitiva.',
      e: 'Participou de atividade em dupla por 12 minutos. Aceitou orientação e correção sem desregulação. Demonstrou satisfação ao final.',
      c: 'Progredir para grupo de quatro participantes na próxima sessão.' }
  ],
  'Serviço Social': [
    { o: 'Avaliar situação socioassistencial e acesso a benefícios.',
      e: 'Família em situação de vulnerabilidade, renda inferior a meio salário mínimo per capita. Não possui BPC. CadÚnico desatualizado desde 2024.',
      c: 'Orientada atualização do CadÚnico. Requerimento de BPC iniciado. Inclusão no serviço de convivência.' },
    { o: 'Acompanhar plano de atendimento familiar.',
      e: 'Família aderente às orientações. Responsável conseguiu flexibilizar horário de trabalho para acompanhar os atendimentos. Rede de apoio ainda frágil.',
      c: 'Manter acompanhamento mensal. Articular transporte com a Secretaria de Saúde.' }
  ],
  'Neuropediatria': [
    { o: 'Reavaliação clínica e ajuste de conduta medicamentosa.',
      e: 'Mantém padrão de sono irregular apesar da melatonina. Sem intercorrências neurológicas. Ganho ponderal adequado. Marcos motores preservados.',
      c: 'Ajustada dosagem de melatonina. Solicitado EEG em vigília e sono. Retorno em 90 dias.' },
    { o: 'Avaliação diagnóstica inicial com aplicação de instrumento de triagem.',
      e: 'Aplicado M-CHAT-R com resultado de alto risco. Histórico de regressão de linguagem aos 22 meses. Sinais consistentes com TEA.',
      c: 'Hipótese diagnóstica F84.0. Encaminhamentos para fonoaudiologia, TO e psicologia.' }
  ],
  'Nutrição': [
    { o: 'Avaliar seletividade alimentar e estado nutricional.',
      e: 'IMC adequado para a idade. Repertório alimentar restrito a 11 alimentos. Baixa ingestão de fibras e ferro.',
      c: 'Plano de ampliação alimentar gradual. Suplementação de ferro. Orientação à família sobre exposição sem pressão.' }
  ],
  'Fisioterapia': [
    { o: 'Avaliar tônus e padrão de marcha.',
      e: 'Marcha na ponta dos pés intermitente. Encurtamento de tríceps sural bilateral. Sem alteração de tônus significativa.',
      c: 'Alongamentos diários. Reavaliação em 60 dias.' }
  ],
  'Atendimento Educacional Especializado': [
    { o: 'Elaborar plano de atendimento educacional individualizado.',
      e: 'Aluno responde bem a apoio visual e rotina estruturada. Necessita de mediação para atividades em grupo. Professora regente aderente às orientações.',
      c: 'PAEE elaborado e entregue à escola. Acompanhamento quinzenal na sala de recursos.' }
  ],
  'Terapia ABA': [
    { o: 'Aplicar programa de tentativas discretas para identificação de figuras.',
      e: 'Atingiu 82% de acertos no programa de identificação receptiva. Redução de comportamento de esquiva. Boa resposta ao reforçador escolhido.',
      c: 'Avançar para programa de imitação motora. Manter registro diário de linha de base.' }
  ],
  'Musicoterapia': [
    { o: 'Favorecer expressão e regulação por meio de atividade musical.',
      e: 'Demonstrou preferência por instrumentos de percussão. Sustentou ritmo compartilhado por 3 minutos. Redução visível de estereotipias durante a atividade.',
      c: 'Manter sessões semanais. Sugerida playlist de regulação para uso domiciliar.' }
  ],
  'Orientação Familiar': [
    { o: 'Orientar a família sobre direitos e rede de apoio disponível.',
      e: 'Responsável desconhecia o direito à carteira de identificação da pessoa com TEA. Demonstrou interesse no grupo de mães.',
      c: 'Emitida orientação para solicitação da CIPTEA. Convite para o grupo de famílias.' }
  ]
};

const CLINICO_PADRAO: TextoClinico[] = [{
  o: 'Acompanhamento conforme plano terapêutico singular.',
  e: 'Paciente compareceu acompanhado do responsável. Manteve os ganhos observados na sessão anterior, sem intercorrências.',
  c: 'Manter conduta e frequência atuais.'
}];

const MOTIVOS_AUSENCIA = [
  'Sem transporte disponível no dia',
  'Responsável trabalhando no horário',
  'Criança adoeceu',
  'Família não foi localizada por telefone',
  'Chuva forte — zona rural intransitável',
  'Conflito de horário com atendimento em outro serviço'
];

const QUEIXAS = [
  'Atraso na fala relatado pela escola',
  'Dificuldade de interação com colegas',
  'Comportamento repetitivo e resistência a mudanças',
  'Dificuldade de aprendizagem e desatenção',
  'Crises de desregulação em sala de aula',
  'Seletividade alimentar intensa',
  'Encaminhado pela escola para avaliação diagnóstica',
  'Dificuldade de coordenação motora'
];

export const catalogos = {
  bairros: BAIRROS_URBANOS.concat(DISTRITOS_RURAIS),
  bairrosUrbanos: BAIRROS_URBANOS,
  distritosRurais: DISTRITOS_RURAIS,
  escolas: ESCOLAS,
  ubs: UBS,
  logradouros: LOGRADOUROS,
  hd: HD,
  niveis: NIVEIS,
  medicamentos: MEDICAMENTOS,
  nomesM: NOMES_M,
  nomesF: NOMES_F,
  sobrenomes: SOBRENOMES,
  nomesMae: NOMES_MAE,
  nomesPai: NOMES_PAI,
  naturalidades: NATURALIDADES,
  escolaridades: ESCOLARIDADES,
  ocupacoes: OCUPACOES,
  respostasAbertas: RESPOSTAS_ABERTAS,
  respostasCurtas: RESPOSTAS_CURTAS,
  queixas: QUEIXAS,
  motivosAusencia: MOTIVOS_AUSENCIA,
  clinico: CLINICO,
  clinicoPadrao: CLINICO_PADRAO
};

/* ===================== Geração ===================== */

/* Documentos da base de demonstração são gerados VÁLIDOS: o cadastro
   recusa CNS e CPF com dígito verificador errado, então a própria seed
   precisa passar na mesma régua. */
function gerarCNS(rand: () => number) { return U.gerarCNSValido(rand); }
function gerarCPF(rand: () => number) { return U.gerarCPFValido(rand); }

function gerarTelefone(rand: () => number) {
  return '889' + U.intBetween(rand, 1000, 9999) + U.intBetween(rand, 1000, 9999);
}

function gerarEndereco(rand: () => number) {
  const rural = rand() < 0.26;
  return {
    logradouro: U.pick(rand, LOGRADOUROS),
    numero: String(U.intBetween(rand, 12, 1890)),
    bairro: rural ? U.pick(rand, DISTRITOS_RURAIS) : U.pick(rand, BAIRROS_URBANOS),
    municipio: 'Crateús', uf: 'CE',
    cep: '637' + U.intBetween(rand, 10, 99) + '' + U.intBetween(rand, 100, 999),
    zona: rural ? 'Rural' : 'Urbana'
  };
}

interface OpcoesPaciente {
  id?: string; sexo?: string; sobrenome?: string; primeiro?: string; nomeCompleto?: string;
  idade?: number; dataNascimento?: string; nomeMae?: string; endereco?: Paciente['endereco'];
  cns?: string; cpf?: string; aps?: string; escola?: string; hd?: string; nivel?: string;
  prontuario?: string; dataAbertura?: string; criadoPor?: string;
}

function montarPaciente(rand: () => number, o: OpcoesPaciente): Paciente {
  const feminino = o.sexo ? o.sexo === 'Feminino' : rand() < 0.28; // TEA tem maior prevalência em meninos
  const sobrenome = o.sobrenome || U.pick(rand, SOBRENOMES);
  const primeiro = o.primeiro || U.pick(rand, feminino ? NOMES_F : NOMES_M);
  const nome = o.nomeCompleto || (primeiro + ' ' + sobrenome);
  const idadeAnos = o.idade || U.intBetween(rand, 2, 17);
  const nasc = o.dataNascimento || U.addDias(U.hojeISO(), -(idadeAnos * 365 + U.intBetween(rand, 0, 364)));
  const mae = o.nomeMae || (U.pick(rand, NOMES_MAE) + ' ' + sobrenome);
  const end = o.endereco || gerarEndereco(rand);
  const emIdadeEscolar = U.idade(nasc) >= 4;
  const dataAberturaCalc = o.dataAbertura || U.addDias(U.hojeISO(), -U.intBetween(rand, 30, 900));

  return {
    id: o.id || U.uid('pac'),
    nomeCompleto: nome,
    nomeSocial: '',
    cns: o.cns !== undefined ? o.cns : gerarCNS(rand),
    cpf: o.cpf !== undefined ? o.cpf : (rand() < 0.62 ? gerarCPF(rand) : ''),
    dataNascimento: nasc,
    sexo: feminino ? 'Feminino' : 'Masculino',
    cor: U.pick(rand, ['Parda', 'Parda', 'Parda', 'Branca', 'Preta', 'Não informada']),
    nomeMae: mae,
    nomePai: rand() < 0.72 ? (U.pick(rand, NOMES_PAI) + ' ' + sobrenome) : '',
    responsavel: {
      nome: mae,
      cns: gerarCNS(rand),
      dataNascimento: U.addDias(nasc, -U.intBetween(rand, 6570, 14600)),
      parentesco: rand() < 0.82 ? 'Mãe' : (rand() < 0.5 ? 'Avó' : 'Pai'),
      telefone: gerarTelefone(rand)
    },
    telefone: gerarTelefone(rand),
    endereco: end,
    naturalidade: U.pick(rand, NATURALIDADES),
    dadosFamiliares: {
      numeroIrmaos: String(U.intBetween(rand, 0, 4)),
      pessoasResidencia: String(U.intBetween(rand, 2, 8)),
      situacaoConjugalPais: U.pick(rand, ['Casados', 'União estável', 'Separados', 'Mãe solo', 'Outro']),
      escolaridadeMae: U.pick(rand, ESCOLARIDADES),
      ocupacaoMae: U.pick(rand, OCUPACOES),
      escolaridadePai: U.pick(rand, ESCOLARIDADES),
      ocupacaoPai: U.pick(rand, OCUPACOES)
    },
    apsReferencia: o.aps || U.pick(rand, UBS),
    escola: emIdadeEscolar ? (o.escola || U.pick(rand, ESCOLAS)) : '',
    serie: emIdadeEscolar ? (Math.max(1, U.idade(nasc) - 5) + 'º ano') : '',
    turno: emIdadeEscolar ? U.pick(rand, ['Manhã', 'Tarde']) : '',
    turma: emIdadeEscolar ? U.pick(rand, ['A', 'B', 'C']) : '',
    hipoteseDiagnostica: o.hd || U.pick(rand, HD),
    nivelSuporte: o.nivel || U.pick(rand, NIVEIS),
    medicacoes: rand() < 0.34 ? [U.pick(rand, MEDICAMENTOS)] : [],
    queixaInicial: U.pick(rand, QUEIXAS),
    numeroProntuario: o.prontuario || String(U.intBetween(rand, 10000, 99999)),
    dataAbertura: dataAberturaCalc,
    consentimentoLGPD: {
      concedido: true,
      data: dataAberturaCalc,
      responsavel: mae,
      finalidade: 'Gestão do cuidado em saúde, educação e assistência social na rede municipal de Crateús'
    },
    criadoPor: o.criadoPor || U.pick(rand, ['u-01', 'u-02']),
    criadoEm: Date.now() - U.intBetween(rand, 30, 900) * 86400000,
    atualizadoEm: Date.now() - U.intBetween(rand, 1, 60) * 86400000,
    statusRegistro: 'ativo'
  };
}

export interface SeedData {
  servicos: Servico[];
  usuarios: Usuario[];
  pacientes: Paciente[];
  filas: FilaItem[];
  atendimentos: Atendimento[];
  anamneses: Anamnese[];
  alertas: Alerta[];
  logs: LogEntry[];
}

export function gerar(): SeedData {
  const rand = U.rng(20260916); // seed = data do hackathon
  const hoje = U.hojeISO();

  const pacientes: Paciente[] = [];
  let filas: FilaItem[] = [];
  const atendimentos: Atendimento[] = [];
  const logs: LogEntry[] = [];

  // Contadores locais (não U.uid, que é Date.now()-based): gerar() precisa
  // produzir os mesmos IDs a cada chamada, senão rodar a seed de novo
  // duplica tudo em vez de sobrescrever.
  let seqAt = 0;
  let seqFil = 0;
  let seqLog = 0;
  let seqAnm = 0;

  /* ---- Casos plantados para a demonstração ---- */

  // Caso 1 — duplicata evidente: mesmo CNS, mesma data de nascimento, grafias diferentes
  const cnsCompartilhado = '898004127733901';
  const nascMariaEduarda = U.addDias(hoje, -(8 * 365 + 120));
  const pMaria1 = montarPaciente(rand, {
    id: 'pac-demo-01', nomeCompleto: 'Maria Eduarda Alves Lima', sexo: 'Feminino',
    cns: cnsCompartilhado, dataNascimento: nascMariaEduarda,
    nomeMae: 'Francisca Alves Lima', hd: 'F84.0 — Autismo infantil', nivel: 'Nível 2',
    prontuario: '10432', dataAbertura: U.addDias(hoje, -420), criadoPor: 'u-01',
    escola: 'EMEF Monsenhor Tabosa'
  });
  const pMaria2 = montarPaciente(rand, {
    id: 'pac-demo-02', nomeCompleto: 'Maria Eduarda A. Lima', sexo: 'Feminino',
    cns: cnsCompartilhado, dataNascimento: nascMariaEduarda,
    nomeMae: 'Francisca Alves Lima', hd: 'F84.0 — Autismo infantil', nivel: 'Nível 2',
    prontuario: '20118', dataAbertura: U.addDias(hoje, -95), criadoPor: 'u-02',
    escola: 'EMEF Monsenhor Tabosa'
  });
  pMaria2.endereco = JSON.parse(JSON.stringify(pMaria1.endereco));
  pMaria2.telefone = pMaria1.telefone;
  pMaria2.responsavel.nome = 'Francisca Alves Lima';

  // Caso 2 — provável duplicata: sem CNS em um dos registros, nome abreviado
  const nascJoao = U.addDias(hoje, -(11 * 365 + 40));
  const pJoao1 = montarPaciente(rand, {
    id: 'pac-demo-03', nomeCompleto: 'João Pedro Sousa Marinho', sexo: 'Masculino',
    dataNascimento: nascJoao, nomeMae: 'Antônia Sousa Marinho',
    hd: 'F84.1 — Autismo atípico', nivel: 'Nível 1', prontuario: '10877',
    dataAbertura: U.addDias(hoje, -300), criadoPor: 'u-01'
  });
  const pJoao2 = montarPaciente(rand, {
    id: 'pac-demo-04', nomeCompleto: 'Joao Pedro S. Marinho', sexo: 'Masculino',
    cns: '', cpf: '', dataNascimento: nascJoao, nomeMae: 'Antonia Sousa Marinho',
    hd: 'Em investigação diagnóstica (suspeita de TEA)', nivel: 'Em investigação',
    prontuario: '20344', dataAbertura: U.addDias(hoje, -62), criadoPor: 'u-02'
  });

  // Caso 3 — FALSO POSITIVO proposital: nomes parecidos, mas pessoas diferentes
  const pAna1 = montarPaciente(rand, {
    id: 'pac-demo-05', nomeCompleto: 'Ana Beatriz Ferreira', sexo: 'Feminino',
    dataNascimento: U.addDias(hoje, -(7 * 365 + 200)), nomeMae: 'Luciana Ferreira Souza',
    hd: 'F84.5 — Síndrome de Asperger', nivel: 'Nível 1', prontuario: '11290',
    dataAbertura: U.addDias(hoje, -260), criadoPor: 'u-01'
  });
  const pAna2 = montarPaciente(rand, {
    id: 'pac-demo-06', nomeCompleto: 'Ana Beatriz Ferreira Gomes', sexo: 'Feminino',
    dataNascimento: U.addDias(hoje, -(10 * 365 + 15)), nomeMae: 'Rosângela Gomes Pinto',
    hd: 'F84.9 — TGD não especificado', nivel: 'Nível 2', prontuario: '11744',
    dataAbertura: U.addDias(hoje, -180), criadoPor: 'u-02'
  });

  // Caso 4 — sobreposição de atendimento: mesma especialidade em dois serviços
  const pLucas = montarPaciente(rand, {
    id: 'pac-demo-07', nomeCompleto: 'Lucas Gabriel Moreira Lopes', sexo: 'Masculino',
    dataNascimento: U.addDias(hoje, -(6 * 365 + 90)), nomeMae: 'Cleide Moreira Lopes',
    hd: 'F84.0 — Autismo infantil', nivel: 'Nível 2', prontuario: '10655',
    dataAbertura: U.addDias(hoje, -340), criadoPor: 'u-01',
    escola: 'EMEF Padre Cícero'
  });

  pacientes.push(pMaria1, pMaria2, pJoao1, pJoao2, pAna1, pAna2, pLucas);

  /* ---- Demais pacientes ---- */
  const usados: Record<string, boolean> = {};
  pacientes.forEach((p) => { usados[U.normalizar(p.nomeCompleto)] = true; });

  const alvo = 42;
  let tentativas = 0;
  while (pacientes.length < alvo && tentativas < 400) {
    tentativas++;
    const p = montarPaciente(rand, { id: 'pac-seed-' + String(pacientes.length + 1).padStart(3, '0') });
    const chave = U.normalizar(p.nomeCompleto);
    if (usados[chave]) continue;
    usados[chave] = true;
    pacientes.push(p);
  }

  /* ---- Vínculos, filas e atendimentos ---- */
  function profissionaisDe(servicoId: string, especialidade: string | null) {
    return USUARIOS.filter((u) =>
      u.servicoId === servicoId &&
      (u.perfil === 'profissional' || u.perfil === 'coordenador') &&
      (!especialidade || u.especialidade === especialidade)
    );
  }

  function textoClinico(rand: () => number, esp: string) {
    const pool = CLINICO[esp] || CLINICO_PADRAO;
    return U.pick(rand, pool);
  }

  function criarAtendimento(
    rand: () => number, pacienteId: string, servicoId: string, esp: string,
    dataISO: string, numeroSessao: number, forcarPresenca?: Atendimento['presenca']
  ): Atendimento | null {
    let profs = profissionaisDe(servicoId, esp);
    if (!profs.length) profs = profissionaisDe(servicoId, null);
    if (!profs.length) return null;
    const prof = U.pick(rand, profs);

    const r = rand();
    const presenca: Atendimento['presenca'] = forcarPresenca || (r < 0.78 ? 'compareceu' : (r < 0.92 ? 'faltou' : 'justificou'));
    const txt = textoClinico(rand, esp);
    const compareceu = presenca === 'compareceu';

    return {
      id: 'at-' + String(++seqAt).padStart(4, '0'),
      pacienteId, servicoId,
      profissionalId: prof.id,
      especialidade: esp,
      tipo: numeroSessao === 1 ? 'primeiro_atendimento' : (rand() < 0.14 ? 'avaliacao' : 'sessao'),
      data: dataISO,
      horario: U.pick(rand, ['08:00', '08:40', '09:20', '10:00', '10:40', '13:30', '14:10', '14:50', '15:30']),
      numeroSessao,
      presenca,
      motivoAusencia: compareceu ? '' : U.pick(rand, MOTIVOS_AUSENCIA),
      objetivoSessao: compareceu ? txt.o : '',
      evolucao: compareceu ? txt.e : '',
      condutas: compareceu ? txt.c : '',
      encaminhamentos: [],
      registradoEm: (U.parseISO(dataISO) as Date).getTime() + 15 * 3600000
    };
  }

  pacientes.forEach((p) => {
    const nVinculos = p.id.indexOf('pac-demo') === 0 ? 2 : U.intBetween(rand, 1, 3);
    const servicosEmbaralhados = U.ordenarPor(SERVICOS, () => rand());
    const escolhidos = servicosEmbaralhados.slice(0, nVinculos);

    escolhidos.forEach((sv) => {
      const esp = U.pick(rand, sv.especialidades);
      const nSessoes = U.intBetween(rand, 2, 8);
      const intervalo = U.intBetween(rand, 9, 18); // dias entre sessões
      const ultima = U.intBetween(rand, 2, 110); // dias desde a última sessão

      for (let i = 0; i < nSessoes; i++) {
        const dias = ultima + (nSessoes - 1 - i) * intervalo;
        if (dias > 200) continue;
        const at = criarAtendimento(rand, p.id, sv.id, esp, U.addDias(hoje, -dias), i + 1);
        if (!at) continue;

        if (at.presenca === 'compareceu' && rand() < 0.16) {
          const destino = U.pick(rand, SERVICOS.filter((s) => s.id !== sv.id));
          const espDestino = U.pick(rand, destino.especialidades);
          const prioDestino = U.pick(rand, ['CURTO PRAZO', 'LISTA DE ESPERA', 'LISTA DE ESPERA']) as Prioridade;

          const jaEsperaEmOutroServico = filas.some((f) =>
            f.pacienteId === p.id && f.especialidade === espDestino &&
            (f.status === 'aguardando' || f.status === 'agendado')
          );

          if (!jaEsperaEmOutroServico) {
            at.encaminhamentos.push({
              servicoId: destino.id, especialidade: espDestino, prioridade: prioDestino,
              motivo: 'Necessidade de avaliação complementar identificada em sessão.'
            });

            const jaAbsorvido = rand() < 0.45;
            filas.push({
              id: 'fil-' + String(++seqFil).padStart(4, '0'), pacienteId: p.id, servicoId: destino.id, especialidade: espDestino,
              prioridade: prioDestino, status: jaAbsorvido ? 'concluido' : 'aguardando',
              origem: 'encaminhamento', encaminhamentoOrigemId: at.id, dataEntrada: at.data,
              dataAgendada: null, posicao: 999,
              observacao: 'Gerada automaticamente pelo encaminhamento do ' + sv.sigla + '.'
            });

            if (jaAbsorvido) {
              const atDestino = criarAtendimento(rand, p.id, destino.id, espDestino,
                U.addDias(at.data, U.intBetween(rand, 12, 40)), 1, 'compareceu');
              if (atDestino && U.diffDias(atDestino.data) >= 0) atendimentos.push(atDestino);
            }
          }
        }
        atendimentos.push(at);
      }

      const espJaAtivaEmOutroServico = filas.some((f) =>
        f.pacienteId === p.id && f.especialidade === esp &&
        (f.status === 'aguardando' || f.status === 'agendado') && f.servicoId !== sv.id
      );

      if (rand() < 0.45 && !espJaAtivaEmOutroServico) {
        const r2 = rand();
        filas.push({
          id: 'fil-' + String(++seqFil).padStart(4, '0'), pacienteId: p.id, servicoId: sv.id, especialidade: esp,
          prioridade: r2 < 0.16 ? 'URGENTE' : (r2 < 0.48 ? 'CURTO PRAZO' : 'LISTA DE ESPERA'),
          status: 'aguardando',
          origem: U.pick(rand, ['escola', 'espontanea', 'encaminhamento', 'busca_ativa']) as OrigemFila,
          encaminhamentoOrigemId: null,
          dataEntrada: U.addDias(hoje, -U.intBetween(rand, 3, 120)),
          dataAgendada: null, posicao: 999, observacao: ''
        });
      }
    });
  });

  /* ---- Fila plantada: sobreposição de Fonoaudiologia (NAPE × CREAES) ---- */
  filas = filas.filter((f) => f.pacienteId !== pLucas.id);
  filas.push({
    id: 'fil-demo-01', pacienteId: pLucas.id, servicoId: 'sv-nape', especialidade: 'Fonoaudiologia',
    prioridade: 'CURTO PRAZO', status: 'aguardando', origem: 'escola', encaminhamentoOrigemId: null,
    dataEntrada: U.addDias(hoje, -38), dataAgendada: null, posicao: 999,
    observacao: 'Encaminhado pela EMEF Padre Cícero.'
  });
  filas.push({
    id: 'fil-demo-02', pacienteId: pLucas.id, servicoId: 'sv-creaes', especialidade: 'Fonoaudiologia',
    prioridade: 'LISTA DE ESPERA', status: 'aguardando', origem: 'espontanea', encaminhamentoOrigemId: null,
    dataEntrada: U.addDias(hoje, -24), dataAgendada: null, posicao: 999,
    observacao: 'Procura espontânea da responsável.'
  });
  filas.push({
    id: 'fil-demo-03', pacienteId: pMaria1.id, servicoId: 'sv-nape', especialidade: 'Fonoaudiologia',
    prioridade: 'URGENTE', status: 'aguardando', origem: 'encaminhamento', encaminhamentoOrigemId: null,
    dataEntrada: U.addDias(hoje, -12), dataAgendada: null, posicao: 999,
    observacao: 'Regressão de linguagem relatada pela escola.'
  });

  /* ---- Agendamentos ---- */
  filas.filter((f) => f.status === 'aguardando').forEach((f) => {
    if (rand() < 0.3) {
      f.status = 'agendado';
      f.dataAgendada = U.addDias(hoje, U.intBetween(rand, 1, 21));
      f.horarioAgendado = U.pick(rand, ['08:00', '08:40', '09:20', '10:00', '13:30', '14:10', '14:50']);
    }
  });

  /* ---- Posições de fila ---- */
  const porFila = U.agruparPor(filas, (f) => f.servicoId + '|' + f.prioridade);
  Object.keys(porFila).forEach((k) => {
    U.ordenarPor(porFila[k], (f) => f.dataEntrada).forEach((f, i) => { f.posicao = i + 1; });
  });

  /* ---- Alertas de duplicidade plantados ---- */
  const alertas: Alerta[] = [
    {
      id: 'alt-demo-01', tipo: 'cadastro', pacienteIds: [pMaria1.id, pMaria2.id], score: 100,
      criterios: ['CNS idêntico', 'Nome 96% similar', 'Mesma data de nascimento', 'Mesmo nome da mãe'],
      status: 'aberto', detectadoEm: Date.now() - 6 * 86400000,
      resolvidoPor: null, resolvidoEm: null, observacao: ''
    },
    {
      id: 'alt-demo-02', tipo: 'cadastro', pacienteIds: [pJoao1.id, pJoao2.id], score: 88,
      criterios: ['Nome 91% similar', 'Mesma data de nascimento', 'Nome da mãe 97% similar'],
      status: 'aberto', detectadoEm: Date.now() - 3 * 86400000,
      resolvidoPor: null, resolvidoEm: null, observacao: ''
    },
    {
      id: 'alt-demo-03', tipo: 'cadastro', pacienteIds: [pAna1.id, pAna2.id], score: 62,
      criterios: ['Nome 82% similar'],
      status: 'aberto', detectadoEm: Date.now() - 2 * 86400000,
      resolvidoPor: null, resolvidoEm: null, observacao: ''
    },
    {
      id: 'alt-demo-04', tipo: 'atendimento', pacienteIds: [pLucas.id], score: 100,
      criterios: ['Mesma especialidade (Fonoaudiologia)', 'Dois serviços simultâneos: NAPE e CREAES'],
      status: 'aberto', detectadoEm: Date.now() - 1 * 86400000,
      resolvidoPor: null, resolvidoEm: null, observacao: '',
      filaIds: ['fil-demo-01', 'fil-demo-02']
    }
  ];

  /* ---- Histórico de duplicidades já resolvidas ---- */
  for (let d = 0; d < 4; d++) {
    alertas.push({
      id: 'alt-hist-' + d, tipo: 'cadastro',
      pacienteIds: [pacientes[10 + d].id, pacientes[20 + d].id], score: U.intBetween(rand, 84, 99),
      criterios: ['Nome similar', 'Mesma data de nascimento'],
      status: d < 3 ? 'mesclado' : 'descartado',
      detectadoEm: Date.now() - U.intBetween(rand, 10, 28) * 86400000,
      resolvidoPor: 'u-11', resolvidoEm: Date.now() - U.intBetween(rand, 2, 9) * 86400000,
      observacao: d < 3 ? 'Registros mesclados após confirmação com a família.' : 'Homônimos — confirmado que são pessoas distintas.'
    });
  }

  /* ---- Logs de auditoria ---- */
  function log(usuarioId: string | null, acao: string, entidade: string | null, entidadeId: string | null,
    pacienteId: string | null, detalhe: string, diasAtras: number) {
    logs.push({
      id: 'log-' + String(++seqLog).padStart(5, '0'), usuarioId, acao, entidade, entidadeId, pacienteId: pacienteId || null,
      timestamp: Date.now() - Math.round(diasAtras * 86400000),
      detalhe: detalhe || '', ip: '10.12.' + U.intBetween(rand, 1, 40) + '.' + U.intBetween(rand, 2, 250)
    });
  }

  atendimentos.slice(-70).forEach((at) => {
    log(at.profissionalId, 'registrou_atendimento', 'atendimento', at.id, at.pacienteId,
      at.especialidade + ' — ' + at.presenca, U.diffDias(at.data));
    if (rand() < 0.5) {
      log(at.profissionalId, 'visualizou_prontuario', 'paciente', at.pacienteId, at.pacienteId,
        '', U.diffDias(at.data) + 0.01);
    }
  });

  pacientes.slice(0, 20).forEach((p) => {
    log(p.criadoPor, 'criou_paciente', 'paciente', p.id, p.id, 'Cadastro inicial', U.diffDias(p.dataAbertura));
  });

  log('u-03', 'acessou_evolucao_outro_servico', 'atendimento', atendimentos[5] ? atendimentos[5].id : null,
    atendimentos[5] ? atendimentos[5].pacienteId : null,
    'Justificativa: "Continuidade do cuidado — preparação de relatório conjunto para a escola."', 4);
  log('u-05', 'acessou_evolucao_outro_servico', 'atendimento', atendimentos[12] ? atendimentos[12].id : null,
    atendimentos[12] ? atendimentos[12].pacienteId : null,
    'Justificativa: "Avaliação de sobreposição de atendimento identificada pelo sistema."', 2);

  USUARIOS.slice(0, 8).forEach((u, i) => {
    log(u.id, 'login', 'sessao', null, null, '', i * 0.35 + 0.2);
  });

  /* ---- Anamneses (fichas A.2, A.3 e A.4 do anexo) ---- */
  const anamneses: Anamnese[] = [];

  function responderInstrumento(rand: () => number, tipo: TipoAnamnese, paciente: Paciente): Record<string, unknown> {
    const campos = instrumentos.campos(tipo);
    const r: Record<string, unknown> = {};
    campos.forEach((c) => {
      if (c.tipo === 'selecao' && c.opcoes && c.opcoes.length) {
        r[c.nome] = U.pick(rand, c.opcoes);
      } else if (c.tipo === 'multipla' && c.opcoes && c.opcoes.length) {
        r[c.nome] = c.opcoes.filter(() => rand() < 0.4);
        if (!(r[c.nome] as string[]).length) r[c.nome] = [U.pick(rand, c.opcoes)];
      } else if (c.tipo === 'numero') {
        r[c.nome] = String(U.intBetween(rand, 2, 8));
      } else if (c.tipo === 'area') {
        r[c.nome] = U.pick(rand, RESPOSTAS_ABERTAS);
      } else {
        r[c.nome] = U.pick(rand, RESPOSTAS_CURTAS);
      }
    });
    if (r.queixa) r.queixa = paciente.queixaInicial;
    if (r.queixaAtual) r.queixaAtual = paciente.queixaInicial;
    if (r.queixaPrincipal) r.queixaPrincipal = paciente.queixaInicial;
    if (r.numeroIrmaos) r.numeroIrmaos = paciente.dadosFamiliares.numeroIrmaos;
    if (r.pessoasResidencia) r.pessoasResidencia = paciente.dadosFamiliares.pessoasResidencia;
    if (r.situacaoConjugalPais) r.situacaoConjugalPais = paciente.dadosFamiliares.situacaoConjugalPais;
    if (r.escolaridadeMae) r.escolaridadeMae = paciente.dadosFamiliares.escolaridadeMae;
    if (r.ocupacaoMae) r.ocupacaoMae = paciente.dadosFamiliares.ocupacaoMae;
    if (r.escolaridadePai) r.escolaridadePai = paciente.dadosFamiliares.escolaridadePai;
    if (r.ocupacaoPai) r.ocupacaoPai = paciente.dadosFamiliares.ocupacaoPai;
    return r;
  }

  const PROF_POR_TIPO: Record<TipoAnamnese, string> = {
    psicologica: 'u-04', // Marcos Vinícius — Psicologia
    psicopedagogica: 'u-06', // Patrícia Sales — Psicopedagogia
    educacao_fisica: 'u-07' // Rodrigo Teles — Educação Física Adaptada
  };

  const comAnamnese = ([pMaria1, pJoao1, pLucas, pAna1] as Paciente[]).concat(
    pacientes.filter((p) => p.id.indexOf('pac-demo') !== 0).slice(0, 12)
  );

  comAnamnese.forEach((p) => {
    const tipos: TipoAnamnese[] = ['psicologica'];
    if (rand() < 0.65) tipos.push('psicopedagogica');
    if (rand() < 0.35) tipos.push('educacao_fisica');

    tipos.forEach((tipo) => {
      const prof = PROF_POR_TIPO[tipo];
      anamneses.push({
        id: 'anm-' + String(++seqAnm).padStart(4, '0'), pacienteId: p.id, tipo, servicoId: 'sv-nape', profissionalId: prof,
        data: U.addDias(hoje, -U.intBetween(rand, 20, 260)),
        respostas: responderInstrumento(rand, tipo, p),
        criadoEm: Date.now(), atualizadoEm: Date.now()
      });
    });
  });

  anamneses.forEach((a) => {
    const inst = instrumentos.obter(a.tipo);
    log(a.profissionalId, 'registrou_anamnese', 'anamnese', a.id, a.pacienteId,
      inst ? inst.rotulo : '', U.diffDias(a.data));
  });

  return {
    servicos: SERVICOS.map((s) => JSON.parse(JSON.stringify(s))),
    usuarios: USUARIOS.map((u) => JSON.parse(JSON.stringify(u))),
    pacientes,
    filas,
    atendimentos: U.ordenarPor(atendimentos, (a) => a.data),
    anamneses,
    alertas,
    logs: U.ordenarPor(logs, (l) => l.timestamp, true)
  };
}
