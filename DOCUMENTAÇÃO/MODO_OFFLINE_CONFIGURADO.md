# Modo Offline Configurado - Sistema sem Banco de Dados

## ✅ Alterações Implementadas

O sistema foi configurado para funcionar **SEM necessidade de banco de dados**. Agora usa dados em memória (mock data) e login padrão.

### 1. **Credenciais de Acesso Padrão**
```
Email: admin@admin.com
Senha: admin
```

Estas credenciais são válidas tanto no frontend quanto no backend (caso esteja usando as rotinas de API em modo fallback).

### 2. **Alterações no Frontend** (`App.tsx` e `services/api.ts`)

#### App.tsx
- ✅ Login agora é opcional (página aparece para autenticação, mas pode ser contornada)
- ✅ Redirecionamento automático para Dashboard após login
- ✅ Todos os dados vêm de mock data em memória

#### services/api.ts
- ✅ Autenticação implementada localmente (sem chamadas à API)
- ✅ Todos os serviços (clientes, ordens, orçamentos, etc.) usam mock data
- ✅ Operações CRUD funcionam na memória (dados perdem ao recarregar página)

### 3. **Alterações no Backend** (Opcional)

#### backend/src/routes/auth.ts
- ✅ Login aceita credencial padrão: `admin@admin.com / admin`
- ✅ Registro bloqueado (exceto para admin)

#### backend/src/routes/clients.ts
- ✅ Usa dados mock em memória
- ✅ Operações CRUD funcionam sem banco de dados

#### backend/src/server.ts
- ✅ Removida validação de `DATABASE_URL`
- ✅ Apenas `JWT_SECRET` é obrigatório

### 4. **componentes/Login.tsx**
- ✅ Credenciais padrão atualizadas para: `admin@admin.com / admin`

## 🚀 Como Usar

### Frontend (Interface web)
1. Abra o aplicativo
2. Use as credenciais:
   - Email: `admin@admin.com`
   - Senha: `admin`
3. Será redirecionado para o Dashboard

### Backend (se estiver usando)
1. Certifique-se que tem `JWT_SECRET` no `.env`:
   ```
   JWT_SECRET=sua-chave-secreta-aqui
   JWT_SECRET=teste123
   ```
2. O servidor funcionará sem `DATABASE_URL`
3. Dados serão mantidos em memória (perdem ao reiniciar o servidor)

## ⚠️ Limitações

- **Dados em Memória**: Todos os dados são perdidos ao recarregar a página (frontend) ou reiniciar o servidor (backend)
- **Sem Persistência**: Não há salvamento em banco de dados
- **Modo Demo**: Ideal para demonstrações e testes sem infraestrutura

## 📝 Para Restaurar Banco de Dados

Caso queira voltar a usar banco de dados:

1. **Adicione `DATABASE_URL` ao `.env`**:
   ```
   DATABASE_URL=mysql://user:password@localhost:3306/database
   ```

2. **Reverter `backend/src/server.ts`**:
   ```typescript
   const requiredEnvVars = ['JWT_SECRET', 'DATABASE_URL'];
   ```

3. **Reverter `services/api.ts` e `backend/src/routes/`**:
   - Remover chamadas a mock data
   - Restaurar chamadas `apiRequest` e `prisma`

4. **Rodar migrations do Prisma**:
   ```bash
   cd backend
   npx prisma migrate dev
   ```

## ✨ Modo Atual

- **Frontend**: Mock data ✅
- **Backend**: Mock data ✅
- **Login**: Credencial padrão ✅
- **Autenticação**: Local (sem dependência de banco) ✅

---

**Compilação**: ✅ Build completo funcionando sem erros
**Data**: 25/03/2026
**Status**: Pronto para uso offline

