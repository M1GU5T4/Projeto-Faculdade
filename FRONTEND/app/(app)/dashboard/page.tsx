'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  clientService, expenseService, invoiceService, projectService, quoteService,
} from '@/services/api';
import type { Client, Expense, Invoice, Project, Quote } from '@/types';
import { InvoiceStatus, ProjectStatus, QuoteStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DollarSign, TrendingDown, TrendingUp, Clock, FileText,
  FolderKanban, AlertCircle, RefreshCw, CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatCurrency = (v: number) => fmt.format(v);

const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' });
const getMonthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`;
const parseSafeDate = (v: string) => { const d = new Date(v); return isNaN(d.getTime()) ? null : d; };

type DataKey = 'clients' | 'quotes' | 'invoices' | 'projects' | 'expenses';
type MonthlyPoint = { key: string; label: string; revenue: number; expenses: number };

const STATUS_LABELS: Record<string, string> = {
  [ProjectStatus.NaoIniciado]: 'Não iniciado',
  [ProjectStatus.EmAndamento]: 'Em andamento',
  [ProjectStatus.Concluido]:   'Concluído',
};

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon: Icon, variant = 'default',
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  variant?: 'default' | 'success' | 'danger' | 'warning';
}) {
  const iconColor = {
    default: 'text-primary bg-primary/10',
    success: 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
    danger:  'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
    warning: 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30',
  }[variant];

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
            <p className="mt-1 text-xl font-bold text-foreground truncate">{value}</p>
          </div>
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', iconColor)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── BarChart ─────────────────────────────────────────────────────────────────

function BarChart({ data }: { data: MonthlyPoint[] }) {
  const max = Math.max(...data.flatMap((d) => [d.revenue, d.expenses]), 1);

  if (data.every((d) => d.revenue === 0 && d.expenses === 0)) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Sem dados financeiros para exibir.</p>;
  }

  return (
    <div className="space-y-3 mt-2">
      {data.map((item) => (
        <div key={item.key} className="flex items-center gap-3">
          <span className="w-14 shrink-0 text-xs font-semibold text-muted-foreground capitalize">
            {item.label}
          </span>
          <div className="flex-1 space-y-1">
            {/* Receita */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(item.revenue / max) * 100}%` }}
                />
              </div>
              <span className="w-24 text-right text-[10px] font-semibold text-foreground">
                {formatCurrency(item.revenue)}
              </span>
            </div>
            {/* Despesas */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-red-500 transition-all"
                  style={{ width: `${(item.expenses / max) * 100}%` }}
                />
              </div>
              <span className="w-24 text-right text-[10px] font-semibold text-muted-foreground">
                {formatCurrency(item.expenses)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── StatusBar ────────────────────────────────────────────────────────────────

function StatusBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs text-muted-foreground">{count} • {pct}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Pill ─────────────────────────────────────────────────────────────────────

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg border bg-muted/50 px-4 py-3 text-center">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="mt-0.5 text-sm font-bold">{value}</span>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [clients,  setClients]  = useState<Client[]>([]);
  const [quotes,   setQuotes]   = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [failed,   setFailed]   = useState<DataKey[]>([]);
  const [loading,  setLoading]  = useState(true);

  const load = async () => {
    setLoading(true);
    const results = await Promise.allSettled([
      clientService.getAll(),
      quoteService.getAll(),
      invoiceService.getAll(),
      projectService.getAll(),
      expenseService.getAll(),
    ]);
    const keys: DataKey[] = ['clients', 'quotes', 'invoices', 'projects', 'expenses'];
    setFailed(keys.filter((_, i) => results[i].status === 'rejected'));

    if (results[0].status === 'fulfilled') setClients(results[0].value);
    if (results[1].status === 'fulfilled') setQuotes(results[1].value);
    if (results[2].status === 'fulfilled') setInvoices(results[2].value);
    if (results[3].status === 'fulfilled') setProjects(results[3].value);
    if (results[4].status === 'fulfilled') setExpenses(results[4].value);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const metrics = useMemo(() => {
    const paid     = invoices.filter((i) => i.status === InvoiceStatus.Pago);
    const open     = invoices.filter((i) => i.status === InvoiceStatus.Pendente || i.status === InvoiceStatus.Atrasado);
    const received = invoices.reduce((s, i) => s + i.amountPaid, 0);
    return {
      totalRevenue:      paid.reduce((s, i) => s + i.total, 0),
      totalExpenses:     expenses.reduce((s, e) => s + e.amount, 0),
      netProfit:         paid.reduce((s, i) => s + i.total, 0) - expenses.reduce((s, e) => s + e.amount, 0),
      outstandingRevenue: open.reduce((s, i) => s + Math.max(i.total - i.amountPaid, 0), 0),
      openInvoices:      open.length,
      activeProjects:    projects.filter((p) => p.status === ProjectStatus.EmAndamento).length,
      approvedQuotes:    quotes.filter((q) => q.status === QuoteStatus.Aprovado).length,
      lateInvoices:      invoices.filter((i) => i.status === InvoiceStatus.Atrasado).length,
      clients:           clients.length,
      received,
    };
  }, [clients.length, expenses, invoices, projects, quotes]);

  const monthlyData = useMemo<MonthlyPoint[]>(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = getMonthKey(d);
      return [key, { key, label: monthFormatter.format(d).replace('.', ''), revenue: 0, expenses: 0 }] as const;
    });
    const byMonth = new Map<string, MonthlyPoint>(months);

    invoices.forEach((inv) => {
      if (inv.status !== InvoiceStatus.Pago) return;
      const d = parseSafeDate(inv.issueDate);
      if (!d) return;
      const pt = byMonth.get(getMonthKey(d));
      if (pt) pt.revenue += inv.total;
    });
    expenses.forEach((exp) => {
      const d = parseSafeDate(exp.date);
      if (!d) return;
      const pt = byMonth.get(getMonthKey(d));
      if (pt) pt.expenses += exp.amount;
    });
    return Array.from(byMonth.values());
  }, [expenses, invoices]);

  const projectStatusData = useMemo(() =>
    Object.values(ProjectStatus).map((s) => ({
      status: s,
      label: STATUS_LABELS[s] ?? s,
      count: projects.filter((p) => p.status === s).length,
    })),
  [projects]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Carregando painel...</span>
      </div>
    );
  }

  // ── Erro total ──
  if (failed.length === 5) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <div>
          <p className="font-semibold">Não foi possível carregar o painel.</p>
          <p className="text-sm text-muted-foreground">Verifique a conexão com a API e tente novamente.</p>
        </div>
        <Button variant="outline" onClick={load}>
          <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Painel</h1>
          <p className="text-sm text-muted-foreground">Visão geral do seu negócio</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
          Atualizar
        </Button>
      </div>

      {/* Aviso de falha parcial */}
      {failed.length > 0 && failed.length < 5 && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Alguns dados não foram carregados ({failed.length} de 5). Clique em Atualizar para tentar novamente.
        </div>
      )}

      {/* StatCards — 6 cards em grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Faturamento Total"     value={formatCurrency(metrics.totalRevenue)}      icon={DollarSign}   variant="success" />
        <StatCard label="Despesas Totais"        value={formatCurrency(metrics.totalExpenses)}     icon={TrendingDown} variant="danger"  />
        <StatCard label="Lucro Líquido"          value={formatCurrency(metrics.netProfit)}         icon={TrendingUp}   variant={metrics.netProfit >= 0 ? 'success' : 'danger'} />
        <StatCard label="Pendente Receber"       value={formatCurrency(metrics.outstandingRevenue)} icon={Clock}       variant="warning" />
        <StatCard label="Faturas Abertas"        value={String(metrics.openInvoices)}              icon={FileText}     variant="warning" />
        <StatCard label="Projetos em Andamento"  value={String(metrics.activeProjects)}            icon={FolderKanban} />
      </div>

      {/* Gráfico + Status dos projetos */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Receita vs Despesas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Receita vs. Despesas</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex gap-4">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                <span className="text-xs font-semibold text-muted-foreground">Faturamento</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                <span className="text-xs font-semibold text-muted-foreground">Despesas</span>
              </div>
            </div>
            <BarChart data={monthlyData} />
          </CardContent>
        </Card>

        {/* Status dos projetos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status dos Projetos</CardTitle>
            <CardDescription>Distribuição dos projetos cadastrados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {projectStatusData.map((item) => (
              <StatusBar key={item.status} label={item.label} count={item.count} total={projects.length} />
            ))}
            {projects.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">Nenhum projeto cadastrado.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Indicadores complementares */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Indicadores complementares</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Pill label="Clientes"             value={String(metrics.clients)} />
            <Pill label="Recebido"             value={formatCurrency(metrics.received)} />
            <Pill label="Orçamentos Aprovados" value={String(metrics.approvedQuotes)} />
            <Pill label="Faturas Atrasadas"    value={String(metrics.lateInvoices)} />
          </div>
        </CardContent>
      </Card>

      {/* Resumo financeiro rápido */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-xs text-green-700 dark:text-green-400 font-medium">Total Recebido</p>
                <p className="text-lg font-bold text-green-800 dark:text-green-300">{formatCurrency(metrics.received)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              <div>
                <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium">A Receber</p>
                <p className="text-lg font-bold text-yellow-800 dark:text-yellow-300">{formatCurrency(metrics.outstandingRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <div>
                <p className="text-xs text-red-700 dark:text-red-400 font-medium">Faturas Atrasadas</p>
                <p className="text-lg font-bold text-red-800 dark:text-red-300">{metrics.lateInvoices}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
