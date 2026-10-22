import express from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { authenticateToken } from '../middleware/auth';
import prisma from '../lib/prisma';

const router = express.Router();
router.use(authenticateToken);

// Multer — armazena em memória (sem salvar disco)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'text/plain',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Formato inválido. Envie um arquivo .xlsx, .xls ou .csv'));
    }
  },
});

// ─── Tipos ────────────────────────────────────────────────────────────────────

type RawRow = Record<string, unknown>;

type ParsedItem = {
  name: string;
  categoryName: string;
  type: string;
  unit: string;
  price: number;
  quantity?: number;
  description?: string;
  minStock?: number;
  maxStock?: number;
  supplier?: string;
  location?: string;
  barcode?: string;
};

type ImportResult = {
  success: number;
  errors: { row: number; name: string; reason: string }[];
  items: { id: string; name: string }[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const str = (v: unknown): string => (v !== null && v !== undefined ? String(v).trim() : '');
const num = (v: unknown): number | undefined => {
  const n = Number(str(v).replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};

const VALID_TYPES = ['PRODUTO', 'MAO_DE_OBRA', 'METRO', 'EQUIPAMENTO', 'FERRAMENTA', 'MATERIAL'];

const normalizeType = (v: string): string =>
  v.toUpperCase().replace(/\s+/g, '_').replace('MÃO', 'MAO').replace('MÃO_DE_OBRA', 'MAO_DE_OBRA');

// Mapeia cabeçalhos flexíveis (PT e EN) para chaves internas
const HEADER_MAP: Record<string, keyof ParsedItem> = {
  nome: 'name', name: 'name',
  categoria: 'categoryName', category: 'categoryName', categoryname: 'categoryName',
  tipo: 'type', type: 'type',
  unidade: 'unit', unit: 'unit',
  preco: 'price', 'preço': 'price', price: 'price',
  quantidade: 'quantity', quantity: 'quantity', qty: 'quantity',
  descricao: 'description', 'descrição': 'description', description: 'description',
  estoque_minimo: 'minStock', minstock: 'minStock', 'estoque mínimo': 'minStock', minimo: 'minStock',
  estoque_maximo: 'maxStock', maxstock: 'maxStock', 'estoque máximo': 'maxStock', maximo: 'maxStock',
  fornecedor: 'supplier', supplier: 'supplier',
  localizacao: 'location', 'localização': 'location', location: 'location',
  'codigo_barras': 'barcode', barcode: 'barcode', 'código de barras': 'barcode', codigo: 'barcode',
};

const normalizeHeader = (h: string): string =>
  h.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');

function parseRows(rows: RawRow[]): { index: number; item?: ParsedItem; error?: string }[] {
  if (rows.length === 0) return [];

  // Descobre o mapeamento de colunas a partir do primeiro row
  const firstKeys = Object.keys(rows[0]);
  const colMap: Record<string, keyof ParsedItem> = {};
  for (const key of firstKeys) {
    const norm = normalizeHeader(key);
    if (HEADER_MAP[norm]) colMap[key] = HEADER_MAP[norm];
    // tenta também sem normalização
    if (!colMap[key] && HEADER_MAP[key.toLowerCase()]) colMap[key] = HEADER_MAP[key.toLowerCase()];
  }

  return rows.map((row, idx) => {
    const mapped: Partial<ParsedItem> = {};
    for (const [col, field] of Object.entries(colMap)) {
      const raw = row[col];
      if (field === 'price' || field === 'quantity' || field === 'minStock' || field === 'maxStock') {
        const n = num(raw);
        if (n !== undefined) (mapped as Record<string, unknown>)[field] = n;
      } else {
        const s = str(raw);
        if (s) (mapped as Record<string, unknown>)[field] = s;
      }
    }

    // Validações obrigatórias
    if (!mapped.name)         return { index: idx + 2, error: 'Campo "name" (nome) é obrigatório' };
    if (!mapped.categoryName) return { index: idx + 2, error: 'Campo "category" (categoria) é obrigatório' };
    if (!mapped.type)         return { index: idx + 2, error: 'Campo "type" (tipo) é obrigatório' };
    if (!mapped.unit)         return { index: idx + 2, error: 'Campo "unit" (unidade) é obrigatório' };
    if (mapped.price === undefined || mapped.price < 0)
      return { index: idx + 2, error: 'Campo "price" (preço) é obrigatório e deve ser ≥ 0' };

    const normalizedType = normalizeType(mapped.type);
    if (!VALID_TYPES.includes(normalizedType))
      return { index: idx + 2, error: `Tipo inválido: "${mapped.type}". Use: ${VALID_TYPES.join(', ')}` };

    if (mapped.minStock !== undefined && mapped.maxStock !== undefined && mapped.maxStock < mapped.minStock)
      return { index: idx + 2, error: 'Estoque máximo não pode ser menor que o mínimo' };

    return { index: idx + 2, item: { ...mapped, type: normalizedType, name: mapped.name!, categoryName: mapped.categoryName!, unit: mapped.unit!, price: mapped.price! } };
  });
}

// ─── GET /stock/import/template — baixar template Excel ──────────────────────

router.get('/template', (_req, res) => {
  const headers = [
    ['name', 'categoryName', 'type', 'unit', 'price', 'quantity',
     'description', 'minStock', 'maxStock', 'supplier', 'location', 'barcode'],
  ];

  const example = [
    'Cabo HDMI 2m', 'Eletrônicos', 'PRODUTO', 'UN', 25.90, 50,
    'Cabo HDMI 2.0 de 2 metros', 10, 200, 'TechSupply Ltda', 'Prateleira A1', '7891234567890',
  ];

  const types = [
    '(obrigatório)', '(obrigatório)', 'PRODUTO | MAO_DE_OBRA | METRO | EQUIPAMENTO | FERRAMENTA | MATERIAL',
    'UN | KG | M | HORA | CX | PC', '(obrigatório)', '(padrão: 0)',
    '(opcional)', '(opcional)', '(opcional)', '(opcional)', '(opcional)', '(opcional)',
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers[0], example, types]);

  // Largura das colunas
  ws['!cols'] = [16, 16, 20, 8, 10, 10, 30, 12, 12, 20, 16, 16].map((w) => ({ wch: w }));

  XLSX.utils.book_append_sheet(wb, ws, 'Estoque');

  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Disposition', 'attachment; filename="template_estoque.xlsx"');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buf);
});

// ─── POST /stock/import/preview — valida sem inserir ─────────────────────────

router.post('/preview', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const wb  = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws  = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<RawRow>(ws, { defval: '' });

    if (raw.length === 0) return res.status(400).json({ error: 'Arquivo vazio ou sem dados.' });

    const parsed = parseRows(raw);
    const valid  = parsed.filter((r) => r.item).map((r) => ({ row: r.index, ...r.item }));
    const errors = parsed.filter((r) => r.error).map((r) => ({ row: r.index, name: str((raw[r.index - 2] as RawRow)?.name ?? (raw[r.index - 2] as RawRow)?.nome ?? ''), reason: r.error! }));

    res.json({ total: raw.length, valid: valid.length, errors: errors.length, preview: valid.slice(0, 10), errorDetails: errors });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erro ao processar arquivo.' });
  }
});

