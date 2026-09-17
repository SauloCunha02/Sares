# SARES — Especificação de Construção

**Sistema de Gestão do Cuidado a Pessoas com Transtorno do Espectro Autista (TEA)**
Rede Pública Municipal de Saúde — Crateús / CE

> Documento de especificação para implementação. Hackathon BNB — FIT 2026 / UFC Crateús / Prefeitura de Crateús.
> Versão 1.0 — protótipo de alta fidelidade com dados mockados.

---

## 0. Contexto e objetivo

A rede municipal de Crateús não possui sistema informatizado para gerenciar o cuidado a pessoas com TEA. Hoje o controle de filas é feito **em cadernos de papel**, cada profissional preenche **sua própria ficha** (com a identificação do paciente repetida em todas), não existe prontuário único, e os cinco serviços da rede — **NASF, NAPE, CREAES, Casa Mais Azul e CRASF** — não compartilham informação.

O SARES resolve as quatro frentes exigidas pelo desafio:

| # | Frente | Como o SARES resolve |
|---|---|---|
| 1 | Gestão informatizada das filas | Filas por serviço, priorizáveis, com tempo de espera visível |
| 2 | Identificação de duplicidade | Motor de deduplicação no cadastro + detector de sobreposição de atendimentos |
| 3 | Histórico sistemático e contínuo | Linha do tempo única por paciente, com presença/falta em cada ato |
| 4 | Integração entre os serviços | Encaminhamento que gera automaticamente fila no serviço de destino |

**Nome:** SARES — Sistema de Acompanhamento em Rede da pessoa com TEA. A identidade visual é o girassol: raízes verdes que sustentam o acompanhamento contínuo, pétalas voltadas para a pessoa atendida, com a peça de quebra-cabeça (símbolo do TEA) no centro.

---

## 1. Restrições técnicas (obrigatórias)

1. **HTML + CSS + JavaScript puros.** Sem React, sem Vue, sem build step, sem bundler, sem `npm install`.
2. **Zero dependências externas.** Nenhum CDN de biblioteca. Ícones em **SVG inline**. Gráficos desenhados com **SVG ou Canvas escritos à mão**.
3. **Sem ES Modules.** Usar `<script>` clássicos carregados em ordem, com namespace global `SARES`. Motivo: `type="module"` falha ao abrir via `file://` por política de CORS, e o protótipo precisa funcionar com **duplo clique no `index.html`**, sem servidor.
4. **Fonte:** Google Fonts (`Inter`) via `<link>`, **com fallback para a stack de sistema** caso não haja internet no momento do pitch. Este é o único recurso externo permitido.
5. **Persistência:** `localStorage` sob a chave `sares.db.v1`. Se estiver vazia ou corrompida, recarregar automaticamente a seed. Toda leitura/escrita em `try/catch` — o app deve renderizar corretamente mesmo com storage bloqueado.
6. **SPA com roteamento por hash** (`#/pacientes`, `#/paciente/:id`, ...). Deve sobreviver a um F5.
7. **Responsivo de verdade**, de 360px a 1920px. Mobile-first nas telas de atendimento; tabela densa nas telas de gestão.
8. **Idioma:** todo o produto em **português do Brasil**.
9. **Acessibilidade:** navegável por teclado, `aria-label` nos botões de ícone, foco visível, contraste mínimo AA. Tema claro apenas (não implementar dark mode).

---

## 2. Design system

### 2.1 Tokens de cor

Definir como custom properties em `:root`, em `css/tokens.css`.

```css
:root {
  /* Marca — paleta do girassol */
  --atlas-primary:        #4A6B48;  /* verde oliva — cor principal */
  --atlas-primary-hover:  #3D5A3B;
  --atlas-primary-active: #314A2F;
  --atlas-primary-soft:   #E8EEE6;  /* fundo de badge, linha selecionada */
  --atlas-primary-border: #C9D6C5;

  --atlas-secondary:      #719560;  /* verde folha — cor secundária */
  --atlas-secondary-hover:#5F7F50;
  --atlas-secondary-soft: #EEF3EA;

  --atlas-accent:         #F5C827;  /* amarelo dourado — pétalas, destaque */
  --atlas-accent-dark:    #F0AB18;  /* amarelo âmbar */

  /* Superfícies */
  --atlas-bg:             #F7F8F6;  /* fundo principal — branco suave */
  --atlas-surface:        #FFFFFF;
  --atlas-surface-alt:    #FBFCFA;
  --atlas-border:         #E3E7E2;
  --atlas-border-strong:  #CBD2CB;

  /* Texto */
  --atlas-text:           #1D2A2C;
  --atlas-text-muted:     #5F6E6D;
  --atlas-text-faint:     #8B9795;
  --atlas-text-on-primary:#FFFFFF;

  /* Semânticas — harmonizadas com a paleta, nunca cores puras saturadas */
  --atlas-danger:         #B9544A;  /* urgente, duplicidade crítica, falta */
  --atlas-danger-soft:    #F7EAE8;
  --atlas-warning:        #C98A3C;  /* curto prazo, alerta de revisão */
  --atlas-warning-soft:   #FBF1E3;
  --atlas-success:        #4F8A6B;  /* compareceu, resolvido */
  --atlas-success-soft:   #E9F2EC;
  --atlas-info:           var(--atlas-primary);

  /* Forma */
  --atlas-radius-sm: 6px;
  --atlas-radius:    10px;
  --atlas-radius-lg: 16px;
  --atlas-shadow-sm: 0 1px 2px rgba(29,42,44,.06);
  --atlas-shadow:    0 2px 8px rgba(29,42,44,.08);
  --atlas-shadow-lg: 0 12px 32px rgba(29,42,44,.14);

  /* Ritmo — escala de 4px */
  --sp-1: 4px;  --sp-2: 8px;  --sp-3: 12px; --sp-4: 16px;
  --sp-5: 24px; --sp-6: 32px; --sp-7: 48px; --sp-8: 64px;
}
```

**Regra de uso:** `--atlas-primary` para ações primárias, cabeçalho e navegação ativa. `--atlas-secondary` para acentos, gráficos e estados positivos brandos. Fundo de aplicação sempre `--atlas-bg`; cartões sempre `--atlas-surface` com `1px solid var(--atlas-border)`.

### 2.2 Cores por prioridade de fila

Termos retirados literalmente da ficha do NAPE — **não inventar outros rótulos**:

