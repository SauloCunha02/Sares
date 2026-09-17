/* SARES — Tipos de domínio. Espelham 1:1 os campos de js/data/store.js
   (levantados por leitura direta do código original) — qualquer campo que
   faltar aqui é uma funcionalidade perdida na migração, então esta lista é
   a fonte da verdade para o schema do Firestore. */

export type Perfil = 'recepcao' | 'profissional' | 'coordenador' | 'gestor';

export interface Servico {
  id: string;
  sigla: string;
  nome: string;
  cor: string;
  secretaria: string;
  endereco: string;
  especialidades: string[];
}

export interface Usuario {
  id: string; // id do documento — estável, legível (ex.: "u-01"), independente do UID do Firebase Auth
  nome: string;
  perfil: Perfil;
  servicoId: string | null;
  especialidade: string | null;
  conselho: string | null;
  avatarCor: string | null;
  email: string;
  senha: string; // só existe no protótipo (senha única de demo); não é lido do Firestore em produção
  ativo: boolean;
  authUid?: string | null; // liga este documento à conta de Firebase Auth — ver AuthContext.tsx
}

export interface Responsavel {
  nome: string;
  cns: string;
  dataNascimento: string;
  parentesco: string;
  telefone: string;
}

export interface Endereco {
  logradouro: string;
  numero: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  zona: string;
}

export interface DadosFamiliares {
  numeroIrmaos: string;
  pessoasResidencia: string;
  situacaoConjugalPais: string;
  escolaridadeMae: string;
  ocupacaoMae: string;
  escolaridadePai: string;
  ocupacaoPai: string;
}

export interface Medicacao {
  nome: string;
  dosagem: string;
  prescritor: string;
}

export interface ConsentimentoLGPD {
  concedido: boolean;
  data: string;
  responsavel: string;
  finalidade: string;
}

export interface Paciente {
  id: string;
  nomeCompleto: string;
  nomeSocial: string;
  cns: string;
  cpf: string;
  dataNascimento: string;
  sexo: string;
  cor: string;
  nomeMae: string;
  nomePai: string;
  responsavel: Responsavel;
  telefone: string;
  endereco: Endereco;
  naturalidade: string;
  dadosFamiliares: DadosFamiliares;
  apsReferencia: string;
  escola: string;
  serie: string;
  turno: string;
  turma: string;
  hipoteseDiagnostica: string;
  nivelSuporte: string;
  medicacoes: Medicacao[];
  queixaInicial: string;
  numeroProntuario: string;
  dataAbertura: string;
  consentimentoLGPD: ConsentimentoLGPD;
  criadoPor: string | null;
  criadoEm: number;
  atualizadoEm: number;
  statusRegistro: 'ativo' | 'mesclado';
  mescladoEm?: string | null;
  prontuariosMesclados?: string[];
}

export type Prioridade = 'URGENTE' | 'CURTO PRAZO' | 'LISTA DE ESPERA';
export type StatusFila = 'aguardando' | 'agendado' | 'concluido' | 'consolidado' | 'alta' | 'desistencia';
export type OrigemFila = 'espontanea' | 'escola' | 'encaminhamento' | 'busca_ativa' | 'continuidade';

export interface FilaItem {
  id: string;
  pacienteId: string;
  servicoId: string;
  especialidade: string;
  prioridade: Prioridade;
  status: StatusFila;
  origem: OrigemFila;
  encaminhamentoOrigemId: string | null;
  dataEntrada: string;
  dataAgendada: string | null;
  horarioAgendado?: string;
  posicao: number;
  observacao: string;
}

export interface EncaminhamentoRegistrado {
  servicoId: string;
  especialidade: string;
  prioridade: Prioridade;
  motivo: string;
}

export type TipoAtendimento = 'primeiro_atendimento' | 'avaliacao' | 'sessao' | 'retorno' | 'grupo';
export type Presenca = 'compareceu' | 'faltou' | 'justificou';

export interface Atendimento {
  id: string;
  pacienteId: string;
  servicoId: string;
  profissionalId: string;
  especialidade: string;
  tipo: TipoAtendimento;
  data: string;
  horario: string;
  numeroSessao: number;
  presenca: Presenca;
  motivoAusencia: string;
  objetivoSessao: string;
  evolucao: string;
  condutas: string;
  encaminhamentos: EncaminhamentoRegistrado[];
  registradoEm: number;
  filaItemId?: string | null;
}

export type TipoAnamnese = 'psicologica' | 'psicopedagogica' | 'educacao_fisica';

export interface Anamnese {
  id: string;
  pacienteId: string;
  tipo: TipoAnamnese;
  servicoId: string;
  profissionalId: string;
  data: string;
  respostas: Record<string, unknown>;
  criadoEm: number;
  atualizadoEm: number;
}

export type TipoAlerta = 'cadastro' | 'atendimento';
export type StatusAlerta = 'aberto' | 'mesclado' | 'descartado';

export interface Alerta {
  id: string;
  tipo: TipoAlerta;
  pacienteIds: string[];
  score: number;
  criterios: string[];
  status: StatusAlerta;
  detectadoEm: number;
  resolvidoPor: string | null;
  resolvidoEm: number | null;
  observacao: string;
  filaIds?: string[];
}

export interface LogEntry {
  id: string;
  usuarioId: string | null;
  acao: string;
  entidade: string | null;
  entidadeId: string | null;
  pacienteId: string | null;
  timestamp: number;
  detalhe: string;
  ip: string;
}

export interface Indicadores {
  periodo: number;
  servicoId: string | null;
  pacientesAtivos: number;
  pacientesAtivosAnterior: number;
  atendimentos: number;
  atendimentosAnterior: number;
  comparecimento: number;
  comparecimentoAnterior: number;
  faltas: number;
  esperaMedia: number;
  naFila: number;
  urgentes: number;
  encaminhamentosAtivos: number;
  duplicidadesAbertas: number;
  duplicidadesResolvidas: number;
  atendimentosLista: Atendimento[];
}

export interface PontoSerieMensal {
  rotulo: string;
  chave: string;
  total: number;
  compareceu: number;
  faltou: number;
  porServico: Record<string, Atendimento[]>;
}
