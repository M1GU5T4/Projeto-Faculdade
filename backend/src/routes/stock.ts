import express from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = express.Router();

const nullableTrimmedString = z.string().optional().nullable().transform((value) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
});

const stockCategorySchema = z.object({
  name: z.string().trim().min(1, 'Nome da categoria e obrigatorio'),
  description: nullableTrimmedString,
});

const stockItemSchema = z.object({
  name: z.string().trim().min(1, 'Nome do item e obrigatorio'),
  description: nullableTrimmedString,
  categoryId: z.string().trim().min(1, 'Categoria e obrigatoria'),
  type: z.string().trim().min(1, 'Tipo e obrigatorio'),
  unit: z.string().trim().min(1, 'Unidade e obrigatoria'),
  price: z.coerce.number().min(0, 'Preco nao pode ser negativo'),
  quantity: z.coerce.number().min(0, 'Quantidade nao pode ser negativa').optional(),
  minStock: z.coerce.number().min(0, 'Estoque minimo nao pode ser negativo').optional(),
  maxStock: z.coerce.number().min(0, 'Estoque maximo nao pode ser negativo').optional(),
  barcode: nullableTrimmedString,
  supplier: nullableTrimmedString,
  location: nullableTrimmedString,
  isActive: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (typeof data.minStock === 'number' && typeof data.maxStock === 'number' && data.maxStock < data.minStock) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['maxStock'],
      message: 'Estoque maximo nao pode ser menor que o estoque minimo',
    });
  }
});

const stockMovementSchema = z.object({
  itemId: z.string().trim().min(1, 'Item e obrigatorio'),
  type: z.enum(['ENTRADA', 'SAIDA', 'AJUSTE', 'TRANSFERENCIA']),
  quantity: z.coerce.number().positive('Quantidade deve ser positiva'),
  unitPrice: z.coerce.number().min(0, 'Preco unitario nao pode ser negativo').optional(),
  reason: nullableTrimmedString,
  reference: nullableTrimmedString,
});

const handleStockError = (res: express.Response, error: unknown, context: string) => {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: error.errors[0].message });
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  ) {
    return res.status(400).json({ error: 'Ja existe um registro com esses dados' });
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2025'
  ) {
    return res.status(404).json({ error: 'Registro nao encontrado' });
  }

  console.error(context, error);
  return res.status(500).json({ error: 'Erro interno do servidor' });
};

const normalizeStockItemData = (data: z.infer<typeof stockItemSchema>) => ({
  ...data,
  type: data.type.toUpperCase().replace(/\s+/g, '_'),
  unit: data.unit.toUpperCase().trim(),
  quantity: data.quantity ?? 0,
  minStock: typeof data.minStock === 'number' ? data.minStock : null,
  maxStock: typeof data.maxStock === 'number' ? data.maxStock : null,
  barcode: data.barcode ?? null,
  supplier: data.supplier ?? null,
  location: data.location ?? null,
});

router.use(authenticateToken);