| Prioridade | Cor | Fundo |
|---|---|---|
| `URGENTE` | `--atlas-danger` | `--atlas-danger-soft` |
| `CURTO PRAZO` | `--atlas-warning` | `--atlas-warning-soft` |
| `LISTA DE ESPERA` | `--atlas-secondary` | `--atlas-secondary-soft` |

### 2.2.1 Paleta dos gráficos (validada)

As 5 cores de serviço **reprovam** como paleta categórica de gráfico (ΔE de 5,5 entre as mais
próximas, indistinguíveis mesmo com visão normal). Elas seguem em uso apenas nos *chips* da
interface, onde vêm sempre acompanhadas da sigla — identidade nunca é transmitida só por cor.

Nos gráficos:

| Uso | Codificação |
|---|---|
| Magnitude (atendimentos por serviço, por bairro, funil, série, sparkline) | **hue única** da marca |
| Prioridade da fila | `#A8443A` / `#D69A24` / `#2E8B6B` — todas as checagens passam |
| Presença (compareceu × faltou) | `#2E8B6B` / `#A8443A` + **textura diagonal** e rótulo direto |

O par de presença fica na faixa mínima de separação para deuteranopia (ΔE 7,1), por isso
nunca aparece sem codificação secundária.

### 2.3 Cores por serviço (identidade de cada equipamento)

| Serviço | Sigla | Cor |
|---|---|---|
| Núcleo Ampliado de Saúde da Família | NASF | `#397D87` |
| Núcleo de Atendimento Pedagógico Especializado | NAPE | `#7FA89A` |
| Centro de Referência em Educação Especial | CREAES | `#5C8B94` |
| Casa Mais Azul | CASA AZUL | `#4A7C9B` |
| Centro de Referência de Assistência Social à Família | CRASF | `#8CA37E` |

### 2.4 Tipografia

- Família: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- Escala: `32/24/20/16/14/13/12 px`; títulos em 600, corpo em 400, rótulos e badges em 500.
- Altura de linha: 1.5 no corpo, 1.25 em títulos.
- Números de tabela: `font-variant-numeric: tabular-nums`.

### 2.5 Componentes a construir

`Botão` (primário, secundário, fantasma, perigo, ícone) · `Campo de texto` · `Select` · `Radio/Checkbox` · `Data` · `Badge` · `Chip de prioridade` · `Card` · `Tabela com ordenação` · `Modal` · `Toast` · `Abas` · `Avatar com iniciais` · `Linha do tempo vertical` · `Barra de busca com sugestões` · `Estado vazio` · `Skeleton de carregamento` · `Barra de progresso` · `Gráfico de barras (SVG)` · `Gráfico de rosca (SVG)` · `Sparkline (SVG)`

---

## 3. Modelo de dados (mock)

Namespace `SARES.db`. Persistido em `localStorage`.

```js
servico = {
  id, sigla, nome, cor, secretaria,        // "Saúde" | "Educação" | "Assistência Social"
  endereco, especialidades: [String]
}

usuario = {
  id, nome, email, senha,                  // senha em texto plano — É UM MOCK
  perfil,                                  // 'recepcao' | 'profissional' | 'coordenador' | 'gestor'
  servicoId, especialidade,                // ex.: 'Fonoaudiologia'
  conselho,                                // ex.: 'CRFa 5-1234'
  avatarCor, ativo
}

paciente = {
  id, nomeCompleto, nomeSocial, cns, cpf, dataNascimento, sexo, cor,
  nomeMae, nomePai, responsavel: { nome, cns, dataNascimento, parentesco, telefone },
  telefone, endereco: { logradouro, numero, bairro, municipio, uf, cep, zona },
  apsReferencia,                           // unidade de referência
  naturalidade,                            // fichas A.2 e A.3
  dadosFamiliares: {                       // fichas A.2 e A.3 — base da avaliação do CRASF
    numeroIrmaos, pessoasResidencia, situacaoConjugalPais,
    escolaridadeMae, ocupacaoMae, escolaridadePai, ocupacaoPai
  },
  escola, serie, turno, turma,
  hipoteseDiagnostica,                     // ex.: 'F84.0 — Autismo infantil'
  nivelSuporte,                            // 'Nível 1' | 'Nível 2' | 'Nível 3' | 'Em investigação'
  medicacoes: [{ nome, dosagem, prescritor }],
  numeroProntuario, dataAbertura,
  consentimentoLGPD: { concedido, data, responsavel, finalidade },
  criadoPor, criadoEm, atualizadoEm,
  statusRegistro                           // 'ativo' | 'mesclado' | 'arquivado'
}

filaItem = {
  id, pacienteId, servicoId, especialidade,
  prioridade,                              // 'URGENTE' | 'CURTO PRAZO' | 'LISTA DE ESPERA'
  status,                                  // 'aguardando' | 'agendado' | 'concluido'
                                           // | 'desistencia' | 'alta' | 'consolidado'
  origem,                                  // 'espontanea' | 'escola' | 'encaminhamento'
                                           // | 'busca_ativa' | 'continuidade'
  encaminhamentoOrigemId,                  // null se entrada direta
  dataEntrada, dataAgendada, horarioAgendado, posicao, observacao
}

/* Fichas A.2, A.3 e A.4 do anexo. O formato das respostas é ditado pelo
   catálogo em SARES.instrumentos — nenhuma tela conhece os campos pelo nome. */
anamnese = {
  id, pacienteId,
  tipo,                                    // 'psicologica' | 'psicopedagogica' | 'educacao_fisica'
  servicoId, profissionalId, data,
  respostas: { [nomeDoCampo]: String | [String] },
  criadoEm, atualizadoEm
}

atendimento = {
  id, pacienteId, servicoId, profissionalId, especialidade,
  tipo,                                    // 'primeiro_atendimento' | 'retorno' | 'avaliacao' | 'sessao' | 'grupo'
  data, horario, numeroSessao,
  presenca,                                // 'compareceu' | 'faltou' | 'justificou' | 'cancelado'
  motivoAusencia,
  objetivoSessao, evolucao, condutas,
  encaminhamentos: [{ servicoId, especialidade, prioridade, motivo }],
  registradoEm
}

alertaDuplicidade = {
  id, tipo,                                // 'cadastro' | 'atendimento'
  pacienteIds: [], score, criterios: [],   // ex.: ['CNS idêntico', 'Nome 94% similar']
  status,                                  // 'aberto' | 'confirmado' | 'descartado' | 'mesclado'
  detectadoEm, resolvidoPor, resolvidoEm, observacao
}

logAuditoria = {
  id, usuarioId, acao,                     // 'login'|'visualizou_prontuario'|'criou_paciente'|...
  entidade, entidadeId, pacienteId, timestamp, detalhe, ip
}
```