// ─── POST /stock/import — importa de fato ────────────────────────────────────

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado.' });

    const wb  = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws  = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<RawRow>(ws, { defval: '' });

    if (raw.length === 0) return res.status(400).json({ error: 'Arquivo vazio ou sem dados.' });

    const parsed = parseRows(raw);
    const result: ImportResult = { success: 0, errors: [], items: [] };

    for (const entry of parsed) {
      if (entry.error || !entry.item) {
        const rawRow = raw[entry.index - 2] as RawRow;
        result.errors.push({ row: entry.index, name: str(rawRow?.name ?? rawRow?.nome ?? ''), reason: entry.error! });
        continue;
      }

      const item = entry.item;
      try {
        // Busca ou cria categoria
        let category = await prisma.stockCategory.findFirst({ where: { name: { equals: item.categoryName } } });
        if (!category) {
          category = await prisma.stockCategory.create({ data: { name: item.categoryName } });
        }

        const created = await prisma.stockItem.create({
          data: {
            name:        item.name,
            description: item.description ?? null,
            categoryId:  category.id,
            type:        item.type,
            unit:        item.unit.toUpperCase(),
            price:       item.price,
            quantity:    item.quantity  ?? 0,
            minStock:    item.minStock  ?? null,
            maxStock:    item.maxStock  ?? null,
            supplier:    item.supplier  ?? null,
            location:    item.location  ?? null,
            barcode:     item.barcode   ?? null,
            isActive:    true,
          },
        });

        result.success++;
        result.items.push({ id: created.id, name: created.name });
      } catch (dbErr) {
        result.errors.push({
          row: entry.index,
          name: item.name,
          reason: dbErr instanceof Error ? dbErr.message : 'Erro ao inserir no banco.',
        });
      }
    }

    const status = result.errors.length > 0 && result.success === 0 ? 400 : 207;
    res.status(status).json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Erro ao processar arquivo.' });
  }
});

export default router;
