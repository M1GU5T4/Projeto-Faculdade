# Guia de Instalação — Sistema de Gestão Empresarial

Sistema ERP/CRM web construído com Next.js, Node.js/Express, Prisma e MySQL.

---

## Pré-requisitos

- [Docker](https://www.docker.com/products/docker-desktop) e Docker Compose
- [Node.js 18+](https://nodejs.org) (apenas para rodar o frontend em modo dev)
- [Git](https://git-scm.com)

---

## Subir o sistema completo (produção local)

Sobe banco de dados, backend e frontend com um único comando:

```bash
docker compose up --build
```

Na primeira execução demora alguns minutos (build das imagens). Nas próximas, usa cache e sobe em segundos.

Acesse em: **http://localhost**

---

## Modo desenvolvimento (recomendado para alterações no frontend)

Sobe apenas o banco e o backend via Docker, e o frontend roda local com hot reload:

**Terminal 1 — banco + backend:**
```bash
docker compose -f docker-compose.dev.yml up --build
```

**Terminal 2 — frontend com hot reload:**
```bash
cd FRONTEND
npm install
npm run dev
```

Acesse em: **http://localhost:3000**

Qualquer alteração nos arquivos do `FRONTEND/` reflete no browser instantaneamente, sem precisar rebuildar o Docker.

---

## Primeiro acesso — criar usuário administrador

O sistema não cria usuário automaticamente. Siga os passos:

**1. Abra a tela de cadastro**

Acesse `http://localhost:3000/login` (ou `http://localhost` no modo produção) e clique em **"Não tenho conta — Criar"**.

**2. Cadastre seu usuário**

Preencha nome, e-mail e senha e clique em **Criar conta**.

**3. Eleve o privilégio para ADMIN**

O usuário criado pela tela de cadastro tem role `USER` por padrão. Para ter acesso completo ao sistema, execute o comando abaixo no banco de dados, substituindo pelo e-mail que você cadastrou:

```sql
UPDATE users
SET role = 'ADMIN'
WHERE email = 'seu_email_cadastrado_aqui';
```

Você pode executar esse comando:
- No **DBeaver** conectando em `localhost:3306` com usuário `erp_user` / senha `erp_pass` / banco `erp_crm`
- Ou pelo terminal:

```bash
docker compose -f docker-compose.dev.yml exec mysql \
  mysql -u erp_user -perp_pass erp_crm \
  -e "UPDATE users SET role = 'ADMIN' WHERE email = 'seu_email_aqui';"
```

**4. Faça login normalmente**

Com o e-mail e senha que você cadastrou.

---

## Variáveis de ambiente

### Backend (`backend/.env`)
```env
DATABASE_URL="mysql://erp_user:erp_pass@localhost:3306/erp_crm"
JWT_SECRET="troque_por_uma_chave_segura_em_producao"
PORT=3002
NODE_ENV=development
ADMIN_EMAIL="seu@email.com"
ADMIN_PASSWORD="sua_senha"
```

Copie o modelo: `cp backend/.env.example backend/.env`

### Frontend (`FRONTEND/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

Copie o modelo: `cp FRONTEND/.env.example FRONTEND/.env.local`

---

## Estrutura do projeto

```
/
├── FRONTEND/                # Next.js 14 — interface web
│   ├── app/                 # Rotas (App Router)
│   ├── components/ui/       # Componentes shadcn/ui
│   └── services/api.ts      # Chamadas à API
├── backend/
│   ├── src/                 # Servidor Node.js/Express
│   ├── prisma/              # Schema e migrations MySQL
│   └── .env.example         # Modelo de variáveis
├── Dockerfile.backend       # Imagem do backend
├── Dockerfile.frontend      # Imagem do frontend (Next.js standalone)
├── docker-compose.yml       # Produção — todos os serviços
├── docker-compose.dev.yml   # Dev — só banco e backend
└── nginx.conf               # Proxy reverso
```

---

## Solução de problemas

**Backend em loop reiniciando**
```bash
docker compose -f docker-compose.dev.yml logs backend
```
Verifique o erro nos logs e se o MySQL está healthy.

**Erro de conexão com a API no frontend**
Certifique-se de que o arquivo `FRONTEND/.env.local` existe com `NEXT_PUBLIC_API_URL=http://localhost:3002` e que reiniciou o `npm run dev` após criá-lo.

**Porta 3306 já em uso**
Você tem MySQL instalado localmente rodando na mesma porta. Pare o serviço local:
```bash
# Linux
sudo systemctl stop mysql

# macOS
brew services stop mysql
```

**Rebuild só do backend**
```bash
docker compose -f docker-compose.dev.yml up --build backend
```