### 3.1 Volume da seed

| Entidade | Quantidade | Observações |
|---|---|---|
| Serviços | 5 | NASF, NAPE, CREAES, Casa Mais Azul, CRASF |
| Usuários | 19 | recepção e coordenação nos 5 serviços, sem exceção — ver seção 4 |
| Pacientes | 42 | nomes brasileiros plausíveis, idades de 2 a 17 anos |
| Itens de fila | ~60 | distribuídos entre os 5 serviços e as 3 prioridades |
| Atendimentos | ~240 | espalhados pelos últimos 6 meses |
| Alertas de duplicidade | 4 abertos | ver 3.2 |
| Logs de auditoria | ~120 | gerados a partir das ações da seed |

**Realismo obrigatório:** bairros reais de Crateús (Centro, Altamira, Venâncios, Mirante, Alto Brilhante, Fátima, São Vicente, Santa Luzia), zona rural com distritos (Realejo, Ibiapaba, Tucuns, Montenebo). Escolas com nomes plausíveis de rede municipal. Taxa de falta entre 12% e 22% — é a realidade do serviço e sustenta o painel de indicadores.

### 3.2 Duplicidades plantadas na seed (essenciais para o demo)

1. **`Maria Eduarda Alves Lima` (NASF) × `Maria Eduarda A. Lima` (NAPE)** — mesmo CNS, mesma data de nascimento. Score 100. Caso de mescla óbvia.
2. **`João Pedro Sousa Marinho` × `Joao Pedro S. Marinho`** — sem CNS em um dos registros, nome 91% similar, mesma data de nascimento e mesma mãe. Score 88.
3. **`Ana Beatriz Ferreira` × `Ana Beatriz Ferreira Gomes`** — datas de nascimento diferentes, mães diferentes. Score 62 → **falso positivo proposital**, para demonstrar a tela de descarte de alerta.
4. **Sobreposição de atendimento:** `Lucas Gabriel Moreira` está em fila de **Fonoaudiologia no NAPE** e de **Fonoaudiologia no CREAES** simultaneamente. Score 100 no detector de sobreposição.

### 3.3 Instrumentos de anamnese — `SARES.instrumentos`

As fichas **A.2**, **A.3** e **A.4** do anexo são descritas como dados, não como código
(`js/data/instrumentos.js`). São **96 campos** em três instrumentos, organizados nas mesmas
seções das fichas de papel. A tela de anamnese percorre o catálogo e monta o formulário —
acrescentar uma pergunta é editar a tabela, não a interface.

```js
instrumento = {
  id, rotulo, ficha,                       // ex.: 'A.3'
  profissoes: [String],                    // especialidades que usam esta ficha
  resumo, mostrarConcomitantes,            // A.4 monta a tabela de atendimentos da rede
  secoes: [{ titulo, campos: [{
    nome, rotulo, obrigatorio, dica,
    tipo,                                  // 'texto'|'area'|'numero'|'selecao'|'multipla'
    opcoes: [String], linhas
  }]}]
}
```

**Regras que ligam a ficha ao resto do sistema:**

- A **identificação do aluno não é campo do formulário** — vem do cadastro único. É este o
  ponto que resolve o problema descrito na seção 2 do documento.
- A ficha **A.4** monta sozinha a tabela de *atendimentos concomitantes* a partir das filas e
  atendimentos da rede. No papel, a educadora física preenche perguntando à família.
- A triagem da ficha **A.3** (`necessidadeAcompanhamento`) **repriroriza as filas** do paciente
  naquele serviço ao salvar, com registro em auditoria.
- Anamnese de outro serviço segue a regra de sigilo da evolução (ver seção 4).

### 3.4 Validação de documentos

`U.cnsValido()` e `U.cpfValido()` conferem o dígito verificador. O CNS é a chave mais forte do
motor de duplicidade: aceitar um número inválido significa admitir um cadastro que nunca vai
casar com o registro certo da mesma pessoa. A seed e o preenchimento automático **geram
documentos válidos** (`U.gerarCNSValido`, `U.gerarCPFValido`) — passam pela mesma régua exigida
do operador.

### 3.5 Premissas assumidas na ausência de informação

O documento confirma "o que faz" e "dados que registra" apenas para **NASF** e **NAPE**. O que
está abaixo foi inferido e **precisa de validação da Secretaria** — não são requisitos.

| Premissa | Situação | Onde ajustar |
|---|---|---|
| Especialidades de **CREAES**, **Casa Mais Azul** e **CRASF** | Inferidas do nome e da natureza de cada equipamento | `js/data/seed.js` → `SERVICOS` |
| **Nível de suporte** (1, 2, 3) | Classificação clínica usual em TEA, **não presente** em nenhuma ficha do anexo. Mantida por ser útil à priorização; é opcional | `js/data/seed.js` → `NIVEIS` |
| **Quem falta não perde a vez** | A pessoa permanece na fila com a data de entrada original. Mandar para o fim penalizaria quem tem menos transporte e menos rede de apoio — a população que o documento chama de prioritária | `js/data/store.js` → `registrarAtendimento` |

---

## 4. Perfis e permissões

Regra geral: **estar autorizado a uma ação não dá alcance sobre a rede inteira.** Uma
segunda camada de escopo (serviço, especialidade, ou nenhum) limita ONDE cada perfil pode
agir. Perder de vista essa segunda camada foi a origem de quase todo achado de escopo
listado em USABILIDADE.md — a permissão sozinha (`SARES.auth.pode(acao)`) nunca é
suficiente sem o método de escopo correspondente (`podeInserirNoServico`,
`podeAgendarNestaFila`, `podeResolverAlerta`, `podeVerEvolucao`, `podeGerenciarFila` em
filas.js).

### 4.1 Matriz de capacidades

