# 🐳 SISTEMA DE GESTÃO EMPRESARIAL - DOCKER

## 🚀 Deploy com Docker

Este sistema pode ser facilmente deployado usando Docker e Docker Compose.

### 📋 **Pré-requisitos**

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB RAM mínimo
- 10GB espaço em disco

### 🔧 **Configuração Rápida**

#### 1. **Clone o repositório:**
```bash
git clone <seu-repositorio>
cd sistema-gestao-empresarial
```

#### 2. **Configure as variáveis de ambiente:**
```bash
cp .env.docker .env
```

#### 3. **Inicie os serviços:**
```bash
docker-compose up -d
```

#### 4. **Acesse a aplicação:**
- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3002
- **Health Check**: http://localhost:3002/health

### 🏗️ **Arquitetura Docker**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Nginx       │    │   Aplicação     │    │     MySQL       │
│   (Opcional)    │────│   Node.js       │────│   Banco de      │
│   Porta 80/443  │    │   Portas        │    │   Dados         │
│                 │    │   3001/3002     │    │   Porta 3306    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 📊 **Serviços Incluídos**

#### **1. MySQL Database**
- **Imagem**: mysql:8.0
- **Porta**: 3306
- **Volume**: Dados persistentes
- **Health Check**: Automático

#### **2. Aplicação Principal**
- **Build**: Dockerfile customizado
- **Portas**: 3001 (Frontend) + 3002 (Backend)
- **Dependências**: Aguarda MySQL estar pronto
- **Health Check**: Endpoint /health

#### **3. Nginx (Produção)**
- **Imagem**: nginx:alpine
- **Porta**: 80/443
- **SSL**: Suporte HTTPS
- **Rate Limiting**: Proteção contra ataques

### 🔐 **Variáveis de Ambiente**

#### **Banco de Dados:**
```env
DB_HOST=mysql
DB_PORT=3306
DB_USER=erpuser
DB_PASSWORD=erppassword
DB_NAME=erp_crm
```

#### **Aplicação:**
```env
NODE_ENV=production
PORT=3002
FRONTEND_PORT=3001
JWT_SECRET=seu_jwt_secret_super_seguro
```

#### **Admin Padrão:**
```env
ADMIN_EMAIL=admin@heseguranca.com
ADMIN_PASSWORD=admin123
ADMIN_NAME=Administrador HE Segurança
```

### 🛠️ **Comandos Úteis**

#### **Desenvolvimento:**
```bash
# Iniciar em modo desenvolvimento
docker-compose up

# Ver logs em tempo real
docker-compose logs -f

# Parar serviços
docker-compose down
```

#### **Produção:**
```bash
# Build e start
docker-compose --profile production up -d

# Restart apenas a aplicação
docker-compose restart app

# Backup do banco
docker-compose exec mysql mysqldump -u root -p erp_crm > backup.sql
```

#### **Manutenção:**
```bash
# Limpar volumes e containers
docker-compose down -v
docker system prune -f

# Rebuild da aplicação
docker-compose build --no-cache app

# Executar migrações
docker-compose exec app npx prisma db push
```

### 📈 **Monitoramento**

#### **Health Checks:**
- **Aplicação**: `curl http://localhost:3002/health`
- **MySQL**: Automático via Docker
- **Nginx**: Status 200 nas rotas

#### **Logs:**
```bash
# Logs da aplicação
docker-compose logs app

# Logs do banco
docker-compose logs mysql

# Logs do nginx
docker-compose logs nginx
```

### 🔒 **Segurança**

#### **Implementado:**
- ✅ Usuário não-root nos containers
- ✅ Rate limiting no Nginx
- ✅ Headers de segurança
- ✅ HTTPS/SSL suportado
- ✅ Variáveis de ambiente protegidas

#### **Recomendações:**
- 🔐 Altere todas as senhas padrão
- 🔐 Use certificados SSL válidos
- 🔐 Configure firewall adequado
- 🔐 Monitore logs regularmente

### 🚀 **Deploy em Produção**

#### **1. Servidor VPS/Cloud:**
```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

#### **2. Configurar SSL:**
```bash
# Criar certificados (Let's Encrypt recomendado)
mkdir ssl
# Copiar cert.pem e key.pem para ./ssl/
```

#### **3. Iniciar em produção:**
```bash
docker-compose --profile production up -d
```

### 📊 **Recursos do Sistema**

#### **Mínimo:**
- **CPU**: 2 cores
- **RAM**: 4GB
- **Disco**: 10GB

#### **Recomendado:**
- **CPU**: 4 cores
- **RAM**: 8GB
- **Disco**: 50GB SSD

### 🆘 **Troubleshooting**

#### **Problemas Comuns:**

1. **Banco não conecta:**
   ```bash
   docker-compose logs mysql
   # Verificar se MySQL iniciou completamente
   ```

2. **Aplicação não inicia:**
   ```bash
   docker-compose logs app
   # Verificar logs de erro
   ```

3. **Porta já em uso:**
   ```bash
   # Alterar portas no docker-compose.yml
   ports:
     - "8001:3001"  # Frontend
     - "8002:3002"  # Backend
   ```

4. **Permissões:**
   ```bash
   # Ajustar permissões
   sudo chown -R $USER:$USER .
   ```

### 📞 **Suporte**

Para problemas específicos do Docker:
1. Verifique os logs: `docker-compose logs`
2. Teste health checks: `curl http://localhost:3002/health`
3. Verifique recursos: `docker stats`

---

**🎯 Sistema pronto para produção com Docker! Deploy fácil e escalável.**

*Documentação atualizada em: ${new Date().toLocaleString('pt-BR')}*