# smart-helpdesk-api

API REST para central de chamados internos com triagem inteligente por IA, classificação automática de categoria e prioridade, gerenciamento de tickets e notificações em tempo real.

> **Status atual:** autenticação (JWT), autorização por papel (Bouncer), CRUD completo de usuários, categorias, chamados e comentários, e indicadores em tempo real (`GET /tickets/stats`, consumido via polling curto pelo front).

## Indicadores em tempo real

`GET /tickets/stats` devolve, para o escopo do usuário autenticado (ADMIN vê tudo, SOLICITANTE só os próprios chamados) e respeitando os mesmos filtros da listagem: contagem e percentual por status, contagem e percentual por prioridade, e a lista dos chamados com prioridade ALTA em aberto. O front (`TicketStatsLive`) faz *polling* curto (a cada 8s, via `/api/tickets/stats`, que faz proxy da API anexando o JWT) e dispara uma notificação quando aparece um chamado ALTA/ABERTO novo — não só quando o contador muda.

Optei por polling em vez de WebSocket/SSE porque a especificação aceita as três formas igualmente, e polling é a opção mais simples e robusta de implementar corretamente no modelo request/response do AdonisJS, sem o risco de conexões long-lived quebrarem no HMR ou vazarem recursos.

## Tecnologias

- Node.js **>= 20.6** (testado com o LTS mais recente disponível)
- [AdonisJS **v6.21**](https://docs.adonisjs.com/) (TypeScript)
- Lucid ORM + PostgreSQL 16
- Zod para validação
- JWT (`jsonwebtoken`) para autenticação, Bouncer para autorização por papel
- Padrão MSC (Model-Service-Controller) com classes base reutilizáveis
- `exceljs` para o relatório `.xlsx` exportável pelo front

## Triagem automática (categoria/prioridade)

A classificação tenta primeiro a **API gratuita do Gemini** (`app/services/gemini_classification_service.ts`, modelo `gemini-3.6-flash`) e, se não houver `GEMINI_API_KEY` configurada ou a chamada falhar por qualquer motivo (rate limit, timeout, erro de rede, resposta fora do formato esperado), cai automaticamente para uma **heurística local por palavras-chave** (`app/services/ticket_triage_service.ts`) — determinística, sem custo e sem dependência externa. Uma instabilidade do Gemini nunca impede a criação de um chamado.

- **Gemini**: recebe a descrição do chamado e a lista de categorias ativas cadastradas, e responde em JSON estruturado (`generationConfig.responseSchema`) com `category` (restrita às categorias existentes) e `priority` (`LOW`/`MEDIUM`/`HIGH`).
- **Heurística de fallback**: procura no texto (sem acento, minúsculo) palavras associadas a cada categoria (ex.: "impressora"/"mouse" → Hardware; "internet"/"wifi" → Rede; "sistema"/"login" → Software; "acesso"/"cadastro" → Acesso; sem correspondência → "Outros") e à prioridade ("urgente"/"crítico"/"fora do ar" → `HIGH`; "lento"/"intermitente"/"às vezes" → `MEDIUM`; caso contrário `LOW`).

Essa combinação atende ao requisito com uma solução de verdade (Gemini) mas sem risco de indisponibilidade: o ponto de entrada único é `TicketTriageService.classify()`, e o `GeminiClassificationService` fica isolado — pra trocar de modelo/provedor no futuro, basta mexer nesse arquivo.

Ao criar um chamado, se o solicitante não informar `categoryId`/`priority`, o valor final é a sugestão da heurística (`classificationOrigin: "AI"`). Se informar, assume-se correção manual (`classificationOrigin: "MANUAL"`) — a sugestão da heurística continua registrada em `suggestedCategoryId`/`suggestedPriority` para auditoria. Um ADMIN também pode corrigir a classificação depois via `PATCH /tickets/:id`.

## Estrutura do projeto

```
app/
├── abilities/     # Abilities globais do Bouncer (vazio por ora — tudo via policies)
├── controllers/   # Controllers HTTP (herdam de BaseController)
├── error/         # AppError — erros de domínio com status HTTP
├── exceptions/    # Exception handler global
├── middleware/    # Middlewares HTTP (auth, bouncer, cors, etc.)
├── models/        # Models Lucid (herdam de BaseModel — soft delete)
├── policies/      # Autorização por papel (Bouncer)
├── services/      # Regras de negócio (herdam de BaseService)
├── utils/         # Busca fuzzy, helpers de string
└── validators/    # Schemas Zod (herdam de BaseValidator)

config/            # Configuração do AdonisJS (app, cors, database, etc.)
database/
├── migrations/
└── seeders/       # Categorias, usuários de teste e chamados de exemplo
start/
├── env.ts
├── kernel.ts      # Registro de middlewares
└── router/        # Rotas, um arquivo por entidade
```

Veja `CLAUDE.md` para detalhes do padrão MSC e das convenções do projeto.

## Rodando localmente

**Pré-requisitos:** Node.js 20.6+ (ideal: 20 LTS ou mais recente), Docker (para o PostgreSQL) — ou um PostgreSQL 16 já rodando localmente.

1. Suba o PostgreSQL: `docker compose up -d`
2. Copie `.env.example` para `.env` e ajuste se necessário
3. Instale as dependências: `npm install`
4. Rode as migrations: `node ace migration:run`
5. Popule o banco: `node ace db:seed`
6. Suba a API: `npm run dev` (fica em `http://localhost:3333`)

Ou rode tudo de uma vez com `./bootstrap.sh`.

Pra recomeçar do zero (apaga todos os dados e recria as tabelas + seeds): `node ace migration:fresh` seguido de `node ace db:seed`.

## Usuários de teste (via seed)

| Papel | E-mail | Senha |
|---|---|---|
| ADMIN | `admin@helpdesk.com` | `password123` |
| ADMIN | `admin2@helpdesk.com` | `password123` |
| REQUESTER | `solicitante1@helpdesk.com` | `password123` |
| REQUESTER | `solicitante2@helpdesk.com` até `solicitante5@helpdesk.com` | `password123` |

## Coleção Postman

[`docs/smart-helpdesk-api.postman_collection.json`](docs/smart-helpdesk-api.postman_collection.json) — importe no Postman (File → Import) pra testar todos os endpoints sem escrever nenhum curl.

- Ajuste a variável de coleção `base_url` se a API não estiver em `http://localhost:3333`.
- Rode **Auth → POST /auth/login** (já vem com as credenciais do seed do ADMIN) — o script de teste salva o JWT sozinho na variável `token`, usada em todas as outras requisições.
- Tem uma pasta **🧪 Fluxo Completo (Smoke Test)** que exercita o caminho inteiro em sequência (login solicitante → abrir chamado → comentar → login admin → mover status → fechar → tentar reabrir → conferir indicadores) e uma pasta **⚠️ Cenários de Erro** com os principais casos de validação/permissão (401/403/404/409/422).
- Todas as requests têm exemplos de resposta salvos (sucesso e erro) refletindo o formato real da API — inclusive as mensagens de validação em português.

## Endpoints

Todas as rotas (exceto `register`/`login`) exigem `Authorization: Bearer <token>`.

```bash
# Autenticação
curl -X POST http://localhost:3333/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Fulano","email":"fulano@helpdesk.com","password":"senhaforte123"}'

curl -X POST http://localhost:3333/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@helpdesk.com","password":"password123"}'

curl http://localhost:3333/api/v1/auth/me -H "Authorization: Bearer <token>"

# Chamados — ADMIN vê todos, REQUESTER só os próprios
curl http://localhost:3333/api/v1/tickets -H "Authorization: Bearer <token>"
curl "http://localhost:3333/api/v1/tickets?status=OPEN&priority=HIGH" -H "Authorization: Bearer <token>"

curl -X POST http://localhost:3333/api/v1/tickets \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"title":"Internet caiu","description":"A internet do setor esta fora do ar, urgente"}'

# Só ADMIN pode alterar status/responsável/categoria/prioridade
curl -X PATCH http://localhost:3333/api/v1/tickets/1 \
  -H "Authorization: Bearer <admin-token>" -H "Content-Type: application/json" \
  -d '{"status":"IN_PROGRESS","assigneeId":1}'

# Comentários/histórico de um chamado
curl http://localhost:3333/api/v1/tickets/1/comments -H "Authorization: Bearer <token>"
curl -X POST http://localhost:3333/api/v1/tickets/1/comments \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"content":"Alguém já está verificando?"}'

# Categorias — leitura para qualquer autenticado, escrita só ADMIN
curl http://localhost:3333/api/v1/categories -H "Authorization: Bearer <token>"

# Usuários — ADMIN vê/gerencia qualquer um, REQUESTER só o próprio
curl http://localhost:3333/api/v1/users -H "Authorization: Bearer <admin-token>"

# Só ADMIN cria usuário; e-mail precisa terminar em @helpdesk.com
curl -X POST http://localhost:3333/api/v1/users \
  -H "Authorization: Bearer <admin-token>" -H "Content-Type: application/json" \
  -d '{"name":"Fulano","email":"fulano@helpdesk.com","password":"senhaforte123","role":"REQUESTER"}'

# Indicadores em tempo real — contagem/percentual por status e prioridade + chamados ALTA/ABERTO
curl "http://localhost:3333/api/v1/tickets/stats" -H "Authorization: Bearer <token>"

# Relatório .xlsx (aba "Chamados" + aba "Resumo"), aceita os mesmos filtros da listagem
curl "http://localhost:3333/api/v1/tickets/report" -H "Authorization: Bearer <token>" -o relatorio.xlsx
```

## Regras de autorização e negócio implementadas

- REQUESTER só visualiza/gerencia os próprios chamados e comentários; ADMIN vê e gerencia todos.
- Só ADMIN altera status, responsável (`assigneeId`), categoria ou prioridade de um chamado — e só ADMIN altera o papel (`role`) de um usuário.
- Não é permitido reabrir um chamado com status `CLOSED`.
- Cadastro público (`/auth/register`) sempre cria um usuário `REQUESTER` — não é possível se auto-promover a ADMIN pelo payload.
- Só ADMIN cria usuário via `POST /users` (com papel à escolha, inclusive ADMIN).
- E-mail de usuário é único (constraint de banco + tratamento de erro 409) e precisa terminar em `@helpdesk.com` (validado no cadastro público e na criação pelo ADMIN).

## Scripts

```bash
npm run dev          # Servidor de desenvolvimento (HMR)
npm run build        # Build de produção
npm run lint         # ESLint
npm run format       # Prettier
npm run typecheck    # Checagem de tipos
```
