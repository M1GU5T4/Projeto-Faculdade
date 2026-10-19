'use client';

import { useEffect, useMemo, useState } from 'react';
import { clientService, invoiceService } from '@/services/api';
import type { Client, Expense, Invoice } from '@/types';
import { InvoiceStatus } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  Receipt, CheckCircle, AlertTriangle, DollarSign,
  RefreshCw, Search, X, Calendar, User, Tag, BadgeCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt     = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = new Intl.DateTimeFormat('pt-BR');
const formatCurrency = (v: number) => fmt.format(v);
const formatDate     = (v: string) => { try { return fmtDate.format(new Date(v)); } catch { return v; } };
const safeError      = (e: unknown) => e instanceof Error ? e.message : 'Erro inesperado.';

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  PAGO: 'Pago', PENDENTE: 'Pendente', ATRASADO: 'Atrasado',
  CANCELADO: 'Cancelado', RASCUNHO: 'Rascunho',
};

const statusStyle = (s: string) => ({
  PAGO:      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  PENDENTE:  'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  ATRASADO:  'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  CANCELADO: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400',
  RASCUNHO:  'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400',
} as Record<string, string>)[s] ?? 'bg-muted text-muted-foreground border-border';

type StatusFilter = 'TODOS' | InvoiceStatus;
type InvoiceDetails = Invoice & { client?: Client; expenses?: Expense[] };

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, variant = 'default' }: {
  label: string; value: string; icon: React.ElementType;
  variant?: 'default' | 'success' | 'danger' | 'warning';
}) {
  const iconClass = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    danger:  'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    warning: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
  }[variant];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-xl font-bold">{value}</p>
          </div>
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', iconClass)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Modal de confirmação — marcar como paga ──────────────────────────────────

