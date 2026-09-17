# Relatório de usabilidade — SARES

Teste de uso conduzido assumindo, um de cada vez, os quatro perfis do sistema —
recepção, profissional, coordenação e gestão — executando tarefas reais de cada
papel no navegador (não apenas lendo a tela). Cada achado tem o cenário que o
revelou, por que é um problema e o que foi corrigido.

| | |
|---|---|
| Teste original | 16/09/2026 — 19 achados, 1 crítico |
| Correções aplicadas | 17/09/2026 — 19 de 19 resolvidos |
| Achado adicional | 17/09/2026 — Duplicidades sem escopo, apontado pelo usuário |
| Matriz de perfis definida | 17/09/2026 — revisão completa de quem faz/vê/não faz cada coisa |
| Verificações automatizadas | 20 de regressão completa (fluxo, responsivo, F5) + testes dirigidos por achado |

Metodologia e regras de verificação em **[CONSISTENCIA.md](CONSISTENCIA.md)** valem
aqui também: cada correção foi testada isoladamente antes de entrar na suíte de
regressão completa.

---

## 🔴 Crítico

### #8 — Profissional podia assinar sessão de outra especialidade

**Cenário.** Larissa (fonoaudióloga do NAPE) clicou em "Chamar para atendimento"
num paciente que aparecia na fila dela, mas de Psicologia. O sistema deixou
passar: `especialidade do registro: Psicologia · profissional: Larissa Feitosa
Bastos (Fonoaudiologia, CRFa 5-4812)`.

**Por que importa.** A guarda de acesso conferia o *serviço* (`filaItem.servicoId
=== u.servicoId`), mas um NAPE reúne Fonoaudiologia, Psicologia, Psicopedagogia,
Terapia Ocupacional e Educação Física sob o mesmo teto — cada uma com conselho
profissional próprio. Serviço bater não significa habilitação para assinar
aquele registro clínico.

**Correção.** `js/screens/atendimento.js` — nova guarda confere
`filaItem.especialidade === u.especialidade`, com a mesma tela de acesso
restrito e o mesmo registro em auditoria (`acesso_negado`) da guarda de serviço.

**Verificação.** Reproduzido o cenário exato: bloqueado.

---

## 🔴 Alta

### #1 — Nome do paciente espremido a 48px na busca do topo

**Cenário.** Busquei "joao pedro" na recepção. O resultado mostrou "João…"
cortado, CNS quebrado em 4 linhas.

**Causa.** Os chips de serviço (`NAPE CREAES NASF`) eram irmãos flex do nome
e não encolhiam; quanto mais serviços a pessoa tinha, menos legível ficava —
exatamente o oposto do necessário, já que quem circula por mais serviços é
quem mais risco de duplicidade carrega.

**Correção.** `js/ui/shell.js` — chips movidos para uma linha própria abaixo
do nome, mesmo padrão já usado no cartão da lista de pacientes
(`c.cartaoPaciente`). Nome agora renderiza com a largura real da caixa de busca.

**Verificação.** Largura do nome: 48px → 286px.

### #2 — Busca não sinalizava cadastro duplicado

**Cenário.** A mesma busca "joao pedro" retornou os dois cadastros duplicados
(`João Pedro Sousa Marinho` e `Joao Pedro S. Marinho`) lado a lado, sem
distinção — a lista de pacientes já marca isso com `⚠ Possível duplicidade`,
a busca do topo não.

**Correção.** Badge de duplicidade adicionada ao mesmo item corrigido no #1,
usando `SARES.db.alertaDoPaciente(p.id)` — a mesma função que já alimenta a
lista de pacientes.

### #3 / #4 / #5 — Número da recepção errado e mal rotulado

**Cenário.** O card "Pessoas aguardando na rede" mostrava 57. O real: 80
vínculos de fila / 35 pessoas distintas.

**Causa.** `js/screens/inicio.js` filtrava só `status === 'aguardando'`,
esquecendo `'agendado'` — 23 pessoas já agendadas desapareciam do painel da
recepção. Além disso, o card contava *vínculos* mas rotulava como *pessoas*
(uma pessoa em 5 filas contava 5 vezes), e "Classificadas como urgente"
somava também quem já tinha data marcada, tornando a nota "precisam de
agendamento" literalmente falsa para parte do número.

