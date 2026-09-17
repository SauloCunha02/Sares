# SARES — React + Firebase

**Sistema de gestão do cuidado a pessoas com Transtorno do Espectro Autista (TEA)**
Rede pública municipal de Crateús — CE

> Desenvolvido para o **Hackathon BNB — Desafio Prefeitura de Crateús**
> FIT 2026 · UFC Campus de Crateús · Prefeitura Municipal de Crateús · Patrocínio Banco do Nordeste

React 19 + TypeScript + Vite + Firebase (Auth + Firestore + Hosting), com a matriz de
permissões por perfil/serviço/especialidade, detecção de duplicidade de cadastro e
sobreposição de fila, trilha de auditoria e uma seed de demonstração determinística (19
usuários, 5 serviços, 42 pacientes).

Produção: **https://sares.web.app** (projeto Firebase `sares-app` — `sares` sozinho não é um
ID de projeto válido no Google Cloud, precisa de 6+ caracteres, mas o *site* de Hosting
dentro do projeto se chama `sares`, daí a URL limpa).

## Documentação

- [`docs/SPEC.md`](docs/SPEC.md) — especificação de construção do sistema.
- [`docs/USABILIDADE.md`](docs/USABILIDADE.md) — relatório de teste de usabilidade pelas
  quatro personas (recepção, profissional, coordenação, gestão).

## Setup

```bash
cp .env.example .env   # preencha com a config do projeto Firebase (ver console)
npm install
npm run dev
```

O `.env` não é versionado — copie de `.env.example` e preencha com a config do seu
projeto Firebase (Configurações do projeto → Seus apps → SDK). Essa config não é secreta
por natureza (qualquer app Firebase cliente expõe isso no próprio bundle, é assim que o
SDK funciona), mas fica fora do git por higiene; a segurança de verdade está nas regras do
Firestore, ver abaixo.

### Popular um projeto Firebase novo do zero

`firestore.rules` exige `autorizado()` (autenticado **e** com documento em
`authUsers/{uid}`) — e é o próprio `scripts/seed.ts` quem cria esses documentos. Num
projeto novo, ainda sem nenhum `authUsers`, a primeira escrita do script seria recusada
pela própria regra que ele está tentando satisfazer. Por isso, seed num projeto novo é em
três passos:

```bash
# 1. regra temporária permissiva, só pra este bootstrap
cp firestore.rules firestore.rules.real
echo 'rules_version = "2"; service cloud.firestore { match /databases/{d}/documents { match /{doc=**} { allow read, write: if request.auth != null; } } }' > firestore.rules
firebase deploy --only firestore:rules

# 2. popula tudo (usuários, dados e os authUsers que a regra real vai exigir)
npm run seed

# 3. restaura a regra real
cp firestore.rules.real firestore.rules && rm firestore.rules.real
firebase deploy --only firestore:rules
```

Rodar `npm run seed` de novo depois (mesmo projeto, já com a regra real publicada) funciona
normalmente: a geração de dados é determinística, então ele reconhece as contas já
existentes, entra nelas e regrava as mesmas coleções do Firestore com os mesmos IDs — sem
duplicar nada.

## Arquitetura

- **Firestore** (`servicos`, `usuarios`, `pacientes`, `filas`, `atendimentos`, `anamneses`,
  `alertas`, `logs`) espelha o modelo de dados do sistema (ver `docs/SPEC.md`). Documentos da
  seed mantêm o id original (`sv-nape`, `u-01`...); os criados em runtime usam ID automático.
- **Auth**: cada usuário da seed tem uma conta de e-mail/senha (senha única de demo,
  `sares123`). O SDK cliente não deixa escolher o UID da conta, então o vínculo entre a
  conta e o documento em `usuarios/{id-da-seed}` é feito pelo campo `authUid` (ver
  `scripts/seed.ts` e `src/lib/AuthContext.tsx`).
- **Regras do Firestore** (`firestore.rules`): `usuarios` e `servicos` têm leitura pública
  (a tela de login precisa mostrar nome/perfil antes de autenticar); todo o resto exige
  estar **provisionado**, não só autenticado — a config do Firebase é pública por natureza
  (vai no bundle do site), então qualquer um pode criar uma conta de e-mail/senha nova com
  a mesma API key. A função `autorizado()` em `firestore.rules` exige também um documento
  em `authUsers/{uid}` (escrito pelo `scripts/seed.ts` para cada conta real da rede) —
  contas avulsas autorregistradas passam no "está logado" mas falham nessa checagem e não
  leem/escrevem nada além de `usuarios`/`servicos`. O escopo fino por perfil/serviço/
  especialidade (quem vê o quê) continua sendo aplicado no cliente, em
  `src/lib/permissions.ts`.
- **Tempo real, mas seletivo**: `servicos`, `usuarios`, `pacientes`, `filas`, `atendimentos`,
  `anamneses` e `alertas` usam `onSnapshot` global (`src/lib/DataContext.tsx`) — duas abas
  logadas como perfis diferentes veem a mesma mudança instantaneamente. `logs` (auditoria) é
  a exceção de propósito: é a coleção que mais cresce e só duas telas usam, então cada uma
  faz sua própria consulta escopada (`src/lib/useLogs.ts`) em vez de manter um listener
  global que releria a coleção inteira em toda sessão, de todo mundo.
- **Cache persistente (IndexedDB)**: o Firestore roda com `persistentLocalCache` +
  `persistentMultipleTabManager` (`src/lib/firebase.ts`) — reabrir o app no mesmo navegador
  reaproveita o que já foi baixado e só sincroniza o que mudou. Isso, mais o item acima, é o
  que evita bater no teto de leitura do plano gratuito (Spark) num dia de uso normal — o
  plano tem corte duro diário; se o uso for intenso (testes automatizados, muita gente ao
  mesmo tempo), considere o plano Blaze, que tem a mesma cota gratuita sem o corte.
- **Sem Cloud Functions**: a detecção de duplicidade de cadastro e sobreposição de fila
  (`src/lib/dedup.ts`, `src/lib/mutations.ts`) roda inteiramente no cliente.

## Estado do projeto

As 12 telas (Login, Início, Pacientes, Cadastro, Prontuário, Anamnese, Filas, Atendimento,
Duplicidades, Indicadores, Auditoria, Configurações) estão implementadas e funcionais, com a
matriz de permissões completa, detecção de duplicidade/sobreposição e gráficos SVG próprios
(sem biblioteca de gráfico externa).

A aplicação não tem nenhum resquício de "ambiente de demonstração" visível a perfis comuns
(sem barra de troca de perfil sem senha, sem acesso rápido no login) — exceto para quem é
**gestão** (`ver_configuracoes`), que tem uma aba "Ambiente de demonstração" dentro de
Configurações com ferramentas de administração da base (reiniciar dados, avançar o tempo,
"entrar como" outro perfil) — ver `AbaDemonstracao` em `src/screens/Configuracoes.tsx`.

Verificado com Puppeteer contra o Firestore real: login/logout, as 4 personas (recepção,
profissional, coordenação, gestão) navegando por todas as telas, escopo de permissão
respeitado em cada uma, ferramentas de administração da gestão testadas de ponta a ponta.
