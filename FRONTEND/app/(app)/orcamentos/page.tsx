'use client';

import { useEffect, useMemo, useState } from 'react';
import { API_URL, clientService, projectService, quoteService, stockService } from '@/services/api';
import type { Client, Project, Quote, QuoteLineItem, StockItem } from '@/types';
import { QuoteStatus } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  FileText, CheckCircle, Send, BookOpen, RefreshCw, Plus,
  Search, Calendar, DollarSign, Download, ArrowRight, X, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt     = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = new Intl.DateTimeFormat('pt-BR');
const formatCurrency = (v: number) => fmt.format(v);
const formatDate     = (v: string) => { try { return fmtDate.format(new Date(v)); } catch { return v; } };
const toDateInput    = (d: Date)   => d.toISOString().slice(0, 10);
const safeError      = (e: unknown) => e instanceof Error ? e.message : 'Erro inesperado.';

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  [QuoteStatus.Rascunho]:  'Rascunho',
  [QuoteStatus.Enviado]:   'Enviado',
  [QuoteStatus.Aprovado]:  'Aprovado',
  [QuoteStatus.Rejeitado]: 'Rejeitado',
};

const statusStyle = (s: string) => ({
  [QuoteStatus.Aprovado]:  'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  [QuoteStatus.Enviado]:   'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  [QuoteStatus.Rascunho]:  'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  [QuoteStatus.Rejeitado]: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
} as Record<string, string>)[s] ?? 'bg-muted text-muted-foreground border-border';

// ─── Tipos internos ────────────────────────────────────────────────────────────

type LineDraft = {
  id: string;
  kind: 'stock' | 'labor' | null;
  stockItemId: string;
  description: string;
  quantity: string;
  unitPrice: string;
};
type FormState = { quoteNumber: string; clientId: string; issueDate: string; expiryDate: string; tax: string; notes: string; lineItems: LineDraft[] };

function newDraft(): LineDraft {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, kind: null, stockItemId: '', description: '', quantity: '1', unitPrice: '' };
}

function defaultForm(clients: Client[]): FormState {
  return {
    quoteNumber: `ORC-${Date.now()}`,
    clientId:    clients[0]?.id ?? '',
    issueDate:   toDateInput(new Date()),
    expiryDate:  toDateInput(new Date(Date.now() + 7 * 86400000)),
    tax: '0', notes: '', lineItems: [newDraft()],
  };
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color = 'primary' }: {
  label: string; value: string; icon: React.ElementType; color?: string;
}) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    green:   'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    blue:    'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    yellow:  'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
  };
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', colorMap[color] ?? colorMap.primary)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Modal de criação ─────────────────────────────────────────────────────────

