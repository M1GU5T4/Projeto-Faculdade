'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  clientService, expenseService, invoiceService, projectService, quoteService,
} from '@/services/api';
import type { Client, Expense, Invoice, Project, Quote } from '@/types';
import { InvoiceStatus, ProjectStatus, QuoteStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DollarSign, CheckCircle, Clock, TrendingDown, BarChart3,
  AlertTriangle, RefreshCw, ArrowRight, Receipt, Tag, Users,
  FileText, FolderKanban, CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt     = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = new Intl.DateTimeFormat('pt-BR');
const formatCurrency = (v: number) => fmt.format(v);
const formatDate     = (v: string) => { try { return fmtDate.format(new Date(v)); } catch { return v; } };

const isCurrentMonth = (d: string) => {
  const dt = new Date(d);
  const now = new Date();
  return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();
};

const statusStyle = (s: string): string => ({
  PAGO:       'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  PENDENTE:   'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  ATRASADO:   'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  CANCELADO:  'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800',
  RASCUNHO:   'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-900/30 dark:text-gray-400 dark:border-gray-800',
} as Record<string, string>)[s] ?? 'bg-muted text-muted-foreground border-border';

const statusLabel: Record<string, string> = {
  PAGO: 'Pago', PENDENTE: 'Pendente', ATRASADO: 'Atrasado',
  CANCELADO: 'Cancelado', RASCUNHO: 'Rascunho',
};

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, variant = 'default', sub }: {
  label: string; value: string; icon: React.ElementType;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  sub?: string;
}) {
  const iconClass = {
    default: 'bg-primary/10 text-primary',
    success: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    danger:  'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    info:    'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  }[variant];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
            <p className="mt-1 text-xl font-bold truncate">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', iconClass)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── NavLink ──────────────────────────────────────────────────────────────────

function NavCard({ href, label, icon: Icon, count }: {
  href: string; label: string; icon: React.ElementType; count: number;
}) {
  return (
    <Link href={href}>
      <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-accent group cursor-pointer">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{count}</span>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
      </div>
    </Link>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function FinanceiroPage() {
  const [clients,  setClients]  = useState<Client[]>([]);
  const [quotes,   setQuotes]   = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading,  setLoading]  = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [c, q, i, p, e] = await Promise.all([
        clientService.getAll().catch(() => []),
        quoteService.getAll().catch(() => []),
        invoiceService.getAll().catch(() => []),
        projectService.getAll().catch(() => []),
        expenseService.getAll().catch(() => []),
      ]);
      setClients(c); setQuotes(q); setInvoices(i); setProjects(p); setExpenses(e);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const metrics = useMemo(() => {
    const faturado      = invoices.reduce((s, i) => s + i.total, 0);
    const recebido      = invoices.reduce((s, i) => s + i.amountPaid, 0);
    const emAberto      = invoices.reduce((s, i) => s + Math.max(i.total - i.amountPaid, 0), 0);
    const despesasTotal = expenses.reduce((s, e) => s + e.amount, 0);
    const saldo         = recebido - despesasTotal;
    const atrasadas     = invoices.filter((i) => i.status === InvoiceStatus.Atrasado).length;
    const aprovados     = quotes.filter((q) => q.status === QuoteStatus.Aprovado).length;
    const projetosAtivos = projects.filter((p) => p.status === ProjectStatus.EmAndamento).length;
    const faturadoMes   = invoices.filter((i) => isCurrentMonth(i.issueDate)).reduce((s, i) => s + i.total, 0);
    const despesasMes   = expenses.filter((e) => isCurrentMonth(e.date)).reduce((s, e) => s + e.amount, 0);
    const lucroMes      = faturadoMes - despesasMes;

    return {
      faturado, recebido, emAberto, despesasTotal, saldo,
      atrasadas, aprovados, projetosAtivos,
      faturadoMes, despesasMes, lucroMes,
    };
  }, [expenses, invoices, projects, quotes]);

  const clientNameById = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);
  const invoiceNumberById = useMemo(() => new Map(invoices.map((i) => [i.id, i.invoiceNumber])), [invoices]);

  const pendingInvoices = useMemo(() =>
    [...invoices]
      .filter((i) => i.status !== InvoiceStatus.Pago && i.status !== InvoiceStatus.Cancelado)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 5),
  [invoices]);

  const recentExpenses = useMemo(() =>
    [...expenses]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5),
  [expenses]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Carregando financeiro...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Visão consolidada das suas finanças</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
          Atualizar
        </Button>
      </div>

      {/* StatCards principais — 6 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total Faturado"  value={formatCurrency(metrics.faturado)}      icon={DollarSign}   variant="default" />
        <StatCard label="Total Recebido"  value={formatCurrency(metrics.recebido)}      icon={CheckCircle}  variant="success" />
        <StatCard label="Em Aberto"       value={formatCurrency(metrics.emAberto)}      icon={Clock}        variant="warning" />
        <StatCard label="Total Despesas"  value={formatCurrency(metrics.despesasTotal)} icon={TrendingDown} variant="danger"  />
        <StatCard
          label="Saldo"
          value={formatCurrency(metrics.saldo)}
          icon={BarChart3}
          variant={metrics.saldo >= 0 ? 'success' : 'danger'}
          sub="Recebido − Despesas"
        />
        <StatCard label="Faturas Atrasadas" value={String(metrics.atrasadas)} icon={AlertTriangle} variant="danger" />
      </div>

      {/* Resumo do mês + Navegação rápida */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Resumo do mês */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resumo do mês atual</CardTitle>
            <CardDescription>Receitas e despesas do mês corrente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 p-4 text-center">
                <p className="text-xs text-green-700 dark:text-green-400 font-medium">Receita</p>
                <p className="mt-1 text-lg font-bold text-green-800 dark:text-green-300">{formatCurrency(metrics.faturadoMes)}</p>
              </div>
              <div className="rounded-lg border bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 p-4 text-center">
                <p className="text-xs text-red-700 dark:text-red-400 font-medium">Despesas</p>
                <p className="mt-1 text-lg font-bold text-red-800 dark:text-red-300">{formatCurrency(metrics.despesasMes)}</p>
              </div>
              <div className={cn(
                'rounded-lg border p-4 text-center',
                metrics.lucroMes >= 0
                  ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                  : 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800'
              )}>
                <p className={cn('text-xs font-medium', metrics.lucroMes >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400')}>
                  Resultado
                </p>
                <p className={cn('mt-1 text-lg font-bold', metrics.lucroMes >= 0 ? 'text-blue-800 dark:text-blue-300' : 'text-orange-800 dark:text-orange-300')}>
                  {formatCurrency(metrics.lucroMes)}
                </p>
              </div>
            </div>

            {/* Barra de progresso receita vs despesas do mês */}
            {(metrics.faturadoMes > 0 || metrics.despesasMes > 0) && (() => {
              const total = Math.max(metrics.faturadoMes, metrics.despesasMes);
              return (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="w-20 text-xs text-muted-foreground">Receita</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-green-500" style={{ width: `${(metrics.faturadoMes / total) * 100}%` }} />
                    </div>
                    <span className="w-24 text-right text-xs font-semibold">{formatCurrency(metrics.faturadoMes)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-20 text-xs text-muted-foreground">Despesas</span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-red-500" style={{ width: `${(metrics.despesasMes / total) * 100}%` }} />
                    </div>
                    <span className="w-24 text-right text-xs font-semibold">{formatCurrency(metrics.despesasMes)}</span>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Indicadores + Navegação rápida */}
        <div className="space-y-4">
          {/* Indicadores */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Indicadores</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {[
                { label: 'Clientes',    value: clients.length,          color: 'text-foreground' },
                { label: 'Aprovados',   value: metrics.aprovados,       color: 'text-green-600'  },
                { label: 'Projetos',    value: metrics.projetosAtivos,  color: 'text-blue-600'   },
                { label: 'Atrasadas',   value: metrics.atrasadas,       color: 'text-red-600'    },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-md border bg-muted/40 px-3 py-2 text-center">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={cn('text-lg font-bold', color)}>{value}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Navegação rápida */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Navegar para</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <NavCard href="/clientes"   label="Clientes"    icon={Users}        count={clients.length}  />
              <NavCard href="/orcamentos" label="Orçamentos"  icon={FileText}     count={quotes.length}   />
              <NavCard href="/faturas"    label="Faturas"     icon={Receipt}      count={invoices.length} />
              <NavCard href="/despesas"   label="Despesas"    icon={TrendingDown} count={expenses.length} />
              <NavCard href="/projetos"   label="Projetos"    icon={FolderKanban} count={projects.length} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Contas a receber + Despesas recentes */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Contas a receber */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contas a receber</CardTitle>
            <CardDescription>Faturas pendentes mais próximas do vencimento</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingInvoices.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma fatura pendente.</p>
            ) : (
              <div className="space-y-3">
                {pendingInvoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-none">{inv.invoiceNumber}</p>
                      <p className="mt-1 text-xs text-muted-foreground truncate">
                        {clientNameById.get(inv.clientId) ?? 'Cliente não encontrado'}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="h-3 w-3" />
                        Vence {formatDate(inv.dueDate)}
                      </div>
                    </div>
                    <div className="shrink-0 text-right space-y-1">
                      <span className={cn('inline-block rounded-full border px-2 py-0.5 text-xs font-semibold', statusStyle(inv.status))}>
                        {statusLabel[inv.status] ?? inv.status}
                      </span>
                      <p className="text-sm font-bold">{formatCurrency(Math.max(inv.total - inv.amountPaid, 0))}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4">
              <Link href="/faturas">
                <Button variant="outline" size="sm" className="w-full">
                  Ver todas as faturas <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Despesas recentes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Despesas recentes</CardTitle>
            <CardDescription>Últimas despesas registradas</CardDescription>
          </CardHeader>
          <CardContent>
            {recentExpenses.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma despesa cadastrada.</p>
            ) : (
              <div className="space-y-3">
                {recentExpenses.map((exp) => {
                  const invoiceNumber = exp.invoiceId ? invoiceNumberById.get(exp.invoiceId) : null;
                  return (
                    <div key={exp.id} className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold leading-none truncate">{exp.description}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Tag className="h-2.5 w-2.5" />{exp.category}
                          </span>
                          <span className="text-xs text-muted-foreground">{formatDate(exp.date)}</span>
                        </div>
                        {invoiceNumber && (
                          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">Fatura {invoiceNumber}</p>
                        )}
                      </div>
                      <p className="shrink-0 text-sm font-bold text-red-600 dark:text-red-400">
                        − {formatCurrency(exp.amount)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-4">
              <Link href="/despesas">
                <Button variant="outline" size="sm" className="w-full">
                  Ver todas as despesas <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
