// ─── Enums ────────────────────────────────────────────────────────────────────

export enum QuoteStatus {
  Rascunho  = 'RASCUNHO',
  Enviado   = 'ENVIADO',
  Aprovado  = 'APROVADO',
  Rejeitado = 'REJEITADO',
}

export enum InvoiceStatus {
  Rascunho = 'RASCUNHO',
  Pendente = 'PENDENTE',
  Pago     = 'PAGO',
  Atrasado = 'ATRASADO',
  Cancelado = 'CANCELADO',
}

export enum ProjectStatus {
  NaoIniciado = 'NAO_INICIADO',
  EmAndamento = 'EM_ANDAMENTO',
  Concluido   = 'CONCLUIDO',
}

export enum ProjectExpenseCategory {
  Almoco        = 'ALMOCO',
  Deslocamento  = 'DESLOCAMENTO',
  Material      = 'MATERIAL',
  Outros        = 'OUTROS',
}

export enum ProjectNoteType {
  Geral      = 'GERAL',
  Progresso  = 'PROGRESSO',
  Problema   = 'PROBLEMA',
  Observacao = 'OBSERVACAO',
}

export enum StockItemType {
  Produto      = 'PRODUTO',
  MaoDeObra    = 'MAO_DE_OBRA',
  Metro        = 'METRO',
  Equipamento  = 'EQUIPAMENTO',
  Ferramenta   = 'FERRAMENTA',
  Material     = 'MATERIAL',
}

export enum StockMovementType {
  Entrada      = 'ENTRADA',
  Saida        = 'SAIDA',
  Ajuste       = 'AJUSTE',
  Transferencia = 'TRANSFERENCIA',
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface QuoteLineItem {
  id: string;
  quoteId: string;
  stockItemId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  stockItemId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  clientId: string;
  client?: Client;
  issueDate: string;
  expiryDate: string;
  lineItems: QuoteLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: QuoteStatus;
  notes?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  quoteId?: string;
  clientId: string;
  client?: Client;
  issueDate: string;
  dueDate: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  status: InvoiceStatus;
  expenses?: Expense[];
}

export interface Task {
  id: string;
  name: string;
  isCompleted: boolean;
  projectId: string;
}

export interface ProjectExpense {
  id: string;
  projectId: string;
  category: ProjectExpenseCategory;
  description: string;
  amount: number;
  date: string;
  receipt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectNote {
  id: string;
  projectId: string;
  title: string;
  content: string;
  type: ProjectNoteType;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  quoteId?: string;
  startDate: string;
  endDate?: string;
  status: ProjectStatus;
  description?: string;
  progress: number;
  budget?: number;
  tasks: Task[];
  projectExpenses?: ProjectExpense[];
  projectNotes?: ProjectNote[];
  client?: Client;
  quote?: Quote;
  taskProgress?: number;
  totalExpenses?: number;
  daysRemaining?: number;
  isOverdue?: boolean;
}

export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  invoiceId?: string;
}

export interface StockCategory {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  items?: StockItem[];
  _count?: { items: number };
}

export interface StockItem {
  id: string;
  name: string;
  description?: string | null;
  categoryId: string;
  type: string;
  unit: string;
  price: number;
  quantity: number;
  minStock?: number | null;
  maxStock?: number | null;
  barcode?: string | null;
  supplier?: string | null;
  location?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category?: StockCategory;
  movements?: StockMovement[];
  totalValue?: number;
  isLowStock?: boolean;
  lastMovement?: StockMovement;
}

export interface StockMovement {
  id: string;
  itemId: string;
  type: string;
  quantity: number;
  unitPrice?: number;
  totalValue?: number;
  reason?: string;
  reference?: string;
  userId?: string;
  createdAt: string;
}

export interface UserSettings {
  theme?: 'light' | 'dark' | 'auto';
  notifications?: {
    newQuotes?: boolean;
    overdueInvoices?: boolean;
    weeklyReports?: boolean;
  };
}