function QuoteCreateModal({ open, clients, onClose, onSaved }: {
  open: boolean; clients: Client[]; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [form, setForm]           = useState<FormState>(defaultForm(clients));
  const [clientSearch, setClientSearch] = useState('');
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setForm(defaultForm(clients));
    setClientSearch('');
    setSaving(false);
    setLoadingStock(true);
    stockService.getItems({ availableOnly: true })
      .then((items: StockItem[]) => {
        if (active) setStockItems(items.filter((item) => item.isActive && item.quantity > 0));
      })
      .catch((error) => {
        if (active) toast({ title: 'Erro ao carregar itens do estoque', description: safeError(error), variant: 'destructive' });
      })
      .finally(() => { if (active) setLoadingStock(false); });
    return () => { active = false; };
  }, [open, clients]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const updateLine = (id: string, field: keyof Omit<LineDraft, 'id'>, val: string) =>
    setForm((f) => ({ ...f, lineItems: f.lineItems.map((l) => l.id === id ? { ...l, [field]: val } : l) }));

  const selectLineItem = (lineId: string, value: string) => {
    if (value === 'labor') {
      setForm((current) => ({
        ...current,
        lineItems: current.lineItems.map((line) => line.id === lineId
          ? { ...line, kind: 'labor', stockItemId: '', description: 'Mão de obra', quantity: '1', unitPrice: '' }
          : line),
      }));
      return;
    }

    const stockItem = stockItems.find((item) => item.id === value);
    if (!stockItem) return;
    setForm((current) => ({
      ...current,
      lineItems: current.lineItems.map((line) => line.id === lineId
        ? { ...line, kind: 'stock', stockItemId: stockItem.id, description: stockItem.name, quantity: '1', unitPrice: String(stockItem.price) }
        : line),
    }));
  };

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => [c.name, c.email].some((f) => f.toLowerCase().includes(q)));
  }, [clientSearch, clients]);

  // Cálculo ao vivo do total
  const liveTotal = useMemo(() => {
    const sub = form.lineItems.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0), 0);
    return sub + sub * (Number(form.tax) / 100);
  }, [form.lineItems, form.tax]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clients.length) { toast({ title: 'Sem clientes', description: 'Cadastre um cliente antes.', variant: 'destructive' }); return; }
    if (!form.quoteNumber.trim() || !form.clientId) { toast({ title: 'Campos obrigatórios', description: 'Preencha número e selecione o cliente.', variant: 'destructive' }); return; }

    const selectedLines = form.lineItems.filter((line) => line.kind);
    if (!selectedLines.length) { toast({ title: 'Itens inválidos', description: 'Adicione um produto do estoque ou uma mão de obra.', variant: 'destructive' }); return; }

    const hasInvalidLine = selectedLines.some((line) =>
      !line.description.trim() || Number(line.quantity) <= 0 || Number(line.unitPrice) <= 0
    );
    if (hasInvalidLine) {
      toast({ title: 'Revise os itens', description: 'Informe descrição, quantidade e valor maior que zero para cada item.', variant: 'destructive' });
      return;
    }

    const lineItems = selectedLines.map((line) => ({
      stockItemId: line.kind === 'stock' ? line.stockItemId : null,
      description: line.description.trim(),
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
    }));

    setSaving(true);
    try {
      await quoteService.create({
        quoteNumber: form.quoteNumber.trim(),
        clientId:    form.clientId,
        issueDate:   form.issueDate,
        expiryDate:  form.expiryDate,
        tax:         Number(form.tax || 0),
        notes:       form.notes.trim() || null,
        status:      QuoteStatus.Rascunho,
        lineItems:   lineItems.map((line) => ({ ...line, total: line.quantity * line.unitPrice })),
      });
      await onSaved();
      onClose();
      toast({ title: 'Orçamento criado com sucesso!', variant: 'success' });
    } catch (err) {
      toast({ title: 'Erro ao criar orçamento', description: safeError(err), variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo orçamento</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5 py-2">
          {/* Número */}
          <div className="space-y-1.5">
            <Label htmlFor="q-num">Número do orçamento</Label>
            <Input id="q-num" value={form.quoteNumber} onChange={(e) => set('quoteNumber', e.target.value)} placeholder="ORC-123456" />
          </div>

          {/* Cliente */}
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <Input
              placeholder="Buscar cliente..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
            />
            <div className="max-h-40 overflow-y-auto rounded-md border bg-background divide-y divide-border">
              {filteredClients.length === 0
                ? <p className="p-3 text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
                : filteredClients.map((c) => (
                  <button
                    key={c.id} type="button"
                    onClick={() => set('clientId', c.id)}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm transition-colors hover:bg-accent',
                      form.clientId === c.id && 'bg-primary/10 font-semibold'
                    )}
                  >
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.email}</p>
                  </button>
                ))}
            </div>
          </div>

          {/* Datas + Taxa */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="q-issue">Emissão</Label>
              <Input id="q-issue" type="date" value={form.issueDate} onChange={(e) => set('issueDate', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-expiry">Validade</Label>
              <Input id="q-expiry" type="date" value={form.expiryDate} onChange={(e) => set('expiryDate', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="q-tax">Taxa (%)</Label>
              <Input id="q-tax" type="number" min="0" step="0.01" value={form.tax} onChange={(e) => set('tax', e.target.value)} />
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label htmlFor="q-notes">Observações</Label>
            <Textarea id="q-notes" rows={2} placeholder="Detalhes adicionais..." value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>

          {/* Itens de linha */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Itens</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => set('lineItems', [...form.lineItems, newDraft()])}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Adicionar item
              </Button>
            </div>

            {form.lineItems.map((item, idx) => (
              <div key={item.id} className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">Item {idx + 1}</span>
                  {form.lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => set('lineItems', form.lineItems.filter((l) => l.id !== item.id))}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Produto ou serviço</Label>
                  <Select value={item.kind === 'labor' ? 'labor' : item.stockItemId} onValueChange={(value) => selectLineItem(item.id, value)}>
                    <SelectTrigger><SelectValue placeholder={loadingStock ? 'Carregando estoque...' : 'Selecione um item'} /></SelectTrigger>
                    <SelectContent>
                      {stockItems.map((stockItem) => (
                        <SelectItem key={stockItem.id} value={stockItem.id}>
                          {stockItem.name} · {stockItem.quantity} {stockItem.unit} · {formatCurrency(stockItem.price)}
                        </SelectItem>
                      ))}
                      <SelectSeparator />
                      <SelectItem value="labor">Mão de obra · valor livre</SelectItem>
                    </SelectContent>
                  </Select>
                  {!loadingStock && stockItems.length === 0 && (
                    <p className="text-xs text-muted-foreground">Sem produtos com saldo. Você ainda pode adicionar mão de obra.</p>
                  )}
                </div>
                {item.kind && (
                  <Input
                    placeholder={item.kind === 'labor' ? 'Descrição do serviço' : 'Produto do estoque'}
                    value={item.description}
                    readOnly={item.kind === 'stock'}
                    onChange={(e) => updateLine(item.id, 'description', e.target.value)}
                  />
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Quantidade{item.kind === 'stock' ? ` (em estoque: ${stockItems.find((stockItem) => stockItem.id === item.stockItemId)?.quantity ?? 0})` : ''}
                    </Label>
                    <Input type="number" min="0" max={item.kind === 'stock' ? stockItems.find((stockItem) => stockItem.id === item.stockItemId)?.quantity : undefined} step="0.01" value={item.quantity} disabled={!item.kind} onChange={(e) => updateLine(item.id, 'quantity', e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Valor unitário (R$)</Label>
                    <Input type="number" min="0" step="0.01" value={item.unitPrice} disabled={item.kind !== 'labor'} onChange={(e) => updateLine(item.id, 'unitPrice', e.target.value)} placeholder={item.kind === 'labor' ? 'Informe o valor' : undefined} />
                  </div>
                </div>
                <p className="text-right text-xs font-semibold text-muted-foreground">
                  Subtotal: {formatCurrency((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0))}
                </p>
              </div>
            ))}

            {/* Total ao vivo */}
            <div className="flex justify-end rounded-lg border bg-primary/5 px-4 py-2">
              <p className="text-sm font-bold">Total estimado: <span className="text-primary">{formatCurrency(liveTotal)}</span></p>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Criar orçamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal de alteração de status ─────────────────────────────────────────────

function StatusModal({ quote, onClose, onSaved }: {
  quote: Quote | null; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);

  const change = async (status: QuoteStatus) => {
    if (!quote) return;
    setSaving(true);
    try {
      await quoteService.update(quote.id, {
        quoteNumber: quote.quoteNumber,
        clientId:    quote.clientId,
        issueDate:   quote.issueDate,
        expiryDate:  quote.expiryDate,
        tax:         quote.tax,
        notes:       quote.notes ?? null,
        status,
        lineItems: (quote.lineItems as QuoteLineItem[]).map((i) => ({
          stockItemId: i.stockItemId ?? null,
          description: i.description,
          quantity:    i.quantity,
          unitPrice:   i.unitPrice,
          total:       i.total,
        })),
      });
      await onSaved();
      onClose();
      toast({ title: 'Status atualizado com sucesso!', variant: 'success' });
    } catch (err) {
      toast({ title: 'Erro ao atualizar status', description: safeError(err), variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={!!quote} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Alterar status — {quote?.quoteNumber}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 py-2">
          {Object.values(QuoteStatus).map((s) => (
            <button
              key={s}
              disabled={saving || quote?.status === s}
              onClick={() => void change(s)}
              className={cn(
                'rounded-lg border px-3 py-2 text-sm font-semibold transition-all',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                quote?.status === s ? statusStyle(s) + ' ring-2 ring-offset-1 ring-primary' : statusStyle(s),
                'hover:opacity-80'
              )}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal de confirmação de conversão ────────────────────────────────────────

function ConvertModal({ quote, onClose, onSaved }: {
  quote: Quote | null; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    if (!quote) return;
    setLoading(true);
    try {
      await quoteService.convertToProject(quote.id, {});
      await onSaved();
      onClose();
      toast({ title: 'Orçamento convertido em projeto!', variant: 'success' });
    } catch (err) {
      toast({ title: 'Erro ao converter', description: safeError(err), variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={!!quote} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Converter em projeto</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          Deseja criar um projeto a partir do orçamento <strong>{quote?.quoteNumber}</strong>? Essa ação não pode ser desfeita.
        </p>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={() => void confirm()} disabled={loading}>
            <ArrowRight className="mr-2 h-4 w-4" />
            {loading ? 'Convertendo...' : 'Converter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Card de orçamento ────────────────────────────────────────────────────────

function QuoteCard({ quote, clientName, linked, onStatusClick, onConvertClick, onPdfClick }: {
  quote: Quote; clientName: string; linked: boolean;
  onStatusClick: () => void; onConvertClick: () => void; onPdfClick: () => void;
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-sm leading-none">{quote.quoteNumber}</p>
            <p className="mt-1 text-xs text-muted-foreground truncate">{clientName}</p>
          </div>
          <span className={cn('shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold', statusStyle(quote.status))}>
            {STATUS_LABEL[quote.status] ?? quote.status}
          </span>
        </div>

        {/* Detalhes */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md bg-muted/50 px-2 py-1.5 text-center">
            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><Calendar className="h-2.5 w-2.5" />Emissão</p>
            <p className="text-xs font-semibold mt-0.5">{formatDate(quote.issueDate)}</p>
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-1.5 text-center">
            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><Calendar className="h-2.5 w-2.5" />Validade</p>
            <p className="text-xs font-semibold mt-0.5">{formatDate(quote.expiryDate)}</p>
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-1.5 text-center">
            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><DollarSign className="h-2.5 w-2.5" />Total</p>
            <p className="text-xs font-semibold mt-0.5">{formatCurrency(quote.total)}</p>
          </div>
        </div>

        {/* Observações */}
        {quote.notes && (
          <p className="text-xs text-muted-foreground italic line-clamp-2 border-l-2 border-border pl-2">
            {quote.notes}
          </p>
        )}

        {/* Ações */}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1" onClick={onStatusClick}>
            Alterar status
          </Button>
          <Button variant="outline" size="sm" onClick={onPdfClick}>
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm" className="flex-1"
            disabled={linked || quote.status !== QuoteStatus.Aprovado}
            onClick={onConvertClick}
            title={linked ? 'Já convertido em projeto' : quote.status !== QuoteStatus.Aprovado ? 'Só disponível para orçamentos aprovados' : 'Converter em projeto'}
          >
            <ArrowRight className="mr-1.5 h-3.5 w-3.5" />
            {linked ? 'Já convertido' : 'Converter'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

type StatusFilter = 'TODOS' | QuoteStatus;

export default function OrcamentosPage() {
  const [quotes,   setQuotes]   = useState<Quote[]>([]);
  const [clients,  setClients]  = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [query,    setQuery]    = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('TODOS');

  const [createOpen,  setCreateOpen]  = useState(false);
  const [statusQuote, setStatusQuote] = useState<Quote | null>(null);
  const [convertQuote, setConvertQuote] = useState<Quote | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [q, c, p] = await Promise.all([
        quoteService.getAll().catch(() => []),
        clientService.getAll().catch(() => []),
        projectService.getAll().catch(() => []),
      ]);
      setQuotes(q); setClients(c); setProjects(p);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const clientNameById  = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);
  const projectQuoteIds = useMemo(() => new Set(projects.map((p) => p.quoteId).filter(Boolean) as string[]), [projects]);

  const summary = useMemo(() => ({
    total:    quotes.length,
    approved: quotes.filter((q) => q.status === QuoteStatus.Aprovado).length,
    sent:     quotes.filter((q) => q.status === QuoteStatus.Enviado).length,
    draft:    quotes.filter((q) => q.status === QuoteStatus.Rascunho).length,
  }), [quotes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return quotes.filter((quote) => {
      const statusOk = statusFilter === 'TODOS' || quote.status === statusFilter;
      const textOk   = !q || [quote.quoteNumber, clientNameById.get(quote.clientId) ?? '', quote.notes ?? ''].some((f) => f.toLowerCase().includes(q));
      return statusOk && textOk;
    });
  }, [clientNameById, query, quotes, statusFilter]);

  const downloadPdf = async (quote: Quote) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${API_URL}/quotes/${quote.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erro ao gerar PDF.');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `orcamento-${quote.quoteNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({ title: 'Erro ao gerar PDF', description: safeError(err), variant: 'destructive' });
    }
  };

  const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: 'TODOS',              label: 'Todos'    },
    { value: QuoteStatus.Rascunho, label: 'Rascunho' },
    { value: QuoteStatus.Enviado,  label: 'Enviado'  },
    { value: QuoteStatus.Aprovado, label: 'Aprovado' },
    { value: QuoteStatus.Rejeitado,label: 'Rejeitado'},
  ];

  return (
    <>
      <QuoteCreateModal  open={createOpen}       clients={clients} onClose={() => setCreateOpen(false)}   onSaved={load} />
      <StatusModal       quote={statusQuote}      onClose={() => setStatusQuote(null)}   onSaved={load} />
      <ConvertModal      quote={convertQuote}     onClose={() => setConvertQuote(null)}  onSaved={load} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Orçamentos</h1>
            <p className="text-sm text-muted-foreground">Crie e gerencie seus orçamentos</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
              Atualizar
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Novo orçamento
            </Button>
          </div>
        </div>

        {/* StatCards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total"     value={String(summary.total)}    icon={FileText}    />
          <StatCard label="Aprovados" value={String(summary.approved)} icon={CheckCircle} color="green"  />
          <StatCard label="Enviados"  value={String(summary.sent)}     icon={Send}        color="blue"   />
          <StatCard label="Rascunhos" value={String(summary.draft)}    icon={BookOpen}    color="yellow" />
        </div>

        {/* Busca + Filtros */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por número, cliente ou observação..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Chips de filtro */}
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                  statusFilter === value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border bg-background hover:bg-accent'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex h-40 items-center justify-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Carregando orçamentos...</span>
          </div>
        )}

        {/* Vazio */}
        {!loading && filtered.length === 0 && (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
            <FileText className="h-8 w-8 opacity-40" />
            <p className="text-sm">
              {query || statusFilter !== 'TODOS' ? 'Nenhum orçamento encontrado para esse filtro.' : 'Nenhum orçamento cadastrado.'}
            </p>
          </div>
        )}

        {/* Grid de cards */}
        {!loading && filtered.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground">
              {filtered.length} de {quotes.length} orçamento{quotes.length !== 1 ? 's' : ''}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((quote) => (
                <QuoteCard
                  key={quote.id}
                  quote={quote}
                  clientName={clientNameById.get(quote.clientId) ?? 'Cliente não encontrado'}
                  linked={projectQuoteIds.has(quote.id)}
                  onStatusClick={()  => setStatusQuote(quote)}
                  onConvertClick={() => setConvertQuote(quote)}
                  onPdfClick={()     => void downloadPdf(quote)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