**Correção.** Contagem agora usa pacientes distintos (`Set` sobre
`pacienteId`) somando `aguardando`+`agendado`; a KPI de urgência foi renomeada
para "Urgentes sem agendamento" e conta só quem ainda não tem data. O card
principal ganhou uma nota explicando quantos já estão agendados.

**Verificação.** Card mostra a contagem real de pessoas; rótulos batem com o
que contam.

### #9 — Fila do profissional abria misturando 5 especialidades

**Cenário.** A fila de Larissa (fonoaudióloga) abria com 15 cartões: 4 de
Psicologia, 3 de Psicopedagogia, 3 de TO, 3 de Educação Física — e só 2 de
Fonoaudiologia, todos com "Chamar para atendimento" ativo. É a causa direta
do achado #8.

**Correção.** `js/screens/filas.js` — o filtro de especialidade parte
pré-marcado na especialidade de quem está logado, quando a pessoa é
`profissional`. Continua livre para trocar manualmente depois (não trava, só
muda o padrão inicial). Coordenação e gestão **não** recebem esse padrão —
o papel delas é justamente ver o serviço inteiro (ver #13).

**Verificação.** Fila de Larissa abre 100% filtrada em Fonoaudiologia; ao
trocar de perfil o filtro reseta corretamente para cada pessoa.

### #10 — Quem faltava não podia ser remarcado, e a tela prometia o contrário

**Cenário.** Marquei "Faltou" no registro de atendimento. A etapa
"4. Próxima sessão" desaparecia junto com o bloco de sessão — mas o texto ao
lado, no passo 1, dizia: *"A falta é registrada no histórico e o vínculo com
o serviço é mantido **para reagendamento**"*.

**Correção.** `js/screens/atendimento.js` — a etapa "Próxima sessão" saiu de
dentro do bloco que se esconde com falta e ficou sempre visível, com a
descrição mudando dinamicamente ("A falta não encerra o cuidado — marque o
retorno para não perder o vínculo com esta pessoa"). O salvamento processa
agendamento/alta independente de presença.

**Verificação.** Testado ponta a ponta: falta registrada + reagendamento para
01/11 → fila realmente marca `status: 'agendado', data: '2026-11-01'`.

### #11 — Profissional não via a própria agenda em lugar nenhum

**Cenário.** Existiam 7 atendimentos agendados no NAPE (2 nos 7 dias
seguintes), mas o início da Larissa mostrava só "Próximos da minha fila" e
"Meus últimos registros" — nenhuma agenda. Para quem trabalha por horário
marcado, essa é a primeira pergunta do dia.

**Correção.** `js/screens/inicio.js` — painel do profissional ganhou dois
cards novos: "Minha agenda — hoje" (com horário) e "Próximos dias", além de
renomear e reorganizar os KPIs (Agendados hoje / Na fila sem data / Urgentes
sem agendamento / Faltas).

**Verificação.** Card "Minha agenda — hoje" presente e populado.

### #13 — Coordenação podia repriorizar a fila de outros serviços

**Cenário.** Sônia coordena o NAPE. O seletor de serviço da tela de filas
lista os 5 serviços da rede, e ela mantinha os controles de "Alterar
prioridade" e "Remover da fila" ativos em **todos**, não só no NAPE.

**Correção.** `js/screens/filas.js` — nova função `podeGerenciarFila(f)`:
coordenação só prioriza/remove/arrasta cartões do próprio serviço; pode
continuar **vendo** os outros (útil para achar sobreposição), só não
gerenciando. Gestão, que responde pela rede inteira, não tem essa restrição.
A guarda foi replicada dentro de `alterarPrioridade()` e `removerDaFila()`
como defesa em profundidade, não só ocultando o botão.

**Verificação.** Sônia: 0 cartões arrastáveis na fila do CRASF, todos
arrastáveis na fila do NAPE (o próprio serviço).

### #15 — Três números diferentes para "quantos estão esperando"

Consequência direta dos achados #3/#4/#5: a recepção dizia 57, a gestão dizia
80 ("na fila"), o real era 35 pessoas. Resolvido pela correção do #3 — a
gestão continua mostrando vínculos (métrica operacional correta para
planejamento de vagas, já honestamente rotulada "na fila"), e a recepção
passou a mostrar pessoas de fato, com o rótulo batendo com a contagem.

---

## 🟡 Média

### #6 — 44 campos para cadastrar uma criança no balcão

**Cenário.** O cadastro rápido tinha 4 etapas e 44 campos, incluindo uma
seção inteira de "Composição familiar" (escolaridade e ocupação dos pais,
situação conjugal) — perguntas de contexto delicado para fazer com uma fila
esperando atrás no balcão.

**Correção.** `js/screens/pacienteNovo.js` — a seção "Composição familiar"
foi removida do cadastro rápido. Essa informação já é coletada com mais
tempo e contexto na **Anamnese** (fichas A.2/A.3 do anexo, que fazem
exatamente essas perguntas). Sem essa mudança, os mesmos dados tinham duas
fontes possíveis (cadastro e anamnese) que podiam divergir.

**Verificação.** Campos no cadastro: 44 → 37. `pacienteDetalhe.js`'s aba
"Dados cadastrais" mostra o card de composição familiar só quando há dado
real (base de demonstração); pacientes novos direcionam para a aba
Anamneses.

### #12 — Quebrar sigilo era uma justificativa por registro

**Cenário.** Um prontuário com atendimentos de dois serviços diferentes
tinha 7 registros clínicos mascarados. Preparar um relatório conjunto exigia
abrir 7 modais e digitar a mesma justificativa 7 vezes — atrito alto o
suficiente para incentivar justificativa copiada e colada, esvaziando a
auditoria.

**Correção.** `js/screens/pacienteDetalhe.js` — quando um mesmo serviço tem
2 ou mais registros mascarados, aparece um botão "Liberar N registros do
SIGLA" que abre **um único** modal de justificativa e libera todos de uma
vez. Cada liberação continua gravada individualmente na auditoria (rastreável
por atendimento), só a interação com quem está usando o sistema virou uma
ação só.

**Verificação.** Testado ponta a ponta: 9 registros mascarados → botão
"Liberar 4 registros do CRASF" → confirma → 5 registros mascarados restantes
(os 4 do CRASF liberados, os de outros serviços continuam protegidos).

### #14 — KPI de duplicidades ignorava o filtro de serviço

**Cenário.** No painel de indicadores filtrado por NAPE, "Duplicidades
abertas" mostrava 9 — o mesmo número da rede inteira, mesmo com o cabeçalho
escrito "NAPE".

**Correção.** `js/data/store.js` — `indicadores(dias, servicoId)` agora
filtra os alertas: um alerta só conta para um serviço se pelo menos um dos
pacientes envolvidos tiver vínculo (atendimento ou fila) com ele.

**Verificação.** Distribuição real por serviço após a correção: NASF 3, NAPE
4, CREAES 2, CASA AZUL 3, CRASF 4 — nenhum bate cegamente com o total da rede.

### #16 — Mês corrente aparecia como se estivesse fechado

**Cenário.** O gráfico "Atendimentos por mês" mostrava setembro com barra bem
menor que agosto — lido como queda de 72%, quando na verdade o mês só tinha
16 de 30 dias decorridos.

**Correção.** `js/lib/charts.js` — a barra do mês em curso ganha opacidade
reduzida, contorno tracejado e um asterisco no rótulo, com legenda explicando
"mês em curso — contagem parcial, ainda não fechou".

### #17 — Sobreposições automáticas diluíam o caso do roteiro

**Cenário.** A base de demonstração deveria ter só o caso plantado do Lucas
Gabriel (Fonoaudiologia em dois serviços ao mesmo tempo) para o passo 4 do
pitch. Depois de uma correção anterior no funil de encaminhamentos, a
varredura de sobreposições passou a encontrar **6 outros casos** gerados sem
querer, diluindo o único caso que o roteiro usa.

**Causa raiz.** Ao criar a fila de destino de um encaminhamento, a seed não
verificava se o paciente já aguardava aquela especialidade em outro serviço
— nem essa checagem, nem o mesmo cuidado no vínculo-base de fila
(vínculo independente do paciente, gerado antes dos encaminhamentos serem
processados).

**Correção.** `js/data/seed.js` — duas checagens (uma para encaminhamentos,
uma para vínculos-base) pulam a criação da fila quando já existe um vínculo
ativo do paciente na mesma especialidade em outro serviço.

**Verificação.** Alertas de sobreposição abertos: 6 → 1 (só Lucas Gabriel).

---

## ⚪ Baixa

### #7 — Enter na busca não fazia nada

**Correção.** `js/ui/shell.js` — Enter navega direto para o único resultado
quando sobra um; com mais de um, leva para `/pacientes?busca=termo`, que
`js/screens/pacientes.js` agora lê da URL para pré-filtrar a lista completa
(antes inalcançável além dos 8 primeiros resultados da busca rápida).

### #18 — Sem link "pular para o conteúdo"

**Correção.** Link `.skip-link` adicionado como primeiro elemento focável do
shell (`js/ui/shell.js`), apontando para `#app-view` (que ganhou
`tabindex="-1"`, preservado em `app.renovarView()` a cada navegação).

### #19 — Avisos empilhados saíam da tela

**Correção.** `js/ui/toast.js` — no máximo 4 avisos simultâneos; o mais
antigo é removido quando um quinto chega.

---

## Achado à parte: bug estrutural de CSS Grid descoberto na verificação

Ao testar a correção do #11 (novos cards de agenda) em 360px, a tela de
início do profissional estourava a largura da viewport — mas a causa não
era o card novo. `.grid-2, .grid-3, .grid-4, .grid-6` colapsavam para
`grid-template-columns: 1fr` abaixo de 860px, e uma trilha `1fr` sozinha
carrega mínimo automático (`min-content`): **um único** item com conteúdo
sem quebra de linha em qualquer card da grade força a grade inteira — coluna
única — a crescer, empurrando até cards vizinhos sem nenhum conteúdo largo.

**Correção.** `css/base.css` — `minmax(0, 1fr)` no lugar de `1fr`. Uma linha,
raiz do problema, sem tocar em nenhum componente individual.

**Verificação.** 28 combinações de tela × largura (320/360/375/412px em
`/inicio`, `/indicadores`, `/duplicidades`, `/auditoria`, `/configuracoes`,
`/pacientes`, `/filas`) — todas sem estouro horizontal.

---

## Achado à parte: Filas e Duplicidades sem escopo para o profissional

**Pergunta que originou o achado:** *"essa questão de filas e duplicidades faz
sentido para o sistema completo como por exemplo o profissional de Psicologia
estar vendo isso na tela dele?"*

**Filas já estava certo** desde o achado #9 (fila abre filtrada na própria
especialidade). **Duplicidades não tinha esse tratamento** — a tela mostrava a
rede inteira para qualquer perfil com `ver_duplicidades`, o que inclui
`profissional`. Um psicólogo do NASF via nome completo, CNS, CPF, endereço e
nome da mãe de duas crianças do CRASF, comparados lado a lado, sem nenhuma
relação de cuidado com elas — exposição de dado sem necessidade de saber.

**Um segundo problema, mais sério, escondido atrás do primeiro:** os botões
"Adiar" e "São pessoas diferentes" **não tinham nenhuma guarda de permissão**
— só "Mesclar" checava `resolver_duplicidade`. Um profissional (que não tem
essa permissão) conseguia decidir sozinho que dois cadastros são pessoas
diferentes, ou manter uma sobreposição de atendimento ativa, sem passar pela
coordenação.

**Terceiro problema, descoberto ao corrigir os dois primeiros:** a permissão
`resolver_duplicidade` não tinha escopo de serviço — um coordenador de
qualquer serviço podia mesclar ou descartar duplicidades de **qualquer outro**
serviço da rede. Mesmo problema que o achado #13 já havia corrigido para
filas, nunca aplicado aqui.

**Correção.**
- `SARES.db.alertaDoServico(a, servicoId)` e `SARES.db.alertaDaEspecialidade(a, servicoId, especialidade)` —
  promovidas de lógica interna do KPI (achado #14) para métodos reutilizáveis.
- `SARES.auth.alertaVisivel(a)` / `alertasVisiveis(tipo)` — fonte única do que
  cada perfil pode VER: gestão vê a rede, coordenação e recepção veem o
  próprio serviço, profissional vê a própria especialidade. Usada em
  `duplicidades.js`, nos três painéis de `inicio.js` e nos 4 contadores de
  badge do shell (sidebar, navegação inferior, topbar, sino) — antes cada um
  filtrava (ou não) do seu jeito, e o número no menu nunca batia com o número
  na tela.
- `SARES.auth.podeResolverAlerta(a)` — fonte única do que cada perfil pode
  RESOLVER: gestão resolve qualquer alerta, coordenação só do próprio
  serviço, profissional e recepção nunca. Substitui o `pode('resolver_duplicidade')`
  sem escopo nos botões Mesclar, Adiar, Descartar e Cancelar vínculo — e nos
  handlers correspondentes, como defesa em profundidade.

**Verificação.** Psicóloga do NASF: 2 alertas relevantes (era 4, a rede
inteira), zero botões de ação, texto "Somente a coordenação do serviço
envolvido pode decidir". Coordenadora do NAPE: 3 alertas, mescla normalmente
os do próprio serviço. Gestora: 4, rede inteira, como antes. Badge da sidebar,
do sino e da tela **sempre batem** entre si, para os três perfis — 6/6.
Regressão completa sem quebras — 20/20 + 14/14 + 28/28.

---

## Achado à parte: matriz de perfis revisada por completo

**Pedido que originou a revisão:** *"vamos definir muito bem o que cada perfil faz e vê e
deixa de fazer e não faz — o Profissional não faz sentido ter acesso às duplicidades até
porque ele mesmo não vai ter funcionalidade com essa tela [...] o mesmo acontece para a
recepção, um recepcionista cadastrado no NAPE pode inserir na fila por exemplo da CASA AZUL
[...] o correto seria ter a recepção da CREAES/Casa Azul/CRASF e tudo mais?"*

Três decisões, três correções:

**1. Profissional perde Duplicidades por completo — não só o escopo, a permissão inteira.**
O achado anterior (acima) tinha deixado o profissional ver uma versão reduzida da tela. Mas
a tela só tem duas ações (Mesclar, Descartar) e nenhuma é dele — então mesmo a versão
reduzida era só dado sem necessidade de saber. `ver_duplicidades` deixou de incluir
`profissional`: some da sidebar, do sino de alertas, da navegação mobile, e o acesso direto
por hash volta "Tela restrita". O banner "Sobreposição de atendimento detectada" que
aparecia no início do profissional também foi removido — sem tela para ir, o aviso era um
beco sem saída.

**2. "Inserir em fila" e "Agendar" tinham o mesmo buraco que "Priorizar fila" já tinha tido
(achado #13) — nunca corrigido para essas duas ações.** Uma recepcionista do NAPE, no
cadastro de paciente OU na modal "Inserir em fila" do prontuário, tinha um seletor com os 5
serviços da rede — podia inserir alguém direto na fila de Casa Mais Azul sem nenhuma relação
com o caso. O mesmo valia para "Agendar": ao trocar o filtro de serviço na tela de Filas
(seletor liberado para recepção/coordenação/gestão), o botão de agendar ficava disponível
mesmo em filas de outro serviço.

- `auth.podeInserirNoServico(servicoId)` — usado no cadastro (`pacienteNovo.js`, campo
  "Serviço de entrada" virou um valor travado, não mais um `<select>`) e em "Inserir em
  fila" (`pacienteDetalhe.js`, o seletor de serviço sumiu, só resta a especialidade dentro
  do próprio serviço).
- `auth.podeAgendarNestaFila(filaItem)` — usado em `filas.js`: recepção/coordenação só
  agendam no próprio serviço; profissional, além disso, só na própria especialidade.
- Inserir em OUTRO serviço continua possível — é o **encaminhamento**, registrado dentro de
  um atendimento, que continua de propósito aberto a qualquer serviço da rede (é o mecanismo
  de integração, não o problema).

**3. A seed tinha recepção só no NASF e no NAPE, e coordenação faltando em CREAES e CRASF.**
Pergunta direta do usuário, resposta direta: sim, o correto é ter recepção e coordenação nos
5 serviços. Sem coordenação em CREAES/CRASF, ninguém além da gestão conseguia resolver
duplicidade ou cadastrar equipe *nesses dois serviços* — recentralizando exatamente o que a
correção anterior (gestão de usuários escopada) tinha descentralizado. Adicionados: Débora
(recepção CREAES), Vanessa (recepção Casa Mais Azul), Iolanda (recepção CRASF), Rogério
(coordenação CREAES) e Cristiane (coordenação CRASF) — base de demonstração passa de 14
para 19 usuários, um de cada perfil necessário em cada um dos 5 serviços.

A matriz de capacidades completa — quem PODE cada ação e em qual ESCOPO — está em SPEC.md,
seção 4.1.

**Verificação.** 26 verificações na camada de dados (cobertura de recepção/coordenação por
serviço, e-mails únicos, login dos 5 novos usuários, os dois novos helpers de escopo) + 14
no navegador (Duplicidades sumida por completo do profissional em todas as superfícies —
sidebar, sino, mobile, hash direto; cadastro e "Inserir em fila" travados no próprio
serviço; recepção do NAPE sem conseguir agendar na fila da Casa Mais Azul, mas agendando
normalmente na própria). Regressão completa sem quebras.

---

## Achado à parte: cancelar vínculo de sobreposição era por alerta, não por linha

**Pergunta que originou o achado:** *"Verônica da coordenação tem acesso às duplicidades de
NAPE e CREAES por exemplo e ela no sistema pode cancelar um dos dois, qual seria a melhor
estratégia para o sistema nesse sentido?"*

O achado anterior desta seção escopou `podeResolverAlerta(alerta)` por serviço — mas numa
sobreposição entre dois serviços (o alerta plantado do Lucas Gabriel, NAPE × CREAES), a
checagem era "esse alerta toca o meu serviço", não "essa linha específica da tabela é do
meu serviço". Resultado: a coordenadora do NAPE via o botão **"Cancelar este vínculo"** nas
DUAS linhas — inclusive na do CREAES, que ela não coordena. Cancelar um vínculo tira a vaga
de um lado só; deixar isso pela alçada de quem responde pelo OUTRO serviço é decidir por
uma organização que não é a sua.

**A distinção que resolve isso:** nem toda ação sobre um alerta tem o mesmo risco.

| Ação | Efeito | Quem decide |
|---|---|---|
| Mesclar cadastro | Nada é apagado, histórico preservado | Qualquer coordenador tocado pelo alerta |
| Manter os dois (descartar) | Nenhuma vaga fechada, nenhum lado perde | Qualquer coordenador tocado pelo alerta |
| **Cancelar este vínculo** | **Fecha a vaga de UM serviço específico** | **Só a coordenação DAQUELE serviço** |

**Correção.** `auth.podeCancelarVinculoDeSobreposicao(filaItem)` — nova checagem por
*linha*, não por *alerta*: `filaItem.servicoId === auth.servicoId()` para coordenação,
irrestrito para gestão. O botão "Cancelar este vínculo" na tabela de sobreposição passa a
aparecer só na linha do próprio serviço; a linha do outro mostra "só a coordenação do
[SIGLA]" no lugar do botão. Se nenhum dos dois coordenadores cancelar o próprio vínculo, o
alerta continua aberto e visível para os dois — a gestão, que resolve qualquer alerta,
arbitra quando não há acordo. "Mesclar" e "Manter os dois" continuam por alerta inteiro, sem
mudança — nenhuma das duas ações fecha vaga de um lado à revelia do outro.

**Verificação.** Reproduzido com o caso plantado real (Lucas Gabriel, Fonoaudiologia em NAPE
e CREAES simultaneamente): Sônia (coordenadora do NAPE) só vê o botão na linha do NAPE;
Rogério (coordenador do CREAES) só vê na linha do CREAES — visão espelhada, confirmada nos
dois sentidos. Tentativa direta de cancelar o vínculo do outro serviço, contornando a
interface, recusada pela mesma checagem.
8 verificações na camada de dados + 7 no navegador. Regressão completa sem quebras.

> **Nota (17/09/2026, tarde):** "Manter os dois" — que este achado deixou por alerta
> inteiro, achando a ação simétrica — foi revista de novo no achado seguinte. Ela não fecha
> vaga, mas decide o desfecho para os dois serviços de uma vez; sozinha, essa simetria não
> bastava. Passou a ser só da gestão.

---

## Achado à parte: mais três pontas soltas do mesmo problema

**Pedido:** *"o botão Manter os dois deve sumir nesse mesmo sentido [...] em Filas eu
consigo ver as filas de outros profissionais, o mesmo acontece na recepção."*

**1. "Manter os dois" (sobreposição) — decide pelos dois serviços, não devia ser de um só.**
Não fecha vaga, mas fecha o ALERTA em nome dos dois lados — coordenador de só um dos
serviços não tem autoridade para isso. `auth.podeManterSobreposicao()`: só gestão. Cada
coordenador resolve mesclando (cadastro) ou cancelando o PRÓPRIO vínculo (sobreposição) —
nunca decidindo pelos dois ao mesmo tempo.

**2. Profissional via a fila de colegas de outra especialidade, dentro do mesmo serviço.**
O filtro de especialidade em Filas partia pré-marcado na especialidade certa, mas o
`<select>` continuava livre — bastava trocar para ver (e, antes da correção anterior,
até agendar em) outra fila. Vira um valor travado (mesmo padrão do "Serviço de entrada" no
cadastro): sem `<select>`, sem opção de escolher.

**3. Recepção via a fila de qualquer um dos 5 serviços.** O seletor de serviço estava
liberado para recepção "só para olhar" — mas olhar já é dado de paciente e fila de um
serviço onde a pessoa não trabalha. Trava no próprio serviço, igual profissional; diferente
dele, mantém o filtro de ESPECIALIDADE livre (é o balcão de entrada do serviço inteiro,
precisa ver todas).

**Verificado, sem alteração (dado que faz sentido continuar de rede inteira):**
- **Lista de Pacientes e busca do topo** — de propósito, cruzam a rede inteira. É o motor de
  duplicidade: achar que alguém já existe em OUTRO serviço só funciona buscando em todos.
- **Encaminhamento** (dentro do atendimento) — de propósito, aberto a qualquer serviço; é o
  mecanismo de integração da rede, não uma falha de escopo.
- **"Atendimentos concomitantes"** (ficha A.4) e aba "Filas" do prontuário — mostram os
  vínculos do PACIENTE aberto em todos os serviços, mas é informação pontual sobre alguém
  que já se está atendendo, não navegação livre pela rede.

**Verificação.** Fono do NAPE: sem seletor de especialidade nem de serviço, 100% dos cartões
da própria área; tentativa via URL (`?servico=sv-casaazul`) recusada. Recepção do NAPE: sem
seletor de serviço, com seletor de especialidade; mesma tentativa via URL recusada.
Coordenação e gestão continuam livres para navegar entre serviços (não regrediu). 12/12 no
navegador. Regressão completa sem quebras.

---

## Histórico

| Data | O que mudou |
|---|---|
| 16/09/2026 | Teste de usabilidade por persona — 19 achados |
| 17/09/2026 | 19 achados corrigidos + bug estrutural de grid CSS encontrado na verificação e corrigido |
| 17/09/2026 | Duplicidades escopada por serviço/especialidade, a partir de uma pergunta de sanity-check do usuário |
| 17/09/2026 | Matriz de perfis revisada por completo: profissional perde Duplicidades, inserir/agendar escopados por serviço, seed completa com recepção e coordenação nos 5 serviços |
| 17/09/2026 | Cancelar vínculo de sobreposição passa a ser por linha (serviço específico), não por alerta inteiro |