| Capacidade | Recepção | Profissional | Coordenação | Gestão |
|---|---|---|---|---|
| Cadastrar paciente | ✅ próprio serviço | ❌ | ✅ próprio serviço | ❌ |
| Inserir em fila | ✅ próprio serviço | ✅ próprio serviço | ✅ próprio serviço | ❌ |
| Ver fila | ✅ só o próprio serviço | ✅ só a própria especialidade | ✅ escolhe o serviço | ✅ toda a rede |
| Priorizar fila (mover/remover) | ❌ | ❌ | ✅ só o próprio serviço | ✅ toda a rede |
| Agendar / reagendar | ✅ próprio serviço | ✅ só a própria especialidade | ✅ próprio serviço | ❌ |
| Registrar atendimento | ❌ | ✅ só a própria especialidade | ✅ próprio serviço | ❌ |
| Registrar anamnese | ❌ | ✅ | ✅ | ❌ |
| Ver evolução clínica | ❌ | ✅ só do próprio serviço (mascarada fora dele) | ✅ só do próprio serviço | ❌ |
| Encaminhar a outro serviço | ❌ | ✅ qualquer serviço (é o próprio ato) | ✅ qualquer serviço | ❌ |
| Ver Duplicidades | ✅ só o próprio serviço | ❌ **nenhuma tela, nenhuma ação** | ✅ só o próprio serviço | ✅ toda a rede |
| Resolver Duplicidades | ❌ | ❌ | ✅ só o próprio serviço | ✅ toda a rede |
| Ver Indicadores | ❌ | ❌ | ✅ só o próprio serviço | ✅ toda a rede |
| Ver Auditoria | ❌ | ❌ | ❌ | ✅ |
| Cadastrar/editar usuário | ❌ | ❌ | ✅ recepção/profissional do próprio serviço | ✅ qualquer perfil, qualquer serviço |

**Por que Profissional não tem NENHUMA relação com Duplicidades** (nem ver, nem um banner
de aviso no início): a tela só tem duas ações — Mesclar e Descartar — e nenhuma das duas é
dele. Mostrar a lista mesmo sem poder agir seria dado de outros serviços sem necessidade de
saber, e um aviso sem link nem ação seria ruído. Se existe uma sobreposição envolvendo o
paciente que ele atende, o alerta já aparece dentro do próprio prontuário
(`pacienteDetalhe.js`), que ele acessa legitimamente por estar atendendo ali.

**Por que "inserir em fila" e "agendar" são escopados ao próprio serviço:** inserir alguém
diretamente na fila de OUTRO serviço (ex.: recepção do NAPE inserindo na fila da Casa Mais
Azul) não é o papel de um cadastro ou de um "adicionar à fila" solto — é papel do
**encaminhamento**, registrado dentro de um atendimento, que continua livre para qualquer
serviço porque é exatamente o mecanismo de integração da rede (seção 4.4 do documento da
SEPLATI). A diferença: encaminhar é uma decisão clínica documentada, com motivo; inserir
direto não tem esse rastro.

**"Resolver Duplicidades" não é uma ação só — tem risco desigual por dentro.** Numa
sobreposição entre dois serviços (mesma especialidade, dois serviços ao mesmo tempo), três
ações são possíveis e só uma delas fecha recurso de um lado específico:

| Ação | Fecha vaga de um serviço específico? | Quem decide |
|---|---|---|
| Mesclar cadastro | Não — nada é apagado, histórico preservado | Qualquer coordenador tocado pelo alerta |
| Manter os dois (descartar) | Não fecha vaga, mas decide o desfecho pelos DOIS serviços de uma vez | **Só a gestão** (`auth.podeManterSobreposicao`) |
| **Cancelar este vínculo** | **Sim — a vaga daquele serviço fecha** | **Só a coordenação DAQUELE serviço** (`auth.podeCancelarVinculoDeSobreposicao`) |

Coordenar o NAPE não dá autoridade para decidir se o CREAES abre mão da vaga dele — nem para
decidir, em nome dos dois serviços, que a sobreposição "está OK assim" (Manter os dois).
Cada coordenador só resolve o que é seu: mescla cadastro (não apaga nada) ou cancela o
PRÓPRIO vínculo. Se os dois coordenadores discordam (nenhum cancela o próprio vínculo), o
alerta permanece aberto e visível para os dois — a gestão arbitra.

### 4.2 Gestão de usuários é escopada por serviço, não centralizada

A rede atravessa três secretarias diferentes (NASF/Casa Mais Azul — Saúde; NAPE/CREAES —
Educação; CRASF — Assistência Social) — uma gestão municipal única não tem como acompanhar
cada contratação ou desligamento em cada uma. Por isso cada coordenador cadastra e desativa
a própria equipe (perfis `recepcao` e `profissional`, sempre no próprio serviço); a gestão
mantém alcance sobre a rede inteira, inclusive para criar outros coordenadores. A seed
reflete isso: **os 5 serviços têm recepção e coordenação própria**, sem exceção — sem isso,
CREAES e CRASF ficariam sem ninguém além da gestão para resolver duplicidade ou cadastrar
equipe, recentralizando exatamente o que este modelo descentraliza. Ver seção 5.12.

**Regra de visibilidade clínica (LGPD):** um profissional vê a **linha do tempo completa** do paciente (datas, serviços, presença, encaminhamentos), mas o conteúdo clínico de um atendimento de outro serviço aparece **mascarado**, com o botão *"Solicitar acesso — registra justificativa em auditoria"*. Clicar revela o conteúdo, exige uma justificativa em texto e **grava um log de auditoria**. Isto precisa estar visível no pitch.

O conteúdo clínico protegido são **os três campos juntos** — `objetivoSessao`, `evolucao` e
`condutas`. Mascarar apenas a evolução não protege nada: o objetivo da sessão revela a linha
de cuidado de outro serviço com a mesma clareza. A **anamnese** de outro serviço segue a
mesma regra.

**Guarda de serviço:** o `servicoId` de um atendimento vem da fila indicada na URL. A tela
confere se essa fila pertence ao serviço em que o profissional está lotado — sem isso,
bastaria trocar o parâmetro para registrar atendimento em nome de serviço alheio. A tentativa
é registrada como `acesso_negado` na auditoria.

---

## 5. Telas

### 5.1 Login — `#/login`

- Fundo `--atlas-bg`, cartão central, logo SARES.
- Campos e-mail e senha + botão **Entrar**.
- **Bloco "Acesso rápido — ambiente de demonstração"** com 4 cartões clicáveis, um por perfil, cada um com nome, cargo, serviço e avatar. Um clique faz login direto, sem digitar nada.
- Botão **⚡ Preencher** ao lado do campo de senha, que preenche e-mail e senha do último perfil selecionado.
- Rodapé: "Ambiente de demonstração — dados fictícios. Hackathon BNB / FIT 2026."

