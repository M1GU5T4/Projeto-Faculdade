# 📋 Documentação Técnica Completa — Sistema de Gestão Empresarial

> **Versão**: 2.1.0  
> **Autor**: HE Segurança  
> **Última atualização**: Maio 2026  
> **Tipo**: ERP/CRM Mobile  
> **Licença**: MIT

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Estrutura do Projeto](#3-estrutura-do-projeto)
4. [App Mobile (Frontend)](#4-app-mobile-frontend)
5. [Backend (API REST)](#5-backend-api-rest)
6. [Banco de Dados](#6-banco-de-dados)
7. [Autenticação e Segurança](#7-autenticação-e-segurança)
8. [Rotas da API](#8-rotas-da-api)
9. [Infraestrutura Docker](#9-infraestrutura-docker)
10. [Variáveis de Ambiente](#10-variáveis-de-ambiente)
11. [Como Rodar o Projeto](#11-como-rodar-o-projeto)
12. [Observações e Melhorias Futuras](#12-observações-e-melhorias-futuras)

---

## 1. Visão Geral

Sistema de Gestão Empresarial completo para dispositivos móveis (Android e iOS), com backend REST API. O sistema permite gerenciar:

- **Clientes** — cadastro e consulta
- **Ordens de Serviço** — agendamento e acompanhamento
- **Orçamentos** — criação, envio, aprovação e geração de PDF
- **Faturas** — faturamento, pagamentos parciais/totais
- **Projetos** — gestão com tarefas, despesas e anotações
- **Despesas** — controle financeiro com relatórios por categoria
- **Estoque** — categorias, itens, movimentações e relatórios
- **Dashboard** — métricas consolidadas e atividades recentes
- **Configurações** — tema, notificações, integração Gemini AI
- **Backup IA** — análise de dados e geração de código via Google Gemini

---

## 2. Stack Tecnológico

### Frontend (Mobile)

| Tecnologia | Versão | Função |
|---|---|---|
| **Expo** | 51.0.0 | Framework de desenvolvimento mobile |
| **React Native** | 0.74.5 | Renderização de UI nativa |
| **TypeScript** | 5.5.4 | Tipagem estática |
| **React Navigation** | v6 | Navegação (Bottom Tabs + Native Stack) |
| **Axios** | 1.15.0 | Cliente HTTP para API |
| **AsyncStorage** | 2.2.0 | Persistência local (token, sessão) |
| **Lucide React Native** | 0.451.0 | Ícones vetoriais |
| **React Native Reanimated** | 3.10.1 | Animações performáticas |
| **React Native Gesture Handler** | 2.16.1 | Gestos nativos |
| **Expo Secure Store** | 13.0.2 | Armazenamento seguro |
| **Expo File System** | 17.0.1 | Acesso a arquivos |
| **Expo Sharing** | 12.0.1 | Compartilhamento de arquivos |

### Backend

| Tecnologia | Versão | Função |
|---|---|---|
| **Node.js** | 18+ (Alpine) | Runtime JavaScript |
| **Express.js** | 4.18.2 | Framework HTTP |
| **TypeScript** | 5.3.3 | Tipagem estática |
| **Prisma ORM** | 5.7.1 | ORM e migrações de banco |
| **MySQL** | — | Banco de dados relacional |
| **JSON Web Token** | 9.0.2 | Autenticação JWT |
| **bcryptjs** | 2.4.3 | Hash de senhas |
| **Zod** | 3.22.4 | Validação de dados |
| **Helmet** | 7.1.0 | Headers de segurança |
| **PDFKit** | 0.17.2 | Geração de PDFs |
| **Puppeteer** | 24.26.1 | Renderização de PDFs avançada |
| **@google/generative-ai** | 0.24.1 | Integração Google Gemini AI |
| **tsx** | 4.20.6 | Execução TypeScript em dev (watch mode) |

### Containerização

| Tecnologia | Função |
|---|---|
| **Docker** | Containerização da aplicação |
| **Docker Compose** | Orquestração de serviços |
| **Nginx** | Proxy reverso (opcional) |

---

## 3. Estrutura do Projeto

```
teste-painel/
│
├── App.tsx                          # App principal: todas as telas e navegação
├── index.tsx                        # Entry point do Expo
├── types.ts                         # Interfaces e enums do domínio
├── package.json                     # Dependências do app mobile
├── app.json                         # Configuração do Expo
├── tsconfig.json                    # Configuração TypeScript
├── babel.config.js                  # Babel (preset Expo + Reanimated)
├── .env.example                     # Template de variáveis de ambiente
├── docker-compose.yml               # Orquestração Docker
├── Dockerfile.backend               # Dockerfile do backend
│
├── services/
│   ├── api.ts                       # Cliente HTTP Axios + todos os serviços
│   ├── geminiBackupService.ts       # Serviço de backup com Gemini AI
│   └── logger.ts                    # Logger do cliente
│
├── components/
│   └── native/
│       └── Login.native.tsx         # Tela de login/registro nativa
│
├── backend/
│   ├── package.json                 # Dependências do backend
│   ├── tsconfig.json                # Config TypeScript backend
│   ├── prisma/
│   │   ├── schema.prisma            # Schema do banco de dados
│   │   └── migrations/              # Migrações Prisma
│   └── src/
│       ├── server.ts                # Servidor Express (entry point)
│       ├── middleware/
│       │   ├── auth.ts              # Middleware de autenticação JWT
│       │   └── errorHandler.ts      # Handler centralizado de erros
│       ├── routes/
│       │   ├── auth.ts              # Rotas de autenticação
│       │   ├── clients.ts           # Rotas de clientes
│       │   ├── workOrders.ts        # Rotas de ordens de serviço
│       │   ├── quotes.ts            # Rotas de orçamentos
│       │   ├── invoices.ts          # Rotas de faturas
│       │   ├── projects.ts          # Rotas de projetos
│       │   ├── expenses.ts          # Rotas de despesas
│       │   ├── dashboard.ts         # Rotas do dashboard
│       │   ├── stock.ts             # Rotas de estoque
│       │   ├── settings-simple.ts   # Rotas de configurações (ativo)
│       │   ├── settings.ts          # Configurações com Prisma (inativo)
│       │   └── geminiBackup.ts      # Rotas de backup com IA
│       ├── services/
│       │   ├── geminiBackupService.ts
│       │   └── projectService.ts
│       ├── lib/
│       │   ├── prisma.ts            # Singleton do Prisma Client
│       │   └── logger.ts            # Logger do servidor
│       └── prisma/
│           └── seed.ts              # Script de seed do banco
```

---

## 4. App Mobile (Frontend)

### 4.1 Fluxo de Inicialização

```
index.tsx
  └─ import 'react-native-gesture-handler' (OBRIGATÓRIO ser primeiro)
  └─ registerRootComponent(App)
        │
        App.tsx
        ├─ useAppSession() → verifica token/user no AsyncStorage
        ├─ <SafeAreaProvider>
        │   └─ <NavigationContainer>
        │       ├─ NÃO autenticado → Stack Navigator → LoginScreen
        │       └─ Autenticado → Tab Navigator → MainApp (8 abas)
```

### 4.2 Navegação

| Aba | Ícone | Tela | Dados |
|---|---|---|---|
| Dashboard | 🏠 | `DashboardScreen` | Métricas consolidadas de todos os módulos |
| Clientes | 👥 | `ClientsScreen` | Lista de clientes (nome, email, telefone) |
| Orçamentos | 🧾 | `QuotesScreen` | Lista de orçamentos (número, status, total) |
| Faturas | 💳 | `InvoicesScreen` | Lista de faturas (número, status, total) |
| Projetos | ✅ | `ProjectsScreen` | Lista de projetos (nome, status, progresso) |
| Despesas | 💸 | `ExpensesScreen` | Lista de despesas (descrição, categoria, valor) |
| Estoque | 📦 | `StockScreen` | Lista de itens (nome, quantidade, preço) |
| Configurações | ⚙️ | `SettingsScreen` | Status da sessão + logout |

- **Cor ativa**: `#2563eb` (azul)
- **Cor inativa**: `#64748b` (cinza)
- **Headers ocultos** — cada tela usa seu próprio `ScreenShell`

### 4.3 Componentes Compartilhados

| Componente | Descrição |
|---|---|
| `ScreenShell` | Wrapper padrão de tela com barra de título e botão de ação |
| `StatCard` | Card de métrica para o dashboard com ícone emoji |
| `ListScreen<T>` | Lista genérica com FlatList, pull-to-refresh e estado vazio |
| `formatCurrency()` | Formatador de moeda BRL (`pt-BR`) |
| `Login.native.tsx` | Tela de login/registro completa com validação |

### 4.4 Cliente API (`services/api.ts`)

- **URL base**: variável `EXPO_PUBLIC_API_URL` (padrão: `http://localhost:3002`)
- **Interceptor de request**: injeta `Authorization: Bearer <token>` automaticamente
- **Interceptor de response**: limpa sessão em caso de 401/403 (auto-logout)
- **Storage**: `AsyncStorage` para persistir token e dados do usuário

#### Serviços disponíveis:

| Serviço | Endpoint base | Operações |
|---|---|---|
| `authService` | `/auth` | `login()`, `register()`, `logout()`, `getCurrentUser()` |
| `clientService` | `/clients` | `getAll()`, `create()`, `update()`, `delete()` |
| `workOrderService` | `/work-orders` | `getAll()`, `create()`, `update()`, `delete()` |
| `quoteService` | `/quotes` | CRUD + `convertToProject()`, `generatePDF()`, `getById()` |
| `invoiceService` | `/invoices` | CRUD + `markAsPaid()`, `getById()` |
| `projectService` | `/projects` | CRUD + tarefas, despesas, notas, `getReport()`, `getFinancialSummary()` |
| `expenseService` | `/expenses` | CRUD + `getByCategoryReport()` |
| `stockService` | `/stock` | Categorias CRUD, Itens CRUD, Movimentações, Relatórios |
| `settingsService` | `/settings` | `getSettings()`, `updateSettings()`, `testGeminiToken()`, `removeGeminiToken()` |

### 4.5 Tipos do Domínio (`types.ts`)

#### Enums

| Enum | Valores |
|---|---|
| `Status` | `PENDENTE`, `EM_ANDAMENTO`, `CONCLUIDO`, `CANCELADO` |
| `QuoteStatus` | `RASCUNHO`, `ENVIADO`, `APROVADO`, `REJEITADO` |
| `InvoiceStatus` | `RASCUNHO`, `PENDENTE`, `PAGO`, `ATRASADO`, `CANCELADO` |
| `ProjectStatus` | `NAO_INICIADO`, `EM_ANDAMENTO`, `CONCLUIDO` |
| `ProjectExpenseCategory` | `ALMOCO`, `DESLOCAMENTO`, `MATERIAL`, `OUTROS` |
| `ProjectNoteType` | `GERAL`, `PROGRESSO`, `PROBLEMA`, `OBSERVACAO` |
| `StockItemType` | `PRODUTO`, `MAO_DE_OBRA`, `METRO`, `EQUIPAMENTO`, `FERRAMENTA`, `MATERIAL` |
| `StockMovementType` | `ENTRADA`, `SAIDA`, `AJUSTE`, `TRANSFERENCIA` |

#### Entidades Principais

| Entidade | Campos Chave |
|---|---|
| `Client` | id, name, email, phone, address |
| `WorkOrder` | id, clientId, serviceType, technician, scheduledDate, status, value |
| `Quote` | id, quoteNumber, clientId, datas, lineItems[], subtotal, tax, total, status, notes |
| `Invoice` | id, invoiceNumber, quoteId?, clientId, datas, lineItems[], financeiros, status |
| `Project` | id, name, clientId, quoteId?, datas, status, progress, tasks[], expenses[], notes[] |
| `Task` | id, name, isCompleted, projectId |
| `Expense` | id, category, description, amount, date, invoiceId? |
| `StockItem` | id, name, categoryId, type, unit, price, quantity, minStock, maxStock |
| `StockMovement` | id, itemId, type, quantity, unitPrice, reason |

---

## 5. Backend (API REST)

### 5.1 Configuração do Servidor (`server.ts`)

| Configuração | Valor |
|---|---|
| **Porta** | `PORT` env var (padrão: `3001`, recomendado: `3002`) |
| **Body limit** | 10MB (JSON + URL-encoded) |
| **Segurança** | Helmet (CSP, HSTS 1 ano) |
| **CORS dev** | `localhost:3000, 3001, 4173-4175, 5173, 127.0.0.1:5500` |
| **CORS prod** | `FRONTEND_URL` |
| **Auth global** | Middleware em `/api/*` bloqueia sem Bearer token (exceto `/api/auth/*`) |
| **Shutdown** | Graceful em SIGINT/SIGTERM (desconecta Prisma) |

### 5.2 Middleware de Autenticação (`middleware/auth.ts`)

| Middleware | Função |
|---|---|
| `authenticateToken` | Extrai Bearer token → verifica JWT → carrega user do DB → `req.user` |
| `requireAdmin` | Bloqueia acesso se `role !== 'ADMIN'` |

### 5.3 Handler de Erros (`middleware/errorHandler.ts`)

| Tipo de Erro | Status HTTP | Resposta |
|---|---|---|
| `ZodError` | 400 | Detalhes de validação por campo |
| Prisma `P2002` | 409 | Violação de constraint única |
| Prisma `P2025` | 404 | Registro não encontrado |
| Auth 401/403 | 401/403 | Não autorizado / Proibido |
| Outros | 500 | Erro genérico (mensagem oculta em produção) |

---

## 6. Banco de Dados

### 6.1 Configuração

- **Provider**: MySQL
- **ORM**: Prisma 5.7.1
- **IDs**: CUID (strings) em todas as tabelas
- **Timestamps**: `createdAt` (auto) + `updatedAt` (auto) na maioria dos modelos

### 6.2 Modelos (16 total)

#### Diagrama de Relacionamentos

```
┌─────────┐     ┌──────────────┐     ┌─────────────────┐
│  User   │     │    Client    │────→│   WorkOrder     │
│─────────│     │──────────────│     │─────────────────│
│ id      │     │ id           │     │ id, clientId    │
│ email ⊕ │     │ name         │     │ serviceType     │
│ password│     │ email ⊕      │     │ technician      │
│ name    │     │ phone        │     │ scheduledDate   │
│ role    │     │ address      │     │ status, value   │
└─────────┘     └──────┬───────┘     └─────────────────┘
                       │
          ┌────────────┼────────────┐
          ↓            ↓            ↓
   ┌──────────┐  ┌──────────┐  ┌──────────────┐
   │  Quote   │  │ Invoice  │  │   Project    │
   │──────────│  │──────────│  │──────────────│
   │ quoteNum⊕│  │ invNum ⊕ │  │ name         │
   │ clientId │  │ clientId │  │ clientId     │
   │ quoteId? │→→│ quoteId? │  │ quoteId?     │
   │ dates    │  │ dates    │  │ dates        │
   │ financ.  │  │ financ.  │  │ status       │
   │ status   │  │ status   │  │ progress     │
   │ notes    │  │ amtPaid  │  │ budget?      │
   └────┬─────┘  └────┬─────┘  └──┬───┬───┬───┘
        │              │           │   │   │
        ↓              ↓           ↓   ↓   ↓
  QuoteLineItem  InvoiceLineItem  Task │ ProjectNote
    │ quoteId      │ invoiceId    │    │   │ projectId
    │ stockItemId? │ stockItemId? │    │   │ title
    │ desc,qty     │ desc,qty     │    │   │ content
    │ unitPrice    │ unitPrice    │    │   │ type
    │ total        │ total        │    │
    └──────┬───────┴──────┬──────┘    ↓
           │              │     ProjectExpense
           ↓              ↓       │ projectId
     ┌──────────────┐             │ category
     │  StockItem   │   Expense   │ amount
     │──────────────│   │ category│ date
     │ name         │   │ desc    │ receipt?
     │ categoryId   │   │ amount  │
     │ type, unit   │   │ date    │
     │ price, qty   │   │ invoiceId?
     │ min/maxStock │   └─────────┘
     │ barcode?     │
     │ supplier?    │
     └──────┬───────┘
            │
            ↓
     StockMovement
       │ itemId
       │ type (ENTRADA/SAIDA/AJUSTE/TRANSFERENCIA)
       │ quantity, unitPrice
       │ reason?, reference?
       │ userId? (sem relation formal)

  StockCategory ──→ StockItem (1:N, cascade)
  UserSettings (standalone, userId sem @relation)
```

#### Tabela de Modelos

| # | Modelo | Tabela | Relações |
|---|---|---|---|
| 1 | `User` | `users` | Standalone |
| 2 | `Client` | `clients` | → WorkOrders, Quotes, Invoices, Projects |
| 3 | `WorkOrder` | `work_orders` | ← Client (cascade) |
| 4 | `Quote` | `quotes` | ← Client (cascade), → QuoteLineItems, Invoices, Projects |
| 5 | `QuoteLineItem` | `quote_line_items` | ← Quote (cascade), → StockItem? |
| 6 | `Invoice` | `invoices` | ← Client (cascade), ← Quote?, → InvoiceLineItems, Expenses |
| 7 | `InvoiceLineItem` | `invoice_line_items` | ← Invoice (cascade), → StockItem? |
| 8 | `Project` | `projects` | ← Client (cascade), ← Quote?, → Tasks, ProjectExpenses, ProjectNotes |
| 9 | `Task` | `tasks` | ← Project (cascade) |
| 10 | `ProjectExpense` | `project_expenses` | ← Project (cascade) |
| 11 | `ProjectNote` | `project_notes` | ← Project (cascade) |
| 12 | `Expense` | `expenses` | ← Invoice? (sem cascade) |
| 13 | `StockCategory` | `stock_categories` | → StockItems |
| 14 | `StockItem` | `stock_items` | ← StockCategory (cascade), → StockMovements, LineItems |
| 15 | `StockMovement` | `stock_movements` | ← StockItem (cascade) |
| 16 | `UserSettings` | `user_settings` | Standalone (userId sem @relation) |

#### Estratégia de Cascade Delete

- **Com cascade**: Client→filhos, Quote→LineItems, Invoice→LineItems, Project→filhos, StockCategory→Items, StockItem→Movements
- **Sem cascade**: Invoice→Quote, Expense→Invoice, LineItems→StockItem (preserva integridade)

---

## 7. Autenticação e Segurança

### 7.1 Fluxo de Autenticação

```
┌──────────────────┐     POST /api/auth/login      ┌───────────────┐
│   App Mobile     │ ────────────────────────────→  │   Backend     │
│                  │   { email, password }           │               │
│                  │                                 │ bcrypt.compare│
│                  │  ←──────────────────────────── │ jwt.sign()    │
│  AsyncStorage    │   { user, token (7d) }         │               │
│  ├─ @auth_token  │                                │               │
│  └─ @auth_user   │                                │               │
└──────────────────┘                                └───────────────┘
         │
         │  Todas as requests subsequentes:
         │  Authorization: Bearer <token>
         ↓
┌──────────────────┐     GET /api/clients           ┌───────────────┐
│   Axios          │ ────────────────────────────→  │ authenticateToken│
│   Interceptor    │   Header: Bearer <token>       │   ↓            │
│   (auto-inject)  │                                │ jwt.verify()   │
│                  │  ←──────────────────────────── │ prisma.user    │
│   401/403?       │   200 + dados                  │ req.user = {}  │
│   → clearSession │                                └───────────────┘
└──────────────────┘
```

### 7.2 JWT

| Configuração | Valor |
|---|---|
| **Algoritmo** | HS256 (padrão jsonwebtoken) |
| **Payload** | `{ userId: string }` |
| **Expiração** | 7 dias |
| **Secret** | `JWT_SECRET` (variável de ambiente) |

### 7.3 Segurança do Servidor

| Medida | Implementação |
|---|---|
| **Helmet** | CSP, HSTS (1 ano, includeSubDomains, preload) |
| **CORS** | Origens restritas por ambiente |
| **Guard global** | Middleware em `/api/*` bloqueia sem token (exceto `/api/auth/*`) |
| **Hash de senha** | bcryptjs com salt rounds padrão |
| **Rate limiting** | Via Nginx (10 req/s API, 5 req/min login) |
| **Validação** | Zod em todas as rotas de escrita |

---

## 8. Rotas da API

### Resumo

| Módulo | Prefixo | Endpoints | Auth |
|---|---|---|---|
| Health | `/health` | 1 | ❌ |
| Auth | `/api/auth` | 2 | ❌ |
| Clientes | `/api/clients` | 4 | ✅ |
| Ordens de Serviço | `/api/work-orders` | 4 | ✅ |
| Orçamentos | `/api/quotes` | 8 | ✅ |
| Faturas | `/api/invoices` | 6 | ✅ |
| Projetos | `/api/projects` | 16 | ✅ |
| Despesas | `/api/expenses` | 6 | ✅ |
| Dashboard | `/api/dashboard` | 2 | ✅ |
| Configurações | `/api/settings` | 4 | ✅ |
| Estoque | `/api/stock` | 13 | ✅ |
| Gemini Backup | `/api/gemini-backup` | 7 | ✅ |
| **TOTAL** | | **73** | |

---

### 8.1 Health Check

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Verifica se o servidor está online |

**Resposta**: `{ status: "OK", timestamp: "ISO string" }`

---

### 8.2 Autenticação (`/api/auth`)

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/auth/register` | Registrar novo usuário |
| `POST` | `/api/auth/login` | Login com credenciais |

#### `POST /api/auth/register`

**Body** (Zod):

| Campo | Tipo | Regras |
|---|---|---|
| `name` | string | mín. 2 caracteres |
| `email` | string | email válido, único |
| `password` | string | mín. 6 caracteres |

**Resposta** `201`:
```json
{
  "user": { "id": "cuid", "name": "...", "email": "...", "role": "USER" },
  "token": "jwt-token-7d"
}
```

#### `POST /api/auth/login`

**Body** (Zod):

| Campo | Tipo | Regras |
|---|---|---|
| `email` | string | email válido |
| `password` | string | mín. 1 caractere |

**Resposta** `200`:
```json
{
  "user": { "id": "cuid", "name": "...", "email": "...", "role": "USER|ADMIN" },
  "token": "jwt-token-7d"
}
```

**Erros**: `401` credenciais inválidas, `400` validação, `500` erro interno

---

### 8.3 Clientes (`/api/clients`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/clients` | Listar todos os clientes |
| `POST` | `/api/clients` | Criar cliente |
| `PUT` | `/api/clients/:id` | Atualizar cliente |
| `DELETE` | `/api/clients/:id` | Excluir cliente |

**Body (POST/PUT)**:

| Campo | Tipo | Regras |
|---|---|---|
| `name` | string | mín. 2 caracteres |
| `email` | string | email válido |
| `phone` | string | obrigatório |
| `address` | string | obrigatório |

---

### 8.4 Ordens de Serviço (`/api/work-orders`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/work-orders` | Listar ordens (com dados do cliente) |
| `POST` | `/api/work-orders` | Criar ordem de serviço |
| `PUT` | `/api/work-orders/:id` | Atualizar ordem |
| `DELETE` | `/api/work-orders/:id` | Excluir ordem |

**Body (POST/PUT)**:

| Campo | Tipo | Regras |
|---|---|---|
| `clientId` | string | ID do cliente |
| `serviceType` | string | mín. 2 caracteres |
| `technician` | string | mín. 2 caracteres |
| `scheduledDate` | string | data válida |
| `status` | string | opcional (padrão: `"PENDENTE"`) |
| `value` | number | positivo |

---

### 8.5 Orçamentos (`/api/quotes`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/quotes` | Listar todos os orçamentos |
| `GET` | `/api/quotes/approved` | Listar aprovados sem fatura |
| `GET` | `/api/quotes/:id` | Obter orçamento por ID |
| `GET` | `/api/quotes/:id/pdf` | Gerar e baixar PDF do orçamento |
| `POST` | `/api/quotes` | Criar orçamento |
| `POST` | `/api/quotes/:id/convert-to-project` | Converter orçamento em projeto |
| `PUT` | `/api/quotes/:id` | Atualizar orçamento |
| `DELETE` | `/api/quotes/:id` | Excluir orçamento |

**Body (POST/PUT)**:

| Campo | Tipo | Regras |
|---|---|---|
| `quoteNumber` | string | único, mín. 1 caractere |
| `clientId` | string | ID do cliente |
| `issueDate` | string | data de emissão |
| `expiryDate` | string | data de expiração |
| `lineItems` | array | mín. 1 item (ver abaixo) |
| `tax` | number | opcional, ≥ 0 |
| `status` | enum | `RASCUNHO` \| `ENVIADO` \| `APROVADO` \| `REJEITADO` |
| `notes` | string? | opcional |

**Line Item**:

| Campo | Tipo | Regras |
|---|---|---|
| `stockItemId` | string? | opcional (vínculo com estoque) |
| `description` | string | mín. 1 caractere |
| `quantity` | number | positivo |
| `unitPrice` | number | positivo |
| `total` | number? | calculado automaticamente |

> O servidor calcula `subtotal`, `tax` e `total` automaticamente.

#### `POST /api/quotes/:id/convert-to-project`

Converte orçamento aprovado em projeto. Cria tarefas a partir dos itens e uma nota inicial.

**Body** (opcional):

| Campo | Tipo | Regras |
|---|---|---|
| `projectName` | string? | padrão: `"Projeto - {quoteNumber}"` |
| `startDate` | string? | padrão: data atual |
| `endDate` | string? | opcional |
| `description` | string? | opcional |

**Condição**: orçamento deve estar `APROVADO` e não convertido.

#### `GET /api/quotes/:id/pdf`

Gera PDF via PDFKit com: cabeçalho da empresa ("HE SEGURANÇA ELETRÔNICA"), dados do cliente, tabela de itens, totais, notas/condições e rodapé. Retorna `Content-Type: application/pdf`.

---

### 8.6 Faturas (`/api/invoices`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/invoices` | Listar todas as faturas |
| `GET` | `/api/invoices/:id` | Obter fatura por ID |
| `POST` | `/api/invoices` | Criar fatura |
| `PUT` | `/api/invoices/:id` | Atualizar fatura |
| `PATCH` | `/api/invoices/:id/pay` | Registrar pagamento |
| `DELETE` | `/api/invoices/:id` | Excluir fatura |

**Body (POST/PUT)**:

| Campo | Tipo | Regras |
|---|---|---|
| `invoiceNumber` | string | único, mín. 1 caractere |
| `clientId` | string | ID do cliente |
| `quoteId` | string? | opcional (vínculo com orçamento) |
| `issueDate` | string | data de emissão |
| `dueDate` | string | data de vencimento |
| `lineItems` | array | mín. 1 item |
| `tax` | number? | opcional, ≥ 0 |
| `amountPaid` | number? | opcional, ≥ 0 |
| `status` | enum? | `RASCUNHO` \| `PENDENTE` \| `PAGO` \| `ATRASADO` \| `CANCELADO` |

#### `PATCH /api/invoices/:id/pay`

| Campo | Tipo | Regras |
|---|---|---|
| `amountPaid` | number? | valor a pagar (padrão: total da fatura) |

**Lógica**: Soma `amountPaid` ao valor já pago. Se total pago ≥ total da fatura → status `PAGO`, senão `PENDENTE`.

---

### 8.7 Projetos (`/api/projects`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/projects` | Listar projetos com estatísticas |
| `GET` | `/api/projects/:id` | Obter projeto por ID com estatísticas |
| `GET` | `/api/projects/:id/expenses` | Listar despesas do projeto |
| `GET` | `/api/projects/:id/notes` | Listar notas do projeto |
| `GET` | `/api/projects/:id/report` | Relatório completo do projeto |
| `POST` | `/api/projects` | Criar projeto |
| `POST` | `/api/projects/:id/expenses` | Adicionar despesa ao projeto |
| `POST` | `/api/projects/:id/notes` | Adicionar nota ao projeto |
| `PUT` | `/api/projects/:id` | Atualizar projeto |
| `PUT` | `/api/projects/:id/expenses/:expenseId` | Atualizar despesa do projeto |
| `PUT` | `/api/projects/:id/notes/:noteId` | Atualizar nota do projeto |
| `PATCH` | `/api/projects/:projectId/tasks/:taskId` | Alternar conclusão de tarefa |
| `PATCH` | `/api/projects/:id/progress` | Atualizar progresso (%) |
| `DELETE` | `/api/projects/:id` | Excluir projeto |
| `DELETE` | `/api/projects/:id/expenses/:expenseId` | Excluir despesa do projeto |
| `DELETE` | `/api/projects/:id/notes/:noteId` | Excluir nota do projeto |

**Body Projeto (POST)**:

| Campo | Tipo | Regras |
|---|---|---|
| `name` | string | mín. 2 caracteres |
| `clientId` | string | ID do cliente |
| `quoteId` | string? | opcional |
| `startDate` | string | data de início |
| `endDate` | string? | opcional |
| `status` | enum? | `NAO_INICIADO` \| `EM_ANDAMENTO` \| `CONCLUIDO` |
| `description` | string? | opcional |
| `progress` | number? | 0–100 |
| `budget` | number? | positivo |
| `tasks` | array? | `{ name: string, isCompleted?: boolean }` |

**Body Despesa do Projeto**:

| Campo | Tipo | Regras |
|---|---|---|
| `category` | string | mín. 1 caractere |
| `description` | string | mín. 1 caractere |
| `amount` | number | positivo |
| `date` | string | data |
| `receipt` | string? | opcional |

**Body Nota do Projeto**:

| Campo | Tipo | Regras |
|---|---|---|
| `title` | string | mín. 1 caractere |
| `content` | string | mín. 1 caractere |
| `type` | enum? | `GERAL` \| `PROGRESSO` \| `PROBLEMA` \| `OBSERVACAO` |

**Campos calculados** (GET): `taskProgress` (%), `totalExpenses`, `daysRemaining`, `isOverdue`

---

### 8.8 Despesas (`/api/expenses`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/expenses` | Listar despesas (com filtros) |
| `GET` | `/api/expenses/:id` | Obter despesa por ID |
| `GET` | `/api/expenses/reports/by-category` | Relatório por categoria |
| `POST` | `/api/expenses` | Criar despesa |
| `PUT` | `/api/expenses/:id` | Atualizar despesa |
| `DELETE` | `/api/expenses/:id` | Excluir despesa |

**Query params (GET lista)**:

| Param | Tipo | Descrição |
|---|---|---|
| `category` | string | Filtrar por categoria |
| `startDate` | string | Data inicial (≥) |
| `endDate` | string | Data final (≤) |

**Body (POST/PUT)**:

| Campo | Tipo | Regras |
|---|---|---|
| `category` | string | mín. 1 caractere |
| `description` | string | mín. 2 caracteres |
| `amount` | number | positivo |
| `date` | string | data |
| `invoiceId` | string? | opcional (valida existência) |

---

### 8.9 Dashboard (`/api/dashboard`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/dashboard/metrics` | KPIs do dashboard |
| `GET` | `/api/dashboard/recent-activities` | Atividades recentes |

#### `GET /api/dashboard/metrics`

```json
{
  "revenue": {
    "current": 15000.00,
    "growth": 12.5,
    "monthly": [
      { "month": "jan. 2026", "revenue": 12000 },
      { "month": "fev. 2026", "revenue": 13500 }
    ]
  },
  "expenses": { "current": 5000.00 },
  "workOrders": {
    "byStatus": { "PENDENTE": 5, "CONCLUIDO": 12, "EM_ANDAMENTO": 3 }
  },
  "counts": {
    "pendingInvoices": 8,
    "activeProjects": 4,
    "totalClients": 25
  }
}
```

#### `GET /api/dashboard/recent-activities`

```json
{
  "invoices": [/* 5 mais recentes com client.name */],
  "workOrders": [/* 5 mais recentes com client.name */],
  "quotes": [/* 5 mais recentes com client.name */]
}
```

---

### 8.10 Configurações (`/api/settings`)

> ⚠️ Usa armazenamento **em memória**. Dados perdidos ao reiniciar o servidor.

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/settings` | Obter configurações do usuário |
| `PUT` | `/api/settings` | Atualizar configurações |
| `POST` | `/api/settings/test-gemini` | Testar chave API do Gemini |
| `DELETE` | `/api/settings/gemini-token` | Remover chave do Gemini |

**Resposta padrão (GET)**:
```json
{
  "theme": "light",
  "notifications": {
    "newQuotes": true,
    "overdueInvoices": true,
    "weeklyReports": false
  }
}
```

**Body (PUT)**:

| Campo | Tipo | Regras |
|---|---|---|
| `geminiApiKey` | string? | chave da API Gemini |
| `theme` | string? | tema visual |
| `notifications` | object? | `{ newQuotes, overdueInvoices, weeklyReports }` |

> A `geminiApiKey` é retornada mascarada (primeiros 8 + `***` + últimos 8 caracteres).

---

### 8.11 Estoque (`/api/stock`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/stock/categories` | Listar categorias |
| `POST` | `/api/stock/categories` | Criar categoria |
| `PUT` | `/api/stock/categories/:id` | Atualizar categoria |
| `DELETE` | `/api/stock/categories/:id` | Excluir categoria (bloqueado se tem itens) |
| `GET` | `/api/stock/items` | Listar itens (com filtros) |
| `GET` | `/api/stock/items/:id` | Obter item por ID |
| `POST` | `/api/stock/items` | Criar item |
| `PUT` | `/api/stock/items/:id` | Atualizar item |
| `DELETE` | `/api/stock/items/:id` | Excluir item |
| `GET` | `/api/stock/movements` | Listar movimentações (com filtros) |
| `POST` | `/api/stock/movements` | Criar movimentação |
| `GET` | `/api/stock/reports/stock` | Relatório de inventário |
| `GET` | `/api/stock/reports/movements` | Relatório de movimentações |

**Query params (GET items)**:

| Param | Tipo | Descrição |
|---|---|---|
| `categoryId` | string | Filtrar por categoria |
| `type` | string | Filtrar por tipo |
| `lowStock` | `"true"` | Apenas itens com estoque baixo |
| `search` | string | Busca em nome, descrição, código de barras |

**Body Item (POST/PUT)**:

| Campo | Tipo | Regras |
|---|---|---|
| `name` | string | mín. 1 caractere |
| `description` | string? | opcional |
| `categoryId` | string | ID da categoria (deve existir) |
| `type` | string | tipo do item (auto-uppercase) |
| `unit` | string | unidade de medida (auto-uppercase) |
| `price` | number | ≥ 0 |
| `quantity` | number? | ≥ 0 (padrão: 0) |
| `minStock` | number? | estoque mínimo |
| `maxStock` | number? | estoque máximo (≥ minStock) |
| `barcode` | string? | código de barras |
| `supplier` | string? | fornecedor |
| `location` | string? | localização |
| `isActive` | boolean? | ativo (padrão: true) |

**Body Movimentação (POST)**:

| Campo | Tipo | Regras |
|---|---|---|
| `itemId` | string | ID do item (deve existir) |
| `type` | enum | `ENTRADA` \| `SAIDA` \| `AJUSTE` \| `TRANSFERENCIA` |
| `quantity` | number | positivo |
| `unitPrice` | number? | ≥ 0 (padrão: preço do item) |
| `reason` | string? | motivo |
| `reference` | string? | referência |

**Lógica de movimentação** (transação Prisma):
- `ENTRADA` → soma à quantidade
- `SAIDA` / `TRANSFERENCIA` → subtrai (erro 400 se insuficiente)
- `AJUSTE` → define quantidade diretamente

**Relatório de inventário (`GET /api/stock/reports/stock`)**:
```json
{
  "summary": { "totalItems": 50, "totalValue": 25000, "lowStockCount": 5, "categoriesCount": 8 },
  "byCategory": { "Câmeras": { "count": 10, "value": 8000, "items": [...] } },
  "byType": { "PRODUTO": { "count": 30, "value": 15000 } },
  "lowStockItems": [...]
}
```

---

### 8.12 Gemini Backup (`/api/gemini-backup`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/gemini-backup/status` | Status do serviço Gemini |
| `POST` | `/api/gemini-backup/request` | Enviar requisição de backup IA |
| `POST` | `/api/gemini-backup/analyze` | Análise rápida de dados |
| `POST` | `/api/gemini-backup/generate-code` | Gerar código via IA |
| `POST` | `/api/gemini-backup/resolve-error` | Resolver erros via IA |
| `POST` | `/api/gemini-backup/full-backup` | Backup completo dos dados |
| `POST` | `/api/gemini-backup/complete-feature` | Completar funcionalidade via IA |

> Todos retornam `503` se `GEMINI_API_KEY` não estiver configurada.

**Body `/request`**:

| Campo | Tipo | Regras |
|---|---|---|
| `type` | enum | `data_analysis` \| `code_generation` \| `error_resolution` \| `feature_completion` \| `data_backup` |
| `context` | any? | contexto adicional |
| `requirements` | string | mín. 10 caracteres |
| `fallbackData` | any? | dados de fallback |

---

## 9. Infraestrutura Docker

### 9.1 Docker Compose (Produção)

```yaml
services:
  backend:
    build: Dockerfile.backend
    container_name: orcamento_backend
    restart: unless-stopped
    ports: 3002:3002
    environment:
      DATABASE_URL: "file:/app/backend/data/dev.db"
      JWT_SECRET: ${JWT_SECRET:-super_secret_32_chars_min}
      ADMIN_EMAIL: ${ADMIN_EMAIL:-admin@yourcompany.com}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD:-admin1234}
      NODE_ENV: production
    volumes:
      - sqlite_data:/app/backend/data
    networks:
      - app-network
```

### 9.2 Dockerfile.backend

```
FROM node:18-alpine
├── Instala: curl, git, bash
├── npm ci --only=production
├── prisma generate
├── tsc (compilação TypeScript)
├── Usuário não-root: nodejs (UID 1001)
├── EXPOSE 3002
└── CMD: npm start → node dist/server.js
```

### 9.3 Nginx (Proxy Reverso)

| Recurso | Configuração |
|---|---|
| Frontend | `location /` → proxy para `app:3001` |
| API | `location /api/` → proxy para `app:3002` |
| Rate limit API | 10 req/s (burst 20) |
| Rate limit Login | 5 req/min (burst 5) |
| HTTPS | TLS 1.2/1.3, HSTS |
| Gzip | Habilitado para text/css/js/json |
| Cache estático | 1 ano com `immutable` |

---

## 10. Variáveis de Ambiente

### App Mobile (`.env`)

| Variável | Exemplo | Descrição |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `http://localhost:3002/api` | URL da API backend |

### Backend (`backend/.env`)

| Variável | Padrão | Descrição |
|---|---|---|
| `DATABASE_URL` | `mysql://root:@localhost:3306/erp_crm` | Conexão com banco MySQL |
| `JWT_SECRET` | *(obrigatório)* | Chave secreta para assinar tokens JWT |
| `PORT` | `3002` | Porta do servidor |
| `NODE_ENV` | `development` | Ambiente (`development` / `production`) |
| `GEMINI_API_KEY` | — | Chave API do Google Gemini |
| `FRONTEND_URL` | `http://localhost:5173` | URL do frontend para CORS (produção) |
| `ADMIN_EMAIL` | `admin@admin.com` | Email do admin para seed |
| `ADMIN_PASSWORD` | `admin` | Senha do admin para seed |
| `ADMIN_NAME` | `Administrator` | Nome do admin para seed |
| `RUN_SEED` | `false` | Executar seed no startup do container |

---

## 11. Como Rodar o Projeto

### 11.1 Pré-requisitos

- Node.js 18+
- MySQL (ou MariaDB) rodando localmente
- Android Studio (emulador Android) e/ou Xcode (simulador iOS)
- Expo Go no dispositivo físico (opcional)

### 11.2 Instalação

```bash
# Raiz do projeto (app mobile)
npm install --legacy-peer-deps

# Backend
cd backend
npm install
```

### 11.3 Configuração do Banco

```bash
cd backend

# Criar arquivo .env
cp .env.example .env
# Editar DATABASE_URL e JWT_SECRET

# Gerar Prisma Client
npx prisma generate

# Aplicar schema ao banco
npx prisma db push

# (Opcional) Seed com dados iniciais
npm run db:seed
```

### 11.4 Executar

```bash
# Terminal 1 — Backend
cd backend
npm run dev
# Servidor roda em http://localhost:3002

# Terminal 2 — App Mobile
npm start
# Expo abre no terminal, escolha:
#   a → Android emulator
#   i → iOS simulator
#   Scan QR → Expo Go no celular
```

Ou em um único terminal:

```bash
npm run dev
# Roda backend + Expo concorrentemente
```

### 11.5 Verificação

1. Acesse `http://localhost:3002/health` — deve retornar `{ status: "OK" }`
2. Abra o app no emulador/dispositivo
3. Faça login com as credenciais de seed
4. Navegue pelas abas para verificar comunicação com a API

### 11.6 Docker (Produção)

```bash
# Criar .env na raiz com variáveis de produção
docker-compose up -d --build
# Backend disponível em http://localhost:3002
```

---

## 12. Observações e Melhorias Futuras

### Problemas Conhecidos

| # | Severidade | Problema |
|---|---|---|
| 1 | 🔴 Alta | **Mismatch de provider**: `schema.prisma` usa `mysql`, mas `docker-compose.yml` configura SQLite (`file:` URL). Necessário alinhar. |
| 2 | 🟡 Média | **Settings em memória**: `settings-simple.ts` perde dados ao reiniciar. Considerar usar `settings.ts` (com Prisma) em produção. |
| 3 | 🟡 Média | **Telas somente leitura**: O app mobile apenas exibe listas — não possui formulários de criação/edição/exclusão para a maioria dos módulos. |
| 4 | 🟡 Média | **Sem gerenciamento de estado**: Usa `useState` + `useEffect` direto — cada tela busca dados independentemente. |
| 5 | 🟢 Baixa | **Credenciais de demo hardcoded**: Login pré-preenchido com `admin@admin.com`. Remover em produção. |
| 6 | 🟢 Baixa | **Tipos `any`**: Métodos `create`/`update` dos serviços aceitam `any`. |
| 7 | 🟢 Baixa | **Arquivo monolítico**: `App.tsx` contém todas as telas (~340 linhas). Considerar separar em `screens/`. |
| 8 | 🟢 Baixa | **Arquivos órfãos**: `mockData.ts`, `utils/preload.ts`, `settings.ts` (não montado), scripts `.bat` e `.sql` podem ser removidos. |

### Sugestões de Evolução

1. **Formulários mobile** — Implementar criação/edição/exclusão em todas as telas
2. **Gerenciamento de estado** — Adotar Context API, Zustand ou Redux Toolkit
3. **Separação de telas** — Criar diretório `screens/` com uma tela por arquivo
4. **Tratamento de erros na UI** — Exibir alertas/toasts quando a API falha
5. **Push notifications** — Integrar Expo Notifications para lembretes
6. **Cache offline** — Implementar cache local com sincronização
7. **Testes** — Adicionar testes unitários (Jest) e E2E (Detox)
8. **CI/CD** — Configurar build automático com EAS Build
9. **Settings persistentes** — Migrar para a versão Prisma das configurações
10. **Validação consistente** — Usar Zod também no cliente mobile

---

> **Nota**: Esta documentação reflete o estado atual do repositório após a migração de SPA web para app mobile Expo. O backend permanece funcional e compatível com ambas as plataformas.
