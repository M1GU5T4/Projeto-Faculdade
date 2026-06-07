import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../lib/logger';

// Estender o tipo Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: string;
      };
    }
  }
}

const router = express.Router();

// Aplicar middleware de autenticação
router.use(authenticateToken);

// Armazenamento temporário em memória (para teste)
const userSettings: Record<string, any> = {};

// Obter configurações do usuário
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const settings = userSettings[userId] || {
      theme: 'light',
      notifications: {
        newQuotes: true,
        overdueInvoices: true,
        weeklyReports: false,
      }
    };

    logger.info('Configurações do usuário obtidas', { userId });
    res.json(settings);
  } catch (error) {
    logger.error('Erro ao obter configurações do usuário', { error, userId: req.user?.id });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar configurações do usuário
router.put('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { theme, notifications } = req.body;

    // Atualizar configurações em memória
    userSettings[userId] = {
      ...userSettings[userId],
      ...(theme && { theme }),
      ...(notifications && { notifications }),
      updatedAt: new Date().toISOString(),
    };

    logger.info('Configurações do usuário atualizadas', { userId });
    res.json(userSettings[userId]);
  } catch (error) {
    logger.error('Erro ao atualizar configurações do usuário', { error, userId: req.user?.id });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;