### 5.2 Shell da aplicação

- **Barra lateral** (desktop ≥1024px) com logo, navegação por ícone + rótulo, e bloco do usuário no rodapé (avatar, nome, perfil, serviço, sair). Recolhível para 64px.
- **Barra inferior** (mobile <1024px) com 5 itens principais; o restante em menu "Mais".
- **Cabeçalho** com título da tela, busca global (atalho `/`), sino de notificações com contador de alertas abertos, e **selo de perfil ativo**.
- Navegação filtrada por perfil, conforme a seção 4.

### 5.3 Início — `#/inicio`

Conteúdo muda por perfil:

- **Recepção:** botão gigante *Novo cadastro*, busca rápida, "aguardando hoje", presenças a confirmar.
- **Profissional:** "Minha agenda de hoje", próximos da fila, atendimentos pendentes de registro, contador de faltas da semana.
- **Coordenador:** tamanho das filas do serviço, tempo médio de espera, alertas de duplicidade abertos, taxa de falta.
- **Gestor:** os 6 indicadores da rede, gráfico de atendimentos por serviço, mapa de calor por bairro, alertas críticos.

### 5.4 Pacientes — `#/pacientes`

- Busca por nome, CNS, CPF, data de nascimento ou nome da mãe, com resultado em tempo real (sem botão buscar).
- Filtros: serviço, prioridade, faixa etária, nível de suporte, status, zona.
- Tabela: Nome · Idade · CNS · Serviços vinculados (chips coloridos) · Última visita · Status. Ordenável por qualquer coluna.
- Badge **⚠ Possível duplicidade** na linha quando houver alerta aberto.
- Em mobile, a tabela vira lista de cartões.

### 5.5 Cadastro de paciente — `#/paciente/novo`

**A tela mais importante do protótipo.** Formulário em 4 etapas com indicador de progresso:

1. **Identificação** — nome completo, nome social, CNS, CPF, data de nascimento, sexo, cor/raça, nome da mãe, nome do pai
2. **Contato e endereço** — telefone, logradouro, nº, bairro, município, UF, CEP, zona (urbana/rural), APS de referência
3. **Responsável e escola** — nome, CNS, data de nascimento, parentesco, telefone do responsável; escola, série, turno, turma
4. **Dados clínicos e consentimento** — hipótese diagnóstica (CID), nível de suporte, medicações em uso, serviço de entrada, especialidade, prioridade, origem do encaminhamento + **checkbox de consentimento LGPD** com texto da finalidade

**Verificação de duplicidade em tempo real:** ao sair do campo CNS, ou ao ter nome + data de nascimento preenchidos, executar `SARES.dedup.buscarSimilares()` e exibir um painel inline:

```
┌──────────────────────────────────────────────────────────────┐
│ ⚠  Encontramos 1 cadastro semelhante                          │
│                                                               │
│  Maria Eduarda Alves Lima · 8 anos · NASF                     │
│  CNS 898004... · Mãe: Francisca Alves Lima                    │
│  Similaridade 100%  ·  CNS idêntico, nome idêntico            │
│                                                               │
│  [ Vincular a este cadastro ]  [ É outra pessoa, continuar ]  │
└──────────────────────────────────────────────────────────────┘
```

Score ≥ 95 **bloqueia** o botão Salvar até o operador escolher uma das duas opções. Score entre 80 e 94 apenas alerta.

**Botão `⚡ Preencher automaticamente`** fixo no topo do formulário, ao lado do título, presente em todas as 4 etapas. Preenche **todas** as etapas de uma vez com um paciente fictício coerente (nome, CNS válido em formato, endereço de Crateús, responsável, escola). Um segundo modo, **`⚡ Preencher com duplicata`**, preenche com dados que disparam o alerta de duplicidade — é o que você usa no pitch para demonstrar a frente 2.

### 5.6 Prontuário do paciente — `#/paciente/:id`

Cabeçalho fixo: avatar, nome, idade, CNS, hipótese diagnóstica, nível de suporte, chips dos serviços vinculados, botões *Novo atendimento* e *Encaminhar*.

Abas:

1. **Linha do tempo** — **o histórico único que substitui o caderno de papel.** Timeline vertical em ordem cronológica inversa, agrupada por mês. Cada item traz: ponto colorido com a cor do serviço, data e hora, serviço + especialidade + profissional, selo de presença (✓ compareceu / ✗ faltou / ~ justificou), o conteúdo clínico (mascarado por inteiro se for de outro serviço) e setas de encaminhamento gerado. Filtro por serviço.
2. **Dados cadastrais** — ficha A.1 do NASF completa, mais naturalidade e composição familiar das fichas A.2 e A.3. Editáveis por recepção e coordenador.
3. **Anamneses** — **as fichas A.2, A.3 e A.4 do anexo.** Uma por tipo e por serviço, com a identificação vinda do cadastro único. Anamnese de outro serviço fica sob sigilo, como a evolução.
4. **Filas ativas** — em quais filas o paciente está, posição, tempo de espera, prioridade, data agendada.
5. **Encaminhamentos** — origem → destino, status (aguardando, aceito, concluído), tempo de resolução.
6. **Privacidade e acessos** — consentimento, direitos do titular e quem acessou o prontuário.

### 5.6.1 Anamnese — `#/anamnese/:id?tipo=`

Formulário gerado a partir de `SARES.instrumentos` (seção 3.3). Estrutura:

1. **Identificação** — somente leitura, vinda do cadastro. Selo *"preenchida pelo sistema"*.
2. **Atendimentos concomitantes** — apenas na ficha A.4, montada a partir da rede.
3. **Seções do instrumento** — uma por seção da ficha de papel.
4. Botão `⚡ Preencher` percorre o catálogo, então campos novos já nascem preenchíveis.

Salvar substitui a versão anterior do mesmo tipo no mesmo serviço (o profissional revisa a
própria ficha) e, na ficha A.3, aplica a triagem às filas do paciente naquele serviço.

### 5.7 Filas — `#/filas`

- Seletor de serviço no topo (o profissional vê apenas o seu; coordenador e gestor veem todos).
- Três colunas por prioridade (**URGENTE**, **CURTO PRAZO**, **LISTA DE ESPERA**), estilo kanban, empilhando em mobile.
- Cartão de fila: nome, idade, especialidade, dias de espera, origem, badge de sobreposição se houver.
- **Arrastar e soltar** entre colunas altera a prioridade e grava auditoria. Fallback obrigatório: menu de três pontos com *Alterar prioridade*, porque drag-and-drop não funciona bem em toque.
- **Agendar / reagendar** pelo mesmo menu. O cartão mostra a data marcada. Agendar não tira ninguém da fila: a espera acumulada desde a entrada é preservada.
- Botão **Chamar para atendimento** no cartão → vai direto para 5.8.
- Indicador de tempo médio de espera por coluna.