function MarkPaidModal({ invoice, onClose, onSaved }: {
  invoice: Invoice | null; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    if (!invoice) return;
    setLoading(true);
    try {
      await invoiceService.markAsPaid(invoice.id, invoice.total);
      await onSaved();
      onClose();
      toast({ title: 'Fatura marcada como paga!', variant: 'success' });
    } catch (err) {
      toast({ title: 'Erro ao baixar fatura', description: safeError(err), variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={!!invoice} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Baixar fatura</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-2">
          <p className="text-sm text-muted-foreground">
            Deseja marcar a fatura <strong>{invoice?.invoiceNumber}</strong> como paga?
          </p>
          {invoice && (
            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor total</span>
                <span className="font-semibold">{formatCurrency(invoice.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Já pago</span>
                <span className="font-semibold text-green-600">{formatCurrency(invoice.amountPaid)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 mt-1">
                <span className="text-muted-foreground">A receber</span>
                <span className="font-bold">{formatCurrency(Math.max(invoice.total - invoice.amountPaid, 0))}</span>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={() => void confirm()} disabled={loading}>
            <BadgeCheck className="mr-2 h-4 w-4" />
            {loading ? 'Salvando...' : 'Confirmar pagamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal de detalhes ────────────────────────────────────────────────────────

function DetailsModal({ invoiceId, clientName, onClose }: {
  invoiceId: string | null; clientName: string; onClose: () => void;
}) {
  const [details, setDetails]   = useState<InvoiceDetails | null>(null);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (!invoiceId) { setDetails(null); return; }
    setLoading(true);
    invoiceService.getById(invoiceId)
      .then((d) => setDetails(d))
      .catch(() => toast({ title: 'Erro ao carregar detalhes', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  const linkedExpenses  = details?.expenses ?? [];
  const linkedTotal     = linkedExpenses.reduce((s, e) => s + e.amount, 0);
  const remaining       = details ? Math.max(details.total - details.amountPaid, 0) : 0;
  const resolvedClient  = details?.client?.name ?? clientName;

  return (
    <Dialog open={!!invoiceId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da fatura</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex h-32 items-center justify-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Carregando...</span>
          </div>
        )}

        {!loading && details && (
          <div className="space-y-4 py-2">
            {/* Cabeçalho */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold">{details.invoiceNumber}</p>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                  <User className="h-3.5 w-3.5" />
                  {resolvedClient}
                </div>
              </div>
              <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-semibold shrink-0', statusStyle(details.status))}>
                {STATUS_LABEL[details.status] ?? details.status}
              </span>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Emissão</p>
                <p className="font-semibold mt-0.5">{formatDate(details.issueDate)}</p>
              </div>
              <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Vencimento</p>
                <p className="font-semibold mt-0.5">{formatDate(details.dueDate)}</p>
              </div>
            </div>

            {/* Valores */}
            <div className="rounded-lg border divide-y divide-border text-sm">
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(details.subtotal)}</span>
              </div>
              {details.tax > 0 && (
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-muted-foreground">Taxa</span>
                  <span className="font-medium">{formatCurrency(details.tax)}</span>
                </div>
              )}
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold">{formatCurrency(details.total)}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5">
                <span className="text-muted-foreground">Pago</span>
                <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(details.amountPaid)}</span>
              </div>
              <div className="flex justify-between px-4 py-2.5 bg-muted/30">
                <span className="font-semibold">Em aberto</span>
                <span className={cn('font-bold', remaining > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400')}>
                  {formatCurrency(remaining)}
                </span>
              </div>
            </div>

            {/* Itens de linha */}
            {details.lineItems && details.lineItems.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Itens</p>
                <div className="rounded-lg border divide-y divide-border text-sm">
                  {details.lineItems.map((item) => (
                    <div key={item.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{item.description}</p>
                        <p className="text-xs text-muted-foreground">{item.quantity} × {formatCurrency(item.unitPrice)}</p>
                      </div>
                      <span className="font-semibold shrink-0">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Despesas vinculadas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">Despesas vinculadas</p>
                {linkedExpenses.length > 0 && (
                  <span className="text-xs text-muted-foreground">{formatCurrency(linkedTotal)}</span>
                )}
              </div>
              {linkedExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Nenhuma despesa vinculada.</p>
              ) : (
                <div className="space-y-2">
                  {linkedExpenses.map((exp) => (
                    <div key={exp.id} className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2.5 gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{exp.description}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Tag className="h-2.5 w-2.5" />{exp.category} · {formatDate(exp.date)}
                        </div>
                      </div>
                      <span className="text-sm font-semibold shrink-0 text-red-600 dark:text-red-400">
                        {formatCurrency(exp.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Card de fatura ───────────────────────────────────────────────────────────

function InvoiceCard({ invoice, clientName, onDetails, onMarkPaid }: {
  invoice: Invoice; clientName: string;
  onDetails: () => void; onMarkPaid: () => void;
}) {
  const remaining = Math.max(invoice.total - invoice.amountPaid, 0);
  const isPaid    = invoice.status === InvoiceStatus.Pago;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-sm leading-none">{invoice.invoiceNumber}</p>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">{clientName}</span>
            </div>
          </div>
          <span className={cn('shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold', statusStyle(invoice.status))}>
            {STATUS_LABEL[invoice.status] ?? invoice.status}
          </span>
        </div>

        {/* Grid de valores */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md bg-muted/50 px-2.5 py-2 text-center">
            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
              <Calendar className="h-2.5 w-2.5" />Emissão
            </p>
            <p className="text-xs font-semibold mt-0.5">{formatDate(invoice.issueDate)}</p>
          </div>
          <div className="rounded-md bg-muted/50 px-2.5 py-2 text-center">
            <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
              <Calendar className="h-2.5 w-2.5" />Vencimento
            </p>
            <p className="text-xs font-semibold mt-0.5">{formatDate(invoice.dueDate)}</p>
          </div>
          <div className="rounded-md bg-muted/50 px-2.5 py-2 text-center">
            <p className="text-[10px] text-muted-foreground">Pago</p>
            <p className="text-xs font-semibold mt-0.5 text-green-600 dark:text-green-400">{formatCurrency(invoice.amountPaid)}</p>
          </div>
          <div className="rounded-md bg-muted/50 px-2.5 py-2 text-center">
            <p className="text-[10px] text-muted-foreground">Em aberto</p>
            <p className={cn('text-xs font-semibold mt-0.5', remaining > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>
              {formatCurrency(remaining)}
            </p>
          </div>
        </div>

        {/* Total em destaque */}
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-base font-bold">{formatCurrency(invoice.total)}</span>
        </div>

        {/* Ações */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onDetails}>
            Detalhes
          </Button>
          {!isPaid && (
            <Button size="sm" className="flex-1" onClick={onMarkPaid}>
              <BadgeCheck className="mr-1.5 h-3.5 w-3.5" />
              Marcar como paga
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function FaturasPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients,  setClients]  = useState<Client[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [query,    setQuery]    = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('TODOS');

  const [detailsId,   setDetailsId]   = useState<string | null>(null);
  const [markPaidInv, setMarkPaidInv] = useState<Invoice | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [i, c] = await Promise.all([
        invoiceService.getAll().catch(() => []),
        clientService.getAll().catch(() => []),
      ]);
      setInvoices(i); setClients(c);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const clientNameById = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);

  const summary = useMemo(() => ({
    total:     invoices.length,
    paid:      invoices.filter((i) => i.status === InvoiceStatus.Pago).length,
    overdue:   invoices.filter((i) => i.status === InvoiceStatus.Atrasado).length,
    openValue: invoices.reduce((s, i) => s + Math.max(i.total - i.amountPaid, 0), 0),
  }), [invoices]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((inv) => {
      const statusOk = statusFilter === 'TODOS' || inv.status === statusFilter;
      const textOk   = !q || [inv.invoiceNumber, clientNameById.get(inv.clientId) ?? ''].some((f) => f.toLowerCase().includes(q));
      return statusOk && textOk;
    });
  }, [clientNameById, invoices, query, statusFilter]);

  const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
    { value: 'TODOS',                    label: 'Todos'     },
    { value: InvoiceStatus.Rascunho,     label: 'Rascunho'  },
    { value: InvoiceStatus.Pendente,     label: 'Pendente'  },
    { value: InvoiceStatus.Pago,         label: 'Pago'      },
    { value: InvoiceStatus.Atrasado,     label: 'Atrasado'  },
    { value: InvoiceStatus.Cancelado,    label: 'Cancelado' },
  ];

  const detailsClientName = detailsId
    ? clientNameById.get(invoices.find((i) => i.id === detailsId)?.clientId ?? '') ?? ''
    : '';

  return (
    <>
      <MarkPaidModal invoice={markPaidInv} onClose={() => setMarkPaidInv(null)} onSaved={load} />
      <DetailsModal  invoiceId={detailsId} clientName={detailsClientName} onClose={() => setDetailsId(null)} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Faturas</h1>
            <p className="text-sm text-muted-foreground">Gestão de cobranças e pagamentos</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            Atualizar
          </Button>
        </div>

        {/* StatCards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total"      value={String(summary.total)}             icon={Receipt}       />
          <StatCard label="Pagas"      value={String(summary.paid)}              icon={CheckCircle}   variant="success" />
          <StatCard label="Atrasadas"  value={String(summary.overdue)}           icon={AlertTriangle} variant="danger"  />
          <StatCard label="Em aberto"  value={formatCurrency(summary.openValue)} icon={DollarSign}    variant="warning" />
        </div>

        {/* Busca + Filtros */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por número da fatura ou cliente..."
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
            <span className="text-sm text-muted-foreground">Carregando faturas...</span>
          </div>
        )}

        {/* Vazio */}
        {!loading && filtered.length === 0 && (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Receipt className="h-8 w-8 opacity-40" />
            <p className="text-sm">
              {query || statusFilter !== 'TODOS' ? 'Nenhuma fatura encontrada para esse filtro.' : 'Nenhuma fatura cadastrada.'}
            </p>
          </div>
        )}

        {/* Grid */}
        {!loading && filtered.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground">
              {filtered.length} de {invoices.length} fatura{invoices.length !== 1 ? 's' : ''}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((invoice) => (
                <InvoiceCard
                  key={invoice.id}
                  invoice={invoice}
                  clientName={clientNameById.get(invoice.clientId) ?? 'Cliente não encontrado'}
                  onDetails={()  => setDetailsId(invoice.id)}
                  onMarkPaid={() => setMarkPaidInv(invoice)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
