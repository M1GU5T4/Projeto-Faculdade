import express from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';
import { randomBytes } from 'crypto';

// Função para gerar ID único
const generateId = () => {
  return randomBytes(12).toString('base64').replace(/[+/]/g, '').substring(0, 25);
};

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

// Schema de validação para configurações
const settingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  notifications: z.object({
    newQuotes: z.boolean().optional(),
    overdueInvoices: z.boolean().optional(),
    weeklyReports: z.boolean().optional(),
  }).optional(),
});

// Obter configurações do usuário
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    let settings = await prisma.$queryRaw`
      SELECT id, theme, notifications, updatedAt
      FROM user_settings 
      WHERE userId = ${userId}
    ` as any;

    // Se não existir configurações, criar com valores padrão
    if (!settings || settings.length === 0) {
      await prisma.$executeRaw`
        INSERT INTO user_settings (id, userId, theme, notifications, createdAt, updatedAt)
        VALUES (${generateId()}, ${userId}, 'light', '{"newQuotes":true,"overdueInvoices":true,"weeklyReports":false}', NOW(), NOW())
      `;
      
      settings = await prisma.$queryRaw`
        SELECT id, theme, notifications, updatedAt
        FROM user_settings 
        WHERE userId = ${userId}
      ` as any;
    }
    
    const settingsData = Array.isArray(settings) ? settings[0] : settings;

    logger.info('Configurações do usuário obtidas', { userId });
    res.json(settingsData);
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

    const data = settingsSchema.parse(req.body);
    const notifications = data.notifications ? JSON.stringify(data.notifications) : undefined;

    const settings = await prisma.userSettings.upsert({
      where: { userId },
      update: {
        ...(data.theme && { theme: data.theme }),
        ...(notifications && { notifications }),
      },
      create: {
        userId,
        theme: data.theme || 'light',
        notifications: notifications || '{"newQuotes":true,"overdueInvoices":true,"weeklyReports":false}'
      },
      select: {
        id: true,
        theme: true,
        notifications: true,
        updatedAt: true,
      }
    });

    logger.info('Configurações do usuário atualizadas', { userId });
    res.json(settings);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: error.errors 
      });
    }

    logger.error('Erro ao atualizar configurações do usuário', { error, userId: req.user?.id });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;