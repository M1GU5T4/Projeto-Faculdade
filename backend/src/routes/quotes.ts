import express from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import PDFDocument from 'pdfkit';

const router = express.Router();
const prisma = new PrismaClient();

const lineItemSchema = z.object({
  stockItemId: z.string().nullable().optional(),
  description: z.string().min(1, 'Descrição é obrigatória'),
  quantity: z.number().positive('Quantidade deve ser positiva'),
  unitPrice: z.number().positive('Preço unitário deve ser positivo'),
  total: z.number().min(0).optional(),
});

const quoteSchema = z.object({
  quoteNumber: z.string().min(1, 'Número do orçamento é obrigatório'),
  clientId: z.string().min(1, 'Cliente é obrigatório'),
  issueDate: z.string().min(1, 'Data de emissão é obrigatória'),
  expiryDate: z.string().min(1, 'Data de expiração é obrigatória'),
  lineItems: z.array(lineItemSchema).min(1, 'Pelo menos um item é obrigatório'),
  tax: z.number().min(0, 'Taxa não pode ser negativa').optional(),
  status: z.enum(['RASCUNHO', 'ENVIADO', 'APROVADO', 'REJEITADO']).optional(),
  notes: z.string().nullable().optional(), // Campo para observações
});

const projectConversionSchema = z.object({
  projectName: z.string().min(2).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
  budget: z.number().positive().optional(),
  progress: z.number().min(0).max(100).optional(),
});

router.use(authenticateToken);

