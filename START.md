# 🚀 Guia de Instalação — Sistema de Gestão Empresarial

Este guia explica como configurar e rodar o projeto do zero após clonar o repositório.

---

## 📋 Pré-requisitos

Antes de começar, instale as ferramentas abaixo no seu computador.

---

### 1. Node.js (versão 18 ou superior)

Acesse [https://nodejs.org](https://nodejs.org) e baixe a versão **LTS**.

Para verificar se já está instalado:
```bash
node -v
npm -v
```
Ambos devem retornar uma versão. Ex: `v20.11.0` e `10.2.4`.

---

### 2. Git

Acesse [https://git-scm.com](https://git-scm.com) e instale.

Para verificar:
```bash
git --version
```

---

### 3. MySQL (versão 8 ou superior)

O backend usa MySQL como banco de dados.

- **Windows/macOS**: Baixe o instalador em [https://dev.mysql.com/downloads/mysql](https://dev.mysql.com/downloads/mysql)
- **macOS com Homebrew**:
  ```bash
  brew install mysql
  brew services start mysql
  ```
- **Linux (Ubuntu/Debian)**:
  ```bash
  sudo apt update
  sudo apt install mysql-server
  sudo systemctl start mysql
  ```

Durante a instalação, anote o **usuário** (padrão: `root`) e a **senha** que você definir.

---

### 4. Expo Go (no celular)

Para rodar o app no seu smartphone:

- **iPhone**: Baixe o **Expo Go** na [App Store](https://apps.apple.com/app/expo-go/id982107779)
- **Android**: Baixe o **Expo Go** no [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

> ⚠️ O app no celular e o projeto precisam estar na **mesma rede Wi-Fi**.

---

## 📥 Clonando o Repositório

```bash
git clone https://github.com/seu-usuario/seu-repositorio.git
cd seu-repositorio
```

---

## ⚙️ Configuração do Backend

### 1. Entrar na pasta do backend e instalar dependências

```bash
cd backend
npm install
```

### 2. Criar o arquivo de variáveis de ambiente

```bash
cp .env.example .env
```

Abra o arquivo `backend/.env` em qualquer editor de texto e preencha com os dados do seu MySQL:

```env
DATABASE_URL="mysql://root:SUA_SENHA@localhost:3306/erp_crm"
JWT_SECRET="uma_chave_secreta_qualquer_mude_isso"
PORT=3002
NODE_ENV=development
```

> Substitua `SUA_SENHA` pela senha do seu MySQL. Se não tiver senha, deixe vazio: `mysql://root:@localhost:3306/erp_crm`

### 3. Criar o banco de dados no MySQL

Acesse o MySQL pelo terminal:

```bash
mysql -u root -p
```

Dentro do MySQL, execute:

```sql
CREATE DATABASE erp_crm;
EXIT;
```

### 4. Rodar as migrations (criar as tabelas)

De volta no terminal, ainda dentro da pasta `backend`:

```bash
npx prisma migrate deploy
```

Você verá as tabelas sendo criadas. Se tudo correr bem, aparecerá uma mensagem de sucesso.

### 5. Iniciar o backend

```bash
npm start
```

O servidor vai iniciar na porta `3002`. Você verá no terminal:
```
🚀 Servidor rodando na porta 3002
```

> Deixe este terminal aberto. O backend precisa estar rodando para o app funcionar.

---

## 📱 Configuração do Frontend (App Mobile)

Abra um **novo terminal** e volte para a pasta raiz do projeto:

```bash
cd ..
```

### 1. Instalar dependências

```bash
npm install
```

### 2. Criar o arquivo de variáveis de ambiente

```bash
cp .env.example .env
```

Abra o `.env` na raiz e configure a URL do backend.

Se for rodar no **celular físico**, substitua `localhost` pelo IP do seu computador na rede Wi-Fi:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3002/api
```

> Para descobrir o IP do seu computador:
> - **Windows**: `ipconfig` no terminal, procure "Endereço IPv4"
> - **macOS/Linux**: `ifconfig` ou `ip addr`, procure o IP da interface Wi-Fi (ex: `en0` ou `wlan0`)

Se for usar apenas o **simulador** (sem celular físico), pode deixar `localhost`:
```env
EXPO_PUBLIC_API_URL=http://localhost:3002/api
```

### 3. Iniciar o app

```bash
npx expo start --clear
```

Um QR Code aparecerá no terminal.

---

## 📲 Abrindo no Celular

1. Abra o app **Expo Go** no seu celular
2. Toque em **"Scan QR Code"**
3. Aponte a câmera para o QR Code no terminal
4. O app vai carregar automaticamente

---

## 🔑 Acesso ao Sistema

O sistema possui um usuário de demonstração que funciona **sem precisar de banco de dados**:

| Campo | Valor |
|-------|-------|
| Email | `admin@admin.com` |
| Senha | `admin` |

---

## 🐳 Alternativa: Rodar com Docker

Se preferir não instalar MySQL manualmente, use o Docker:

### Pré-requisito: instalar Docker
Acesse [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop) e instale o Docker Desktop.

### Subir tudo com um comando

Na raiz do projeto:

```bash
docker-compose up -d
```

Isso vai subir o banco MySQL e o backend automaticamente. Depois é só rodar o frontend:

```bash
npx expo start --clear
```

---

## 🛠️ Solução de Problemas Comuns

**"Network Error" ao fazer login no celular**
> O celular não consegue acessar `localhost`. Configure o IP da sua máquina no `.env` conforme explicado acima.

**"Cannot find module 'babel-preset-expo'"**
```bash
npm install babel-preset-expo --save-dev
```

**"Project is incompatible with this version of Expo Go"**
> O Expo Go do celular está em versão diferente do projeto. Atualize o projeto:
```bash
npx expo install expo@~54.0.34
npx expo install --fix
```

**Erro de conexão com MySQL**
> Verifique se o MySQL está rodando e se a senha no `backend/.env` está correta.
```bash
# Linux/macOS
sudo systemctl status mysql

# macOS com Homebrew
brew services list
```

**Porta 3002 já em uso**
> Mude a porta no `backend/.env`:
```env
PORT=3003
```
E atualize o `.env` do frontend com a nova porta.

---

## 📁 Estrutura do Projeto

```
/
├── App.tsx                  # Entrada do app mobile
├── components/
│   └── native/              # Componentes React Native
├── services/
│   └── api.ts               # Chamadas à API
├── types.ts                 # Tipos TypeScript
├── backend/
│   ├── src/                 # Código do servidor Node.js
│   ├── prisma/              # Schema e migrations do banco
│   └── .env.example         # Modelo de variáveis do backend
├── .env.example             # Modelo de variáveis do frontend
└── docker-compose.yml       # Configuração Docker
```

---

## 📞 Resumo Rápido

```bash
# Clone o projeto
git clone https://github.com/seu-usuario/seu-repositorio.git
cd seu-repositorio

# Backend
cd backend
npm install
cp .env.example .env        # edite com seus dados do MySQL
npx prisma migrate deploy
npm start

# Frontend (novo terminal)
cd ..
npm install
cp .env.example .env        # edite com o IP da sua máquina
npx expo start --clear
```

---

Fazendo Programa
