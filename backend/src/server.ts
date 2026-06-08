import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './lib/logger';

// Routes
import authRoutes from './routes/auth';
import clientRoutes from './routes/clients';
import workOrderRoutes from './routes/workOrders';
import quoteRoutes from './routes/quotes';
import invoiceRoutes from './routes/invoices';
import projectRoutes from './routes/projects';
import expenseRoutes from './routes/expenses';
import dashboardRoutes from './routes/dashboard';
import stockRoutes from './routes/stock';
import settingsRoutes from './routes/settings-simple';

dotenv.config();

// Validar variáveis de ambiente obrigatórias
const requiredEnvVars = ['JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Variáveis de ambiente obrigatórias não encontradas:', missingEnvVars);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3002;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middlewares de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configurado para aceitar app mobile e web
const allowedOrigins = NODE_ENV === 'production'
  ? (process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [])
  : null; // null = aceita qualquer origem em desenvolvimento

app.use(cors({
  origin: allowedOrigins === null ? true : allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check (sem autenticação)
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Middleware para bloquear acesso direto sem autenticação
app.use('/api', (req, res, next) => {
  // Permitir apenas rotas de autenticação sem token
  if (req.path.startsWith('/auth/')) {
    return next();
  }
  
  // Para todas as outras rotas, verificar se há token
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Acesso negado. Token de autenticação requerido.',
      code: 'NO_TOKEN'
    });
  }
  
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/work-orders', workOrderRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/stock', stockRoutes);

// Middleware de tratamento de erros (deve ser o último)
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  logger.warn('Rota não encontrada', { 
    url: req.url, 
    method: req.method,
    ip: req.ip 
  });
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Recebido sinal ${signal}. Encerrando servidor graciosamente...`);
  
  // Fechar conexões do banco
  try {
    const { default: prisma } = await import('./lib/prisma');
    await prisma.$disconnect();
    logger.info('Conexão com banco de dados fechada');
  } catch (error) {
    logger.error('Erro ao fechar conexão com banco', {}, error);
  }
  
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Capturar erros não tratados
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {}, error);
  process.exit(1);
});

app.listen(PORT, () => {
  logger.info(`Servidor iniciado`, {
    port: PORT,
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
  
  if (NODE_ENV === 'development') {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 Health Check: http://localhost:${PORT}/health`);
  }
});