### 5.8 Registrar atendimento — `#/atendimento/novo?paciente=:id`

1. **Presença** — três botões grandes: *Compareceu* · *Faltou* · *Justificou ausência*. Se faltou ou justificou, abre campo de motivo e o restante do formulário é ocultado.
2. **Dados da sessão** — tipo, data, horário, número da sessão (automático), objetivo da sessão.
3. **Evolução** — textarea, mais campo de condutas.
4. **Próxima sessão** — *Agendar retorno* (data e hora) ou *Alta do serviço* (com motivo). O atendimento nunca fica sem desfecho: TEA é acompanhamento continuado e a ficha A.5 do anexo é preenchida a cada sessão.
5. **Encaminhamentos** — botão *Adicionar encaminhamento* → serviço de destino, especialidade, prioridade, motivo. Permite mais de um. O destino **pode ser o próprio serviço** (encaminhamento interno, como prevê a ficha A.3); o que se impede é encaminhar para a própria especialidade.

Ao salvar: cria o `atendimento`, atualiza o `filaItem` para `concluido`, **cria um novo `filaItem` em cada serviço de destino**, aplica o agendamento ou a alta, e grava auditoria. Toast de confirmação nomeando explicitamente o que foi criado — é a prova visível da integração da rede.

**Guarda de serviço:** se a fila indicada na URL pertencer a outro serviço, a tela bloqueia e registra a tentativa (ver seção 4).

**Botão `⚡ Preencher` no topo**, que preenche objetivo, evolução e condutas com texto clínico plausível para a especialidade do profissional logado.

### 5.9 Duplicidades — `#/duplicidades`

Duas abas:

- **Cadastros duplicados** — lista de alertas, cada um com comparação **lado a lado** dos dois registros, campo a campo, com os divergentes destacados em `--atlas-warning` e os idênticos em `--atlas-success`. Score em destaque com a lista de critérios que o geraram. Ações: **Mesclar registros** (abre modal para escolher o valor vencedor campo a campo), **Descartar alerta** (exige justificativa), **Adiar**.

  Ao mesclar, os vínculos de fila são **consolidados**: se os dois cadastros aguardavam a mesma especialidade no mesmo serviço, a pessoa passaria a ocupar duas vagas da mesma fila — e o detector de sobreposição não pegaria, porque ele exige serviços distintos. A consolidação mantém o vínculo mais antigo (a espera acumulada não se perde), conserva a prioridade mais alta entre os dois e registra cada encerramento em auditoria.
- **Sobreposição de atendimentos** — mesmo paciente em fila para a mesma especialidade em dois serviços. Mostra os dois vínculos, datas de entrada, e ação *Cancelar um dos vínculos* com registro de motivo.

Cabeçalho da tela com o **recurso economizado**: "4 duplicidades resolvidas este mês ≈ 12 vagas liberadas na fila".

### 5.10 Indicadores — `#/indicadores`

Seis cartões de KPI no topo: pacientes ativos · atendimentos no mês · taxa de comparecimento · tempo médio de espera · encaminhamentos ativos · duplicidades abertas. Cada um com variação percentual versus o mês anterior e sparkline.

Gráficos (todos em SVG escrito à mão):

1. Barras — atendimentos por serviço nos últimos 6 meses
2. Rosca — distribuição das filas por prioridade
3. Linhas — evolução da taxa de falta ao longo do tempo
4. Barras horizontais — top 8 bairros por número de pacientes
5. Funil — encaminhamentos: gerados → aceitos → atendidos
6. Tabela — tempo médio de espera por especialidade

Filtro por período (30 / 90 / 180 dias) e por serviço. Botão *Exportar CSV* que baixa de verdade, via `Blob`.

### 5.11 Auditoria — `#/auditoria` (somente gestor)

Tabela de logs: data/hora, usuário, perfil, ação, entidade, paciente afetado, detalhe. Filtros por usuário, ação, período e paciente. Destaque em `--atlas-warning` para acessos a prontuário de outro serviço, com a justificativa informada. Exportação CSV.

### 5.12 Configurações — `#/configuracoes`

A mesma tela serve dois escopos diferentes, sem duplicar código:

- **Gestor** (`ver_configuracoes`) — as três abas: **Usuários** (rede inteira, qualquer
  perfil e serviço), **Serviços da rede** (catálogo de especialidades por equipamento) e
  **Ambiente de demonstração** (reiniciar dados, limpar `localStorage`, avançar 30 dias).
- **Coordenador** (`gerenciar_usuarios`, sem `ver_configuracoes`) — cai direto numa versão
  reduzida: só a lista de **Usuários do próprio serviço** ("Equipe do NAPE"), sem as abas
  de Serviços/Demonstração, que são administração de rede. Formulário de cadastro trava o
  serviço no dele e limita o perfil a `recepcao`/`profissional`.

**Formulário de usuário** (criar/editar) — nome, e-mail (sugerido a partir do nome, editável),
perfil, serviço (fixo para coordenador, selecionável para gestor), especialidade (populada
a partir do catálogo do serviço escolhido, oculta para perfis sem especialidade) e conselho
profissional. E-mail duplicado é recusado. Editar um perfil fora do que o ator pode atribuir
(coordenador abrindo o próprio registro, que é `coordenador`) mantém o valor atual como opção
— sem isso o `<select>` renderiza sem nada selecionado e a pessoa é rebaixada em silêncio ao
salvar.

**Defesa em profundidade:** mesmo com o formulário escondendo as opções fora do escopo, o
handler de confirmação recusa perfil ou serviço fora do permitido para quem não é gestor —
mesmo padrão já usado nas guardas de fila (seção 4) e de atendimento.

---

## 6. Fluxo de ouro (roteiro do pitch de 7 minutos)

A aplicação precisa executar esta sequência sem travar e sem recarregar a página:

