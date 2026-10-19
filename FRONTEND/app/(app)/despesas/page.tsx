'use client';

import { useEffect, useMemo, useState } from 'react';
import { expenseService, invoiceService } from '@/services/api';
import type { Expense, Invoice } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  TrendingDown, Link2, Receipt, Layers,
  RefreshCw, Plus, Search, X, Calendar, Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt     = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = new Intl.DateTimeFormat('pt-BR');
const formatCurrency = (v: number) => fmt.format(v);
const formatDate     = (v: string) => { try { return fmtDate.format(new Date(v)); } catch { return v; } };
const toDateInput    = (d: Date)   => d.toISOString().slice(0, 10);
const safeError      = (e: unknown) => e instanceof Error ? e.message : 'Erro inesperado.';

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color = 'primary' }: {
  label: string; value: string; icon: React.ElementType; color?: 'primary' | 'red' | 'blue' | 'green';
}) {
  const colors = {
    primary: 'bg-primary/10 text-primary',
    red:     'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    blue:    'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green:   'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  };
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-xl font-bold">{value}</p>
          </div>
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', colors[color])}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Modal de criação ─────────────────────────────────────────────────────────

type FormState = { category: string; description: string; amount: string; date: string; invoiceId: string };

function ExpenseCreateModal({ open, invoices, onClose, onSaved }: {
  open: boolean; invoices: Invoice[]; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [form, setForm]           = useState<FormState>({ category: '', description: '', amount: '', date: toDateInput(new Date()), invoiceId: '' });
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ category: '', description: '', amount: '', date: toDateInput(new Date()), invoiceId: '' });
      setInvoiceSearch('');
      setSaving(false);
    }
  }, [open]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const filteredInvoices = useMemo(() => {
    const q = invoiceSearch.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((i) => i.invoiceNumber.toLowerCase().includes(q));
  }, [invoiceSearch, invoices]);

  const selectedInvoice = invoices.find((i) => i.id === form.invoiceId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount.replace(',', '.'));

    if (!form.category.trim() || !form.description.trim() || !form.date) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha categoria, descrição e data.', variant: 'destructive' });
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: 'Valor inválido', description: 'Informe um valor maior que zero.', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await expenseService.create({
        category:    form.category.trim(),
        description: form.description.trim(),
        amount,
        date:        form.date,
        invoiceId:   form.invoiceId || undefined,
      });
      await onSaved();
      onClose();
      toast({ title: 'Despesa cadastrada com sucesso!', variant: 'success' });
    } catch (err) {
      toast({ title: 'Erro ao criar despesa', description: safeError(err), variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova despesa</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 py-2">
          {/* Categoria */}
          <div className="space-y-1.5">
            <Label htmlFor="e-cat">Categoria</Label>
            <Input
              id="e-cat"
              placeholder="Material, transporte, alimentação..."
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
            />
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label htmlFor="e-desc">Descrição</Label>
            <Textarea
              id="e-desc"
              rows={2}
              placeholder="Descreva o que foi gasto"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
            />
          </div>

          {/* Valor + Data */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="e-amount">Valor (R$)</Label>
              <Input
                id="e-amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="e-date">Data</Label>
              <Input
                id="e-date"
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
              />
            </div>
          </div>

          {/* Vínculo com fatura */}
          <div className="space-y-1.5">
            <Label>Vincular a fatura <span className="text-xs text-muted-foreground">(opcional)</span></Label>
            <Input
              placeholder="Buscar por número da fatura..."
              value={invoiceSearch}
              onChange={(e) => setInvoiceSearch(e.target.value)}
            />
            <div className="max-h-40 overflow-y-auto rounded-md border bg-background divide-y divide-border">
              {/* Opção avulsa */}
              <button
                type="button"
                onClick={() => set('invoiceId', '')}
                className={cn(
                  'w-full text-left px-3 py-2 text-sm transition-colors hover:bg-accent',
                  !form.invoiceId && 'bg-primary/10 font-semibold'
                )}
              >
                <p className="font-medium">Despesa avulsa</p>
                <p className="text-xs text-muted-foreground">Sem vínculo com fatura</p>
              </button>

              {filteredInvoices.length === 0 && invoiceSearch && (
                <p className="p-3 text-sm text-muted-foreground">Nenhuma fatura encontrada.</p>
              )}

              {filteredInvoices.map((inv) => (
                <button
                  key={inv.id}
                  type="button"
                  onClick={() => set('invoiceId', inv.id)}
                  className={cn(
                    'w-full text-left px-3 py-2 text-sm transition-colors hover:bg-accent',
                    form.invoiceId === inv.id && 'bg-primary/10 font-semibold'
                  )}
                >
                  <p className="font-medium">{inv.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(inv.total)} · vence em {formatDate(inv.dueDate)}
                  </p>
                </button>
              ))}
            </div>

            {/* Fatura selecionada */}
            {selectedInvoice && (
              <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <Link2 className="h-3.5 w-3.5 text-primary" />
                  <span className="font-medium text-primary">{selectedInvoice.invoiceNumber}</span>
                  <span className="text-muted-foreground">— {formatCurrency(selectedInvoice.total)}</span>
                </div>
                <button type="button" onClick={() => set('invoiceId', '')} className="text-muted-foreground hover:text-destructive">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Criar despesa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Card de despesa ──────────────────────────────────────────────────────────

function ExpenseCard({ expense, invoiceNumber }: { expense: Expense; invoiceNumber?: string }) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm leading-snug">{expense.description}</p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {/* Categoria */}
              <span className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
                <Tag className="h-2.5 w-2.5" />
                {expense.category}
              </span>
              {/* Data */}
              <span className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
                <Calendar className="h-2.5 w-2.5" />
                {formatDate(expense.date)}
              </span>
            </div>

            {/* Vínculo com fatura */}
            {invoiceNumber ? (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                <Receipt className="h-3 w-3" />
                Fatura {invoiceNumber}
              </div>
            ) : (
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground">
                <Layers className="h-3 w-3" />
                Avulsa
              </div>
            )}
          </div>

          {/* Valor */}
          <div className="shrink-0 text-right">
            <p className="text-lg font-bold text-foreground">{formatCurrency(expense.amount)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function DespesasPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [query,    setQuery]    = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [e, i] = await Promise.all([
        expenseService.getAll().catch(() => []),
        invoiceService.getAll().catch(() => []),
      ]);
      setExpenses(e);
      setInvoices(i);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const invoiceNumberById = useMemo(
    () => new Map(invoices.map((i) => [i.id, i.invoiceNumber])),
    [invoices]
  );

  const summary = useMemo(() => {
    const linked     = expenses.filter((e) => e.invoiceId);
    const total      = expenses.reduce((s, e) => s + e.amount, 0);
    const linkedTotal = linked.reduce((s, e) => s + e.amount, 0);
    return {
      total,
      linkedCount:  linked.length,
      linkedTotal,
      looseTotal:   total - linkedTotal,
    };
  }, [expenses]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return expenses;
    return expenses.filter((e) =>
      [e.description, e.category, e.invoiceId ? (invoiceNumberById.get(e.invoiceId) ?? '') : '']
        .some((f) => f.toLowerCase().includes(q))
    );
  }, [expenses, invoiceNumberById, query]);

  // Agrupa por categoria para o resumo lateral
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of expenses) {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [expenses]);

  return (
    <>
      <ExpenseCreateModal open={createOpen} invoices={invoices} onClose={() => setCreateOpen(false)} onSaved={load} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Despesas</h1>
            <p className="text-sm text-muted-foreground">Controle de gastos e vínculos com faturas</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
              Atualizar
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Nova despesa
            </Button>
          </div>
        </div>

        {/* StatCards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total gasto"    value={formatCurrency(summary.total)}       icon={TrendingDown} color="red"   />
          <StatCard label="Vinculadas"     value={String(summary.linkedCount)}          icon={Link2}        color="blue"  />
          <StatCard label="Com fatura"     value={formatCurrency(summary.linkedTotal)}  icon={Receipt}      color="green" />
          <StatCard label="Avulsas"        value={formatCurrency(summary.looseTotal)}   icon={Layers}                     />
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por descrição, categoria ou número da fatura..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Lista de despesas */}
          <div className="lg:col-span-2 space-y-3">
            {loading && (
              <div className="flex h-40 items-center justify-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm text-muted-foreground">Carregando despesas...</span>
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
                <TrendingDown className="h-8 w-8 opacity-40" />
                <p className="text-sm">
                  {query ? 'Nenhuma despesa encontrada para essa busca.' : 'Nenhuma despesa cadastrada.'}
                </p>
              </div>
            )}

            {!loading && filtered.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground">
                  {filtered.length} de {expenses.length} despesa{expenses.length !== 1 ? 's' : ''}
                </p>
                {filtered.map((expense) => (
                  <ExpenseCard
                    key={expense.id}
                    expense={expense}
                    invoiceNumber={expense.invoiceId ? invoiceNumberById.get(expense.invoiceId) : undefined}
                  />
                ))}
              </>
            )}
          </div>

          {/* Painel lateral — top categorias */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-sm font-semibold mb-4">Top categorias</p>
                {byCategory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados.</p>
                ) : (
                  <div className="space-y-3">
                    {byCategory.map(([cat, total]) => {
                      const pct = summary.total > 0 ? Math.round((total / summary.total) * 100) : 0;
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium truncate">{cat}</span>
                            <span className="text-muted-foreground ml-2 shrink-0">{pct}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground text-right">{formatCurrency(total)}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resumo avulsas vs vinculadas */}
            <Card>
              <CardContent className="p-5 space-y-3">
                <p className="text-sm font-semibold">Distribuição</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Vinculadas a faturas</span>
                    <span className="font-semibold">{formatCurrency(summary.linkedTotal)}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500 transition-all"
                      style={{ width: summary.total > 0 ? `${(summary.linkedTotal / summary.total) * 100}%` : '0%' }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-2">
                    <span className="text-muted-foreground">Avulsas</span>
                    <span className="font-semibold">{formatCurrency(summary.looseTotal)}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-orange-400 transition-all"
                      style={{ width: summary.total > 0 ? `${(summary.looseTotal / summary.total) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