router.get('/categories', async (_req, res) => {
  try {
    const categories = await prisma.stockCategory.findMany({
      include: {
        _count: {
          select: { items: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(categories);
  } catch (error) {
    console.error('Erro ao buscar categorias:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const data = stockCategorySchema.parse(req.body);

    const category = await prisma.stockCategory.create({
      data,
      include: {
        _count: {
          select: { items: true }
        }
      }
    });

    res.status(201).json(category);
  } catch (error) {
    return handleStockError(res, error, 'Erro ao criar categoria:');
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = stockCategorySchema.parse(req.body);

    const category = await prisma.stockCategory.update({
      where: { id },
      data,
      include: {
        _count: {
          select: { items: true }
        }
      }
    });

    res.json(category);
  } catch (error) {
    return handleStockError(res, error, 'Erro ao atualizar categoria:');
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const itemCount = await prisma.stockItem.count({
      where: { categoryId: id }
    });

    if (itemCount > 0) {
      return res.status(400).json({
        error: `Nao e possivel excluir a categoria. Ha ${itemCount} item(ns) vinculado(s).`
      });
    }

    await prisma.stockCategory.delete({
      where: { id }
    });

    res.json({ message: 'Categoria excluida com sucesso' });
  } catch (error) {
    return handleStockError(res, error, 'Erro ao excluir categoria:');
  }
});

router.get('/items', async (req, res) => {
  try {
    const { categoryId, type, lowStock, search, availableOnly } = req.query;
    const where: Record<string, unknown> = {};

    if (availableOnly === 'true') {
      where.isActive = true;
      where.quantity = { gt: 0 };
    }

    if (categoryId) {
      where.categoryId = categoryId as string;
    }

    if (type) {
      where.type = type as string;
    }

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { description: { contains: search as string } },
        { barcode: { contains: search as string } },
      ];
    }

    const items = await prisma.stockItem.findMany({
      where,
      include: {
        category: true,
        movements: {
          take: 1,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    const itemsWithCalculations = items.map((item) => ({
      ...item,
      totalValue: item.quantity * item.price,
      isLowStock: item.minStock ? item.quantity <= item.minStock : false,
      lastMovement: item.movements[0] || null,
    }));

    const filteredItems = lowStock === 'true'
      ? itemsWithCalculations.filter((item) => item.isLowStock)
      : itemsWithCalculations;

    res.json(filteredItems);
  } catch (error) {
    console.error('Erro ao buscar itens:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const item = await prisma.stockItem.findUnique({
      where: { id },
      include: {
        category: true,
        movements: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!item) {
      return res.status(404).json({ error: 'Item nao encontrado' });
    }

    res.json({
      ...item,
      totalValue: item.quantity * item.price,
      isLowStock: item.minStock ? item.quantity <= item.minStock : false,
    });
  } catch (error) {
    return handleStockError(res, error, 'Erro ao buscar item:');
  }
});

router.post('/items', async (req, res) => {
  try {
    const parsedData = stockItemSchema.parse(req.body);
    const data = normalizeStockItemData(parsedData);

    const category = await prisma.stockCategory.findUnique({
      where: { id: data.categoryId }
    });

    if (!category) {
      return res.status(400).json({ error: 'Categoria nao encontrada' });
    }

    const item = await prisma.stockItem.create({
      data: {
        ...data,
        isActive: data.isActive !== false,
      },
      include: {
        category: true
      }
    });

    res.status(201).json(item);
  } catch (error) {
    return handleStockError(res, error, 'Erro ao criar item:');
  }
});

router.put('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const parsedData = stockItemSchema.parse(req.body);
    const data = normalizeStockItemData(parsedData);

    const category = await prisma.stockCategory.findUnique({
      where: { id: data.categoryId }
    });

    if (!category) {
      return res.status(400).json({ error: 'Categoria nao encontrada' });
    }

    const item = await prisma.stockItem.update({
      where: { id },
      data,
      include: {
        category: true
      }
    });

    res.json(item);
  } catch (error) {
    return handleStockError(res, error, 'Erro ao atualizar item:');
  }
});

router.delete('/items/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.stockItem.delete({
      where: { id }
    });

    res.json({ message: 'Item excluido com sucesso' });
  } catch (error) {
    return handleStockError(res, error, 'Erro ao excluir item:');
  }
});

router.get('/movements', async (req, res) => {
  try {
    const { itemId, type, startDate, endDate } = req.query;
    const where: Record<string, unknown> = {};

    if (itemId) {
      where.itemId = itemId as string;
    }

    if (type) {
      where.type = type as string;
    }

    if (startDate || endDate) {
      const createdAt: Record<string, Date> = {};
      if (startDate) {
        createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        createdAt.lte = new Date(endDate as string);
      }
      where.createdAt = createdAt;
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        item: {
          include: {
            category: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(movements);
  } catch (error) {
    console.error('Erro ao buscar movimentacoes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.post('/movements', async (req, res) => {
  try {
    const data = stockMovementSchema.parse(req.body);

    const item = await prisma.stockItem.findUnique({
      where: { id: data.itemId }
    });

    if (!item) {
      return res.status(400).json({ error: 'Item nao encontrado' });
    }

    let newQuantity = item.quantity;
    switch (data.type) {
      case 'ENTRADA':
        newQuantity += data.quantity;
        break;
      case 'SAIDA':
      case 'TRANSFERENCIA':
        newQuantity -= data.quantity;
        if (newQuantity < 0) {
          return res.status(400).json({ error: 'Quantidade insuficiente em estoque' });
        }
        break;
      case 'AJUSTE':
        newQuantity = data.quantity;
        break;
    }

    const unitPrice = typeof data.unitPrice === 'number' ? data.unitPrice : item.price;
    const totalValue = data.quantity * unitPrice;

    const result = await prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          ...data,
          unitPrice,
          totalValue,
          userId: (req as { user?: { id?: string } }).user?.id,
        },
        include: {
          item: {
            include: {
              category: true
            }
          }
        }
      });

      await tx.stockItem.update({
        where: { id: data.itemId },
        data: { quantity: newQuantity }
      });

      return movement;
    });

    res.status(201).json(result);
  } catch (error) {
    return handleStockError(res, error, 'Erro ao criar movimentacao:');
  }
});

router.get('/reports/stock', async (_req, res) => {
  try {
    const items = await prisma.stockItem.findMany({
      where: { isActive: true },
      include: {
        category: true
      }
    });

    const totalItems = items.length;
    const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
    const lowStockItems = items.filter((item) =>
      item.minStock ? item.quantity <= item.minStock : false
    );

    const byCategory = items.reduce((acc, item) => {
      const categoryName = item.category.name;
      if (!acc[categoryName]) {
        acc[categoryName] = {
          count: 0,
          value: 0,
          items: []
        };
      }
      acc[categoryName].count += 1;
      acc[categoryName].value += item.quantity * item.price;
      acc[categoryName].items.push(item);
      return acc;
    }, {} as Record<string, { count: number; value: number; items: typeof items }>);

    const byType = items.reduce((acc, item) => {
      if (!acc[item.type]) {
        acc[item.type] = {
          count: 0,
          value: 0
        };
      }
      acc[item.type].count += 1;
      acc[item.type].value += item.quantity * item.price;
      return acc;
    }, {} as Record<string, { count: number; value: number }>);

    res.json({
      summary: {
        totalItems,
        totalValue,
        lowStockCount: lowStockItems.length,
        categoriesCount: Object.keys(byCategory).length,
      },
      byCategory,
      byType,
      lowStockItems: lowStockItems.map((item) => ({
        ...item,
        totalValue: item.quantity * item.price,
        isLowStock: true,
      }))
    });
  } catch (error) {
    console.error('Erro ao gerar relatorio de estoque:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

router.get('/reports/movements', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const where: Record<string, unknown> = {};

    if (startDate || endDate) {
      const createdAt: Record<string, Date> = {};
      if (startDate) {
        createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        createdAt.lte = new Date(endDate as string);
      }
      where.createdAt = createdAt;
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      include: {
        item: {
          include: {
            category: true
          }
        }
      }
    });

    const byType = movements.reduce((acc, movement) => {
      if (!acc[movement.type]) {
        acc[movement.type] = {
          count: 0,
          totalQuantity: 0,
          totalValue: 0
        };
      }
      acc[movement.type].count += 1;
      acc[movement.type].totalQuantity += movement.quantity;
      acc[movement.type].totalValue += movement.totalValue || 0;
      return acc;
    }, {} as Record<string, { count: number; totalQuantity: number; totalValue: number }>);

    res.json({
      summary: {
        totalMovements: movements.length,
        totalValue: movements.reduce((sum, movement) => sum + (movement.totalValue || 0), 0),
      },
      byType,
      movements: movements.slice(0, 50)
    });
  } catch (error) {
    console.error('Erro ao gerar relatorio de movimentacoes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