```
1. Login rápido como RECEPÇÃO
2. Novo cadastro → ⚡ Preencher com duplicata
   → alerta de duplicidade dispara ao vivo          [FRENTE 2 ✓]
   → vincular ao cadastro existente
3. Novo cadastro → ⚡ Preencher automaticamente
   → salvar → paciente entra na fila do NASF
   com prioridade CURTO PRAZO                        [FRENTE 1 ✓]
4. Trocar para PROFISSIONAL (fonoaudióloga do NAPE)
   → fila do serviço → banner de sobreposição
   no paciente Lucas Gabriel                         [FRENTE 2 ✓]
5. Chamar paciente → registrar atendimento
   → Compareceu → ⚡ Preencher → adicionar
   encaminhamento para Terapia Ocupacional no CREAES
   → salvar                                          [FRENTE 3 ✓]
6. Abrir prontuário → linha do tempo mostra o novo
   atendimento E o encaminhamento; ir ao CREAES e
   ver o paciente já na fila, sem ninguém ter
   digitado nada                                     [FRENTE 4 ✓]
7. Trocar para GESTOR → painel de indicadores
   → auditoria mostrando quem acessou o quê          [LGPD ✓]
```

**A troca de perfil precisa ser instantânea.** Incluir um **seletor de perfil no cabeçalho** (visível apenas em modo demonstração) que troca o usuário logado em um clique, sem passar pela tela de login. Sem isso, o pitch de 7 minutos não fecha.

---

## 7. Motor de deduplicação — `SARES.dedup`

### 7.1 Normalização

```
normalizar(s) = s.toLowerCase()
                 .normalize('NFD').replace(/[̀-ͯ]/g, '')  // remove acentos
                 .replace(/[^a-z0-9 ]/g, '')
                 .replace(/\s+/g, ' ').trim()
```

### 7.2 Similaridade de nomes

Implementar **Jaro-Winkler** (favorece prefixos iguais, ideal para nomes) manualmente, em `js/lib/dedup.js`. Retorna 0..1.

Tratar abreviações: `"Maria E. A. Lima"` vs `"Maria Eduarda Alves Lima"` — comparar token a token; se um token tem 1 letra ou 2 com ponto, considerar correspondência quando a inicial bate.

### 7.3 Regras de pontuação

Avaliar em cascata e ficar com o **maior** score:

| Condição | Score |
|---|---|
| CNS idêntico | 100 |
| CPF idêntico | 100 |
| Nome normalizado idêntico **e** data de nascimento idêntica | 97 |
| Similaridade de nome ≥ 0,90 **e** data de nascimento idêntica **e** nome da mãe ≥ 0,90 | 92 |
| Similaridade de nome ≥ 0,85 **e** data de nascimento idêntica | 88 |
| Similaridade de nome ≥ 0,85 **e** nome da mãe ≥ 0,90 | 85 |
| Data de nascimento idêntica **e** nome da mãe idêntico **e** nome ≥ 0,70 | 80 |
| Telefone idêntico **e** nome ≥ 0,80 | 75 |
| Abaixo disso | ignorar |

**Limiares:** `≥ 95` bloqueia o salvamento · `80–94` alerta e permite prosseguir com justificativa · `60–79` apenas informa no formulário, sem gerar alerta.

O limiar inferior é 60 (e não 70) para que o caso de nomes muito parecidos com **datas de
nascimento divergentes** apareça ranqueado ao operador em vez de sumir — é o comportamento
que o falso positivo plantado demonstra.

Retornar sempre a **lista de critérios em texto legível** — `["CNS idêntico", "Nome 94% similar", "Mesma data de nascimento"]` — porque é isso que aparece na interface e é isso que convence a banca.

### 7.4 Sobreposição de atendimentos

Varrer `filaItem` com status `aguardando` ou `agendado`: se o mesmo `pacienteId` aparece com a **mesma especialidade** em `servicoId` diferentes, gerar `alertaDuplicidade` do tipo `atendimento`. Rodar ao carregar o app e após cada inserção em fila.

---

## 8. LGPD — o que precisa ser visível no produto

Não basta citar no slide; a banca avalia "conformidade com a LGPD" como critério de nota. Implementar:

1. **Consentimento** — campo obrigatório no cadastro, com texto de finalidade, data e nome de quem consentiu. Exibido no prontuário com selo verde.
2. **Controle de acesso por perfil e por serviço** — menus e ações realmente escondidos, não apenas desabilitados.
3. **Mascaramento de evolução clínica entre serviços**, com quebra de sigilo mediante justificativa registrada (ver 4).
4. **Trilha de auditoria** de todo acesso a prontuário, gravada e consultável.
5. **Minimização** — listagens mostram nome parcial (`Maria E. A. L.`) e CNS mascarado (`898••••••••1234`); dado completo só ao abrir o registro.
6. **Painel do titular** — no prontuário, aba com "quem acessou seus dados", exportação dos dados do paciente em JSON e botão de solicitação de exclusão (fluxo mockado).
7. **Banner de encerramento de sessão** por inatividade de 15 minutos (pode ser simulado com contador visível).

---

## 9. Modo demonstração

Como o protótipo será avaliado por terceiros, **todo formulário precisa de preenchimento automático**.

### 9.1 Componente `btn-demo-fill`

- Rótulo: `⚡ Preencher`
- Posição: sempre no canto superior direito do cartão de formulário, ao lado do título
- Estilo: botão fantasma com borda `--atlas-primary-border`, texto `--atlas-primary`, fundo `--atlas-primary-soft` no hover
- `aria-label="Preencher formulário com dados de demonstração"`
- Quando há mais de uma variante, vira um botão com menu suspenso (ex.: *Preencher* / *Preencher com duplicata*)

Obrigatório em: login, cadastro de paciente (4 etapas), registro de atendimento, encaminhamento, criação de usuário, e qualquer outro formulário criado.

### 9.2 Barra de demonstração

Faixa fina no topo, fundo `--atlas-secondary-soft`, com:

- Texto: `Ambiente de demonstração — dados fictícios`
- **Seletor de perfil** (troca o usuário logado em um clique)
- Botão **Reiniciar dados**
- Botão **▶ Roteiro guiado**

### 9.3 Roteiro guiado

Painel flutuante no canto inferior direito, recolhível, com os 7 passos da seção 6. Cada passo mostra o texto da ação e um botão *Ir para a tela*, que navega e destaca o elemento com um anel em `--atlas-primary`. Contador `Passo 3 de 7` e botão *Encerrar roteiro*. É a rede de segurança do apresentador.

---

## 10. Estrutura de arquivos

