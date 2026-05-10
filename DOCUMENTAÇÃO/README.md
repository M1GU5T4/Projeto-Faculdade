# Sistema de Gestão Empresarial

Aplicativo mobile em **Expo + React Native** com backend em **Node.js/Express** e banco via **Prisma**.

## Estrutura

- `App.tsx`: navegação e telas principais do app mobile
- `components/native/`: componentes nativos reutilizáveis
- `services/`: cliente da API e serviços
- `backend/`: API, Prisma e banco

## Requisitos

- Node.js 18+
- Android Studio e/ou Xcode para emuladores
- Backend configurado e rodando

## Variáveis de ambiente

Crie `.env` na raiz com:

```env
EXPO_PUBLIC_API_URL=http://localhost:3002/api
```

E `backend/.env` com a configuração do banco e JWT.

## Instalação

Na raiz:

```bash
npm install
```

No backend:

```bash
cd backend
npm install
```

## Como rodar

Terminais separados:

```bash
cd backend
npm run dev
```

```bash
npm start
```

No app mobile:

```bash
npm run start
```

Depois abra no Expo Go, emulador Android ou simulador iOS.

## Fluxo do sistema

1. O app mobile chama `services/api.ts`
2. A API responde em `http://localhost:3002/api`
3. O backend usa Prisma para acessar o banco
4. O app renderiza as telas nativas no Expo