// Listar todos os orçamentos
router.get('/', async (req, res) => {
  try {
    const quotes = await prisma.quote.findMany({
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        lineItems: {
          include: {
            stockItem: true
          }
        },
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(quotes);
  } catch (error) {
    console.error('Erro ao buscar orçamentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar orçamento por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        client: true,
        lineItems: {
          include: {
            stockItem: true
          }
        },
      }
    });

    if (!quote) {
      return res.status(404).json({ error: 'Orçamento não encontrado' });
    }

    res.json(quote);
  } catch (error) {
    console.error('Erro ao buscar orçamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar novo orçamento
router.post('/', async (req, res) => {
  try {
    const data = quoteSchema.parse(req.body);

    // Verificar se o cliente existe
    const client = await prisma.client.findUnique({
      where: { id: data.clientId }
    });

    if (!client) {
      return res.status(400).json({ error: 'Cliente não encontrado' });
    }

    // Verificar se o número do orçamento já existe
    const existingQuote = await prisma.quote.findUnique({
      where: { quoteNumber: data.quoteNumber }
    });

    if (existingQuote) {
      return res.status(400).json({ error: 'Número do orçamento já existe' });
    }

    const requestedStock = new Map<string, number>();
    for (const item of data.lineItems) {
      if (item.stockItemId) {
        requestedStock.set(item.stockItemId, (requestedStock.get(item.stockItemId) || 0) + item.quantity);
      }
    }

    if (requestedStock.size > 0) {
      const stockItems = await prisma.stockItem.findMany({
        where: { id: { in: [...requestedStock.keys()] }, isActive: true, quantity: { gt: 0 } },
        select: { id: true, quantity: true },
      });
      const availableById = new Map(stockItems.map((item) => [item.id, item.quantity]));
      const hasUnavailableItem = [...requestedStock].some(([id, quantity]) =>
        (availableById.get(id) ?? 0) < quantity
      );

      if (hasUnavailableItem) {
        return res.status(400).json({ error: 'Um ou mais itens estão inativos ou sem quantidade suficiente em estoque.' });
      }
    }

    // Calcular totais
    const subtotal = data.lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const tax = data.tax || 0;
    const total = subtotal + tax;

    const quote = await prisma.quote.create({
      data: {
        quoteNumber: data.quoteNumber,
        clientId: data.clientId,
        issueDate: new Date(data.issueDate),
        expiryDate: new Date(data.expiryDate),
        subtotal,
        tax,
        total,
        status: data.status || 'RASCUNHO',
        notes: data.notes || null, // Campo para observações
        lineItems: {
          create: data.lineItems.map(item => ({
            stockItemId: item.stockItemId || null,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          }))
        }
      },
      include: {
        client: true,
        lineItems: {
          include: {
            stockItem: true
          }
        },
      }
    });

    res.status(201).json(quote);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Erro ao criar orçamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Atualizar orçamento
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = quoteSchema.parse(req.body);

    const existingQuote = await prisma.quote.findUnique({
      where: { id }
    });

    if (!existingQuote) {
      return res.status(404).json({ error: 'Orçamento não encontrado' });
    }

    // Calcular totais
    const subtotal = data.lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const tax = data.tax || 0;
    const total = subtotal + tax;

    const quote = await prisma.quote.update({
      where: { id },
      data: {
        quoteNumber: data.quoteNumber,
        clientId: data.clientId,
        issueDate: new Date(data.issueDate),
        expiryDate: new Date(data.expiryDate),
        subtotal,
        tax,
        total,
        status: data.status || existingQuote.status,
        notes: data.notes || null, // Campo para observações
        lineItems: {
          deleteMany: {},
          create: data.lineItems.map(item => ({
            stockItemId: item.stockItemId || null,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          }))
        }
      },
      include: {
        client: true,
        lineItems: {
          include: {
            stockItem: true
          }
        },
      }
    });

    res.json(quote);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Erro ao atualizar orçamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar orçamento
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingQuote = await prisma.quote.findUnique({
      where: { id }
    });

    if (!existingQuote) {
      return res.status(404).json({ error: 'Orçamento não encontrado' });
    }

    await prisma.quote.delete({
      where: { id }
    });

    res.json({ message: 'Orçamento deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar orçamento:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Buscar orçamentos aprovados (para faturas)
router.get('/approved', async (req, res) => {
  try {
    const approvedQuotes = await prisma.quote.findMany({
      where: {
        status: 'APROVADO',
        // Opcional: verificar se já não tem fatura associada
        invoices: {
          none: {} // Orçamentos que ainda não viraram fatura
        }
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        lineItems: {
          include: {
            stockItem: true
          }
        },
        _count: {
          select: {
            invoices: true, // Contar faturas associadas
            projects: true  // Contar projetos associados
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(approvedQuotes);
  } catch (error) {
    console.error('Erro ao buscar orçamentos aprovados:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Gerar PDF do orçamento
router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar o orçamento com dados relacionados
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        client: true,
        lineItems: {
          include: {
            stockItem: true
          }
        }
      }
    });

    if (!quote) {
      return res.status(404).json({ error: 'Orçamento não encontrado' });
    }

    // Configurar headers para download do PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="orcamento-${quote.quoteNumber}.pdf"`);

    // Criar documento PDF
    const doc = new PDFDocument({ margin: 50 });

    // Pipe do documento para a resposta
    doc.pipe(res);

    // Função auxiliar para formatação de moeda
    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(value);
    };

    // Função auxiliar para formatação de data
    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat('pt-BR').format(new Date(date));
    };

    // CABEÇALHO
    let yPosition = 50;

    // Logo da empresa (placeholder)
    doc.rect(50, yPosition, 80, 60)
      .stroke()
      .fontSize(10)
      .text('LOGO', 70, yPosition + 25);

    // Informações da empresa
    doc.fontSize(20)
      .font('Helvetica-Bold')
      .text('HE SEGURANÇA ELETRÔNICA', 150, yPosition);

    doc.fontSize(10)
      .font('Helvetica')
      .text('Rua Fictícia, 123, Centro, Cidade-UF', 150, yPosition + 25)
      .text('Telefone: (XX) 99999-9999 | Email: contato@heseguranca.com', 150, yPosition + 40)
      .text('CNPJ: XX.XXX.XXX/0001-XX', 150, yPosition + 55);

    yPosition += 100;

    // Título do documento
    doc.fontSize(24)
      .font('Helvetica-Bold')
      .text('ORÇAMENTO', 50, yPosition, { align: 'center' });

    yPosition += 40;

    // Número e status do orçamento
    doc.fontSize(12)
      .font('Helvetica')
      .text(`Nº: ${quote.quoteNumber}`, 50, yPosition)
      .text(`Status: ${quote.status}`, 400, yPosition);

    yPosition += 30;

    // Linha separadora
    doc.moveTo(50, yPosition)
      .lineTo(550, yPosition)
      .stroke();

    yPosition += 20;

    // INFORMAÇÕES DO CLIENTE
    doc.fontSize(14)
      .font('Helvetica-Bold')
      .text('CLIENTE', 50, yPosition);

    yPosition += 20;

    doc.fontSize(11)
      .font('Helvetica')
      .text(`Nome: ${quote.client.name}`, 50, yPosition);

    if (quote.client.address) {
      yPosition += 15;
      doc.text(`Endereço: ${quote.client.address}`, 50, yPosition);
    }

    yPosition += 15;
    doc.text(`Email: ${quote.client.email}`, 50, yPosition);

    if (quote.client.phone) {
      doc.text(`Telefone: ${quote.client.phone}`, 300, yPosition);
    }

    yPosition += 30;

    // DETALHES DO ORÇAMENTO
    doc.fontSize(14)
      .font('Helvetica-Bold')
      .text('DETALHES DO ORÇAMENTO', 50, yPosition);

    yPosition += 20;

    doc.fontSize(11)
      .font('Helvetica')
      .text(`Data de Emissão: ${formatDate(quote.issueDate)}`, 50, yPosition)
      .text(`Data de Validade: ${formatDate(quote.expiryDate)}`, 300, yPosition);

    yPosition += 30;

    // TABELA DE ITENS
    doc.fontSize(14)
      .font('Helvetica-Bold')
      .text('ITENS DO ORÇAMENTO', 50, yPosition);

    yPosition += 20;

    // Cabeçalho da tabela
    const tableTop = yPosition;
    const itemCodeX = 50;
    const descriptionX = 50;
    const quantityX = 300;
    const priceX = 380;
    const totalX = 480;

    doc.fontSize(10)
      .font('Helvetica-Bold');

    // Cabeçalho da tabela
    doc.text('DESCRIÇÃO', descriptionX, tableTop)
      .text('QTD.', quantityX, tableTop)
      .text('PREÇO UNIT.', priceX, tableTop)
      .text('TOTAL', totalX, tableTop);

    // Linha do cabeçalho
    yPosition += 15;
    doc.moveTo(50, yPosition)
      .lineTo(550, yPosition)
      .stroke();

    yPosition += 10;

    // Itens da tabela
    doc.font('Helvetica')
      .fontSize(9);

    quote.lineItems.forEach((item, index) => {
      // Verificar se precisa de nova página
      if (yPosition > 700) {
        doc.addPage();
        yPosition = 50;
      }

      const itemY = yPosition;

      // Descrição (com quebra de linha se necessário)
      const descriptionLines = doc.widthOfString(item.description) > 240
        ? [item.description.substring(0, 40) + '...']
        : [item.description];

      doc.text(descriptionLines[0], descriptionX, itemY, { width: 240 });
      doc.text(item.quantity.toString(), quantityX, itemY);
      doc.text(formatCurrency(item.unitPrice), priceX, itemY);
      doc.text(formatCurrency(item.total), totalX, itemY);

      yPosition += 20;

      // Linha separadora entre itens
      if (index < quote.lineItems.length - 1) {
        doc.moveTo(50, yPosition - 5)
          .lineTo(550, yPosition - 5)
          .strokeColor('#E5E5E5')
          .stroke()
          .strokeColor('#000000');
      }
    });

    yPosition += 10;

    // Linha final da tabela
    doc.moveTo(50, yPosition)
      .lineTo(550, yPosition)
      .stroke();

    yPosition += 20;

    // SEÇÃO DE TOTAIS
    const totalsX = 400;

    doc.fontSize(11)
      .font('Helvetica');

    doc.text('Subtotal:', totalsX, yPosition)
      .text(formatCurrency(quote.subtotal), totalsX + 80, yPosition);

    if (quote.tax > 0) {
      yPosition += 15;
      doc.text('Taxas/Impostos:', totalsX, yPosition)
        .text(formatCurrency(quote.tax), totalsX + 80, yPosition);
    }

    yPosition += 15;

    // Total geral em destaque
    doc.fontSize(14)
      .font('Helvetica-Bold');

    doc.text('TOTAL GERAL:', totalsX, yPosition)
      .text(formatCurrency(quote.total), totalsX + 80, yPosition);

    yPosition += 40;

    // SEÇÃO DE OBSERVAÇÕES
    if (quote.notes && quote.notes.trim()) {
      doc.fontSize(14)
        .font('Helvetica-Bold')
        .text('OBSERVAÇÕES E CONDIÇÕES', 50, yPosition);

      yPosition += 20;

      doc.fontSize(10)
        .font('Helvetica')
        .text(quote.notes, 50, yPosition, { width: 500, align: 'justify' });

      yPosition += 60;
    }

    // RODAPÉ
    // Verificar se precisa de nova página para o rodapé
    if (yPosition > 720) {
      doc.addPage();
      yPosition = 50;
    }

    // Posicionar rodapé na parte inferior da página
    const footerY = 750;

    // Linha separadora do rodapé
    doc.moveTo(50, footerY - 20)
      .lineTo(550, footerY - 20)
      .stroke();

    // Mensagem de agradecimento
    doc.fontSize(10)
      .font('Helvetica-Oblique')
      .text('Agradecemos a sua preferência!', 50, footerY, { align: 'center' });

    // Numeração de página
    doc.fontSize(8)
      .font('Helvetica')
      .text('Página 1 de 1', 50, footerY + 15, { align: 'right' });

    // Finalizar o documento
    doc.end();

  } catch (error) {
    console.error('Erro ao gerar PDF do orçamento:', error);
    res.status(500).json({ error: 'Erro interno ao gerar PDF' });
  }
});

// Converter orçamento aprovado em projeto
router.post('/:id/convert-to-project', async (req, res) => {
  try {
    const { id } = req.params;
    const { projectName, startDate, endDate, description, budget, progress } = projectConversionSchema.parse(req.body);

    // Verificar se o orçamento existe e está aprovado
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        client: true,
        lineItems: {
          include: {
            stockItem: true
          }
        }
      }
    });

    if (!quote) {
      return res.status(404).json({ error: 'Orçamento não encontrado' });
    }

    if (quote.status !== 'APROVADO') {
      return res.status(400).json({ error: 'Apenas orçamentos aprovados podem ser convertidos em projetos' });
    }

    // Verificar se já existe um projeto para este orçamento
    const existingProject = await prisma.project.findFirst({
      where: { quoteId: id }
    });

    if (existingProject) {
      return res.status(400).json({
        error: 'Este orçamento já foi convertido em projeto',
        projectId: existingProject.id
      });
    }

    // Criar o projeto baseado no orçamento
    const project = await prisma.project.create({
      data: {
        name: projectName || `Projeto - ${quote.quoteNumber}`,
        clientId: quote.clientId,
        quoteId: quote.id,
        startDate: new Date(startDate || new Date()),
        endDate: endDate ? new Date(endDate) : null,
        status: progress === 100 ? 'CONCLUIDO' : (progress ?? 0) > 0 ? 'EM_ANDAMENTO' : 'NAO_INICIADO',
        description: description || quote.notes || `Projeto criado a partir do orçamento ${quote.quoteNumber}`,
        budget: budget ?? quote.total,
        progress: progress ?? 0,
        // Criar tarefas baseadas nos itens do orçamento
        tasks: {
          create: quote.lineItems.map((item, index) => ({
            name: `${item.description} (${item.quantity} ${item.stockItem?.unit || 'un'})`,
            isCompleted: false
          }))
        }
      },
      include: {
        client: true,
        quote: true,
        tasks: true,
        projectExpenses: true,
        projectNotes: true
      }
    });

    // Criar uma nota inicial no projeto
    await prisma.projectNote.create({
      data: {
        projectId: project.id,
        title: 'Projeto Criado',
        type: 'GERAL',
        content: `Projeto criado automaticamente a partir do orçamento ${quote.quoteNumber}. Valor total: R$ ${quote.total.toFixed(2)}`
      }
    });

    res.json({
      message: 'Orçamento convertido em projeto com sucesso',
      project
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Erro ao converter orçamento em projeto:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;