```
atlas/
├── index.html                  # shell único; todas as telas renderizadas via JS
├── SPEC.md                     # este documento
├── README.md                   # como abrir, credenciais, roteiro do pitch
├── CONSISTENCIA.md             # auditoria contra o documento da SEPLATI
├── img/SARES.png               # logotipo — girassol com peça de quebra-cabeça
├── css/
│   ├── tokens.css              # seção 2.1
│   ├── base.css                # reset, tipografia, utilitários
│   ├── components.css          # seção 2.5
│   ├── layout.css              # shell, sidebar, cabeçalho, grid
│   └── screens.css             # estilos específicos por tela
└── js/
    ├── data/
    │   ├── instrumentos.js     # SARES.instrumentos — fichas A.2/A.3/A.4 (seção 3.3)
    │   ├── seed.js             # SARES.seed — todos os dados mockados
    │   └── store.js            # SARES.db — CRUD + localStorage + consultas
    ├── lib/
    │   ├── utils.js            # datas, idade, formatação de CNS/CPF, máscaras
    │   ├── icons.js            # ícones SVG inline (nenhum externo)
    │   ├── dedup.js            # SARES.dedup — Jaro-Winkler + regras da seção 7
    │   ├── audit.js            # SARES.audit.log()
    │   ├── auth.js             # SARES.auth — sessão, perfil, permissões
    │   ├── router.js           # roteamento por hash
    │   └── charts.js           # geradores de SVG: barras, rosca, linhas, sparkline
    ├── ui/
    │   ├── components.js       # fábricas de componentes reutilizáveis
    │   ├── modal.js
    │   ├── toast.js
    │   └── shell.js            # sidebar, cabeçalho, barra de demonstração
    ├── screens/
    │   ├── login.js
    │   ├── inicio.js
    │   ├── pacientes.js
    │   ├── pacienteNovo.js
    │   ├── pacienteDetalhe.js
    │   ├── filas.js
    │   ├── atendimento.js
    │   ├── duplicidades.js
    │   ├── indicadores.js
    │   ├── auditoria.js
    │   └── configuracoes.js
    ├── demo/
    │   ├── autofill.js         # geradores de dados por formulário
    │   └── tour.js             # roteiro guiado
    └── app.js                  # inicialização e registro de rotas
```

Ordem de carregamento em `index.html`: `utils → seed → store → auth → audit → dedup → charts → components/modal/toast → shell → screens → demo → app`.

---

## 11. Critérios de aceite

O protótipo só está pronto quando **todos** os itens abaixo passam:

- [ ] `index.html` abre por duplo clique, sem servidor, sem erro no console
- [ ] Os 4 perfis entram em um clique pelo acesso rápido
- [ ] Todo formulário tem `⚡ Preencher` funcional
- [ ] Cadastrar com `⚡ Preencher com duplicata` dispara o alerta e bloqueia o salvamento
- [ ] Mesclar dois cadastros funciona e some da lista de alertas
- [ ] Item de fila pode mudar de prioridade por arrastar **e** por menu
- [ ] Registrar atendimento com encaminhamento **cria o item na fila do serviço de destino**
- [ ] A linha do tempo mostra atendimentos de todos os serviços, em ordem, com presença/falta
- [ ] **Objetivo, evolução e condutas** de outro serviço aparecem mascarados e geram log ao serem revelados
- [ ] Anamnese de outro serviço segue a mesma regra de sigilo
- [ ] As fichas A.2, A.3 e A.4 do anexo são preenchíveis, com a **identificação vinda do cadastro**
- [ ] A ficha A.4 monta sozinha a tabela de atendimentos concomitantes
- [ ] A triagem da ficha A.3 repriroriza a fila do paciente naquele serviço
- [ ] Registrar atendimento permite **agendar retorno ou dar alta** — nunca fica sem desfecho
- [ ] Fila mostra a data agendada e permite agendar/reagendar
- [ ] Mesclar cadastros **consolida vínculos duplicados** do mesmo serviço e especialidade
- [ ] Cadastro **recusa CNS ou CPF com dígito verificador inválido**
- [ ] Profissional **não consegue** registrar atendimento em fila de outro serviço pela URL
- [ ] Painel de indicadores calcula a partir dos dados reais do store, não de números fixos
- [ ] O funil de encaminhamentos é coerente: gerados ≥ em fila ≥ atendidos
- [ ] Auditoria registra login, visualização de prontuário, criação e edição
- [ ] Exportar CSV baixa um arquivo válido
- [ ] Layout íntegro em 360px, 768px, 1280px e 1920px
- [ ] F5 em qualquer rota mantém a tela e a sessão
- [ ] Reiniciar dados restaura a seed sem recarregar a página
- [ ] O roteiro guiado percorre os passos sem erro
- [ ] Nenhuma cor fora dos tokens da seção 2.1
- [ ] Nenhuma dependência externa além da fonte Inter

---

## 12. Ordem de implementação sugerida

| Fase | Entrega | Por quê |
|---|---|---|
| 1 | tokens, base, componentes, shell, roteador | Sem isso nada mais existe |
| 2 | seed + store + auth + login com acesso rápido | Destrava todas as telas |
| 3 | Pacientes + cadastro + **dedup** | É a frente 2, o maior diferencial técnico |
| 4 | Filas + registrar atendimento + **encaminhamento** | Fecha as frentes 1, 3 e 4 |
| 5 | Prontuário com linha do tempo | É a tela que mais impressiona |
| 6 | Duplicidades + indicadores | Sustenta o discurso de economia de recursos |
| 7 | Auditoria + LGPD + roteiro guiado | Critério de nota explícito |
| 8 | Polimento, responsividade, estados vazios | Usabilidade e design são critério de nota |

Se o tempo apertar, cortar nesta ordem: Configurações → Documentos → mapa por bairro → funil de encaminhamentos. **Nunca cortar** dedup, encaminhamento, linha do tempo ou preenchimento automático.

---

## 13. Tom da interface

Os usuários finais são profissionais de saúde, educação e assistência social, muitos com pouca familiaridade com sistemas informatizados, saindo de um caderno de papel. A interface precisa ser **calma, espaçosa e óbvia**: poucos elementos por tela, rótulos em linguagem do serviço (não em jargão de TI), botões grandes, confirmação clara depois de cada ação, e nenhum erro sem instrução do que fazer a seguir.

Evitar: densidade excessiva, ícones sem rótulo, jargão em inglês, modais encadeados, e qualquer ação destrutiva sem confirmação.
