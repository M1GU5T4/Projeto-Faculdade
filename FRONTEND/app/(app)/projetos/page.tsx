'use client';

import { useEffect, useMemo, useState } from 'react';
import { clientService, projectService } from '@/services/api';
import type { Client, Project, ProjectExpense } from '@/types';
import { ProjectStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  FolderKanban, CheckSquare, Clock, AlertTriangle,
  RefreshCw, Search, X, User, Calendar, Tag,
  TrendingDown, BarChart3, Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt     = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = new Intl.DateTimeFormat('pt-BR');
const formatCurrency = (v: number) => fmt.format(v);
const formatDate     = (v: string) => { try { return fmtDate.format(new Date(v)); } catch { return v; } };
const safeError      = (e: unknown) => e instanceof Error ? e.message : 'Erro inesperado.';

const formatStatus = (s: string) =>
  s.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  [ProjectStatus.EmAndamento]: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  [ProjectStatus.Concluido]:   'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  [ProjectStatus.NaoIniciado]: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
};

// ─── Tipo do relatório ────────────────────────────────────────────────────────

type ProjectReport = Project & {
  statistics?: { totalExpenses?: number; taskProgress?: number; budget?: number };
  projectExpenses?: ProjectExpense[];
};

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, variant = 'default' }: {
  label: string; value: string; icon: React.ElementType;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
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
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-lg font-bold">{value}</p>
          </div>
          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', iconClass)}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Barra de progresso ───────────────────────────────────────────────────────

function ProgressBar({ value, color = 'bg-primary' }: { value: number; color?: string }) {
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all', color)}
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}

// ─── Modal de resumo do projeto ───────────────────────────────────────────────

function ProjectSummaryModal({ project, clientName, onClose }: {
  project: Project | null; clientName: string; onClose: () => void;
}) {
  const [report,   setReport]   = useState<ProjectReport | null>(null);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (!project) { setReport(null); return; }
    setLoading(true);
    projectService.getReport(project.id)
      .then((r) => setReport(r))
      .catch((e) => toast({ title: 'Erro ao carregar relatório', description: safeError(e), variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [project]);

  const stats        = report?.statistics ?? report ?? {};
  const budget       = (stats as { budget?: number }).budget       ?? project?.budget       ?? 0;
  const totalExp     = (stats as { totalExpenses?: number }).totalExpenses ?? 0;
  const taskProgress = (stats as { taskProgress?: number }).taskProgress  ?? project?.progress ?? 0;
  const balance      = budget - totalExp;
  const expenses     = report?.projectExpenses ?? [];

  const budgetUsedPct = budget > 0 ? Math.min((totalExp / budget) * 100, 100) : 0;

  return (
    <Dialog open={!!project} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Resumo do projeto</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex h-32 items-center justify-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Carregando relatório...</span>
          </div>
        )}

        {!loading && project && (
          <div className="space-y-5 py-2">
            {/* Cabeçalho */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-base leading-tight">{project.name}</p>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                  <User className="h-3.5 w-3.5" />
                  {clientName}
                </div>
              </div>
              <span className={cn('shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold', STATUS_STYLE[project.status] ?? '')}>
                {formatStatus(project.status)}
              </span>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Início</p>
                <p className="text-sm font-semibold mt-0.5">{formatDate(project.startDate)}</p>
              </div>
              <div className="rounded-md bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Prazo</p>
                <p className="text-sm font-semibold mt-0.5">{project.endDate ? formatDate(project.endDate) : '—'}</p>
              </div>
            </div>

            {/* StatCards financeiros */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Orçamento</p>
                <p className="text-base font-bold mt-0.5">{formatCurrency(budget)}</p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Despesas</p>
                <p className="text-base font-bold mt-0.5 text-red-600 dark:text-red-400">{formatCurrency(totalExp)}</p>
              </div>
              <div className={cn(
                'rounded-lg border p-3 text-center col-span-1',
                balance >= 0 ? 'border-green-200 bg-green-50 dark:bg-green-950/30' : 'border-red-200 bg-red-50 dark:bg-red-950/30'
              )}>
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p className={cn('text-base font-bold mt-0.5', balance >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400')}>
                  {formatCurrency(balance)}
                </p>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Tarefas</p>
                <p className="text-base font-bold mt-0.5">{taskProgress}%</p>
              </div>
            </div>

            {/* Uso do orçamento */}
            {budget > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Uso do orçamento</span>
                  <span className="font-semibold">{Math.round(budgetUsedPct)}%</span>
                </div>
                <ProgressBar
                  value={budgetUsedPct}
                  color={budgetUsedPct > 90 ? 'bg-red-500' : budgetUsedPct > 70 ? 'bg-yellow-500' : 'bg-primary'}
                />
              </div>
            )}

            {/* Progresso de tarefas */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Progresso das tarefas</span>
                <span className="font-semibold">{taskProgress}%</span>
              </div>
              <ProgressBar value={taskProgress} color="bg-blue-500" />
            </div>

            {/* Descrição */}
            {project.description && (
              <div className="rounded-md border-l-2 border-primary/40 bg-muted/30 px-3 py-2">
                <p className="text-xs text-muted-foreground mb-1">Descrição</p>
                <p className="text-sm">{project.description}</p>
              </div>
            )}

            {/* Últimas despesas */}
            <div>
              <p className="text-sm font-semibold mb-3">
                Últimas despesas
                {expenses.length > 0 && <span className="ml-2 text-xs text-muted-foreground font-normal">({expenses.length} no total)</span>}
              </p>
              {expenses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Nenhuma despesa lançada para este projeto.</p>
              ) : (
                <div className="space-y-2">
                  {expenses.slice(0, 5).map((exp) => (
                    <div key={exp.id} className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2.5 gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{exp.description}</p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <Tag className="h-2.5 w-2.5" />
                          {formatStatus(exp.category)} · {formatDate(exp.date)}
                        </div>
                      </div>
                      <span className="shrink-0 text-sm font-bold text-red-600 dark:text-red-400">
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

// ─── Card de projeto ──────────────────────────────────────────────────────────

function ProjectCard({ project, clientName, onSummary }: {
  project: Project; clientName: string; onSummary: () => void;
}) {
  const progress = project.taskProgress ?? project.progress ?? 0;
  const isOverdue = project.isOverdue;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-bold text-sm leading-tight truncate">{project.name}</p>
              {isOverdue && (
                <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
                  <AlertTriangle className="h-2.5 w-2.5" /> Atrasado
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">{clientName}</span>
            </div>
          </div>
          <span className={cn('shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold', STATUS_STYLE[project.status] ?? '')}>
            {formatStatus(project.status)}
          </span>
        </div>

        {/* Descrição */}
        {project.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
        )}

        {/* Progresso */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <ProgressBar
            value={progress}
            color={project.status === ProjectStatus.Concluido ? 'bg-green-500' : 'bg-primary'}
          />
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md bg-muted/50 px-2.5 py-2">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Wallet className="h-2.5 w-2.5" />Orçamento
            </p>
            <p className="text-xs font-bold mt-0.5">{formatCurrency(project.budget ?? 0)}</p>
          </div>
          <div className="rounded-md bg-muted/50 px-2.5 py-2">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <TrendingDown className="h-2.5 w-2.5" />Despesas
            </p>
            <p className="text-xs font-bold mt-0.5 text-red-600 dark:text-red-400">{formatCurrency(project.totalExpenses ?? 0)}</p>
          </div>
          <div className="rounded-md bg-muted/50 px-2.5 py-2">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="h-2.5 w-2.5" />Início
            </p>
            <p className="text-xs font-bold mt-0.5">{formatDate(project.startDate)}</p>
          </div>
          <div className="rounded-md bg-muted/50 px-2.5 py-2">
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />Dias rest.
            </p>
            <p className={cn('text-xs font-bold mt-0.5', (project.daysRemaining ?? 0) < 0 ? 'text-red-600 dark:text-red-400' : '')}>
              {typeof project.daysRemaining === 'number' ? `${project.daysRemaining}d` : '—'}
            </p>
          </div>
        </div>

        {/* Ação */}
        <Button variant="outline" size="sm" className="w-full" onClick={onSummary}>
          <BarChart3 className="mr-2 h-3.5 w-3.5" />
          Ver resumo
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ProjetosPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients,  setClients]  = useState<Client[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [query,    setQuery]    = useState('');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        projectService.getAll().catch(() => []),
        clientService.getAll().catch(() => []),
      ]);
      setProjects(p); setClients(c);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const clientNameById = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);

  const summary = useMemo(() => ({
    total:      projects.length,
    active:     projects.filter((p) => p.status === ProjectStatus.EmAndamento).length,
    completed:  projects.filter((p) => p.status === ProjectStatus.Concluido).length,
    notStarted: projects.filter((p) => p.status === ProjectStatus.NaoIniciado).length,
    overdue:    projects.filter((p) => p.isOverdue).length,
  }), [projects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      [p.name, p.description ?? '', clientNameById.get(p.clientId) ?? ''].some((f) => f.toLowerCase().includes(q))
    );
  }, [clientNameById, projects, query]);

  return (
    <>
      <ProjectSummaryModal
        project={selectedProject}
        clientName={selectedProject ? (clientNameById.get(selectedProject.clientId) ?? 'Cliente não encontrado') : ''}
        onClose={() => setSelectedProject(null)}
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Projetos</h1>
            <p className="text-sm text-muted-foreground">Projetos gerados a partir de orçamentos aprovados</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            Atualizar
          </Button>
        </div>

        {/* StatCards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total"         value={String(summary.total)}      icon={FolderKanban}  />
          <StatCard label="Em andamento"  value={String(summary.active)}     icon={Clock}        variant="info"    />
          <StatCard label="Concluídos"    value={String(summary.completed)}  icon={CheckSquare}  variant="success" />
          <StatCard label="Atrasados"     value={String(summary.overdue)}    icon={AlertTriangle} variant="danger"  />
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, cliente ou descrição..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Distribuição por status */}
        {projects.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Distribuição por status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { label: 'Em andamento',  count: summary.active,     color: 'bg-blue-500',   status: ProjectStatus.EmAndamento },
                  { label: 'Concluídos',    count: summary.completed,  color: 'bg-green-500',  status: ProjectStatus.Concluido   },
                  { label: 'Não iniciados', count: summary.notStarted, color: 'bg-yellow-500', status: ProjectStatus.NaoIniciado },
                ].map(({ label, count, color }) => {
                  const pct = projects.length > 0 ? Math.round((count / projects.length) * 100) : 0;
                  return (
                    <div key={label} className="flex items-center gap-3">
                      <span className="w-28 text-xs text-muted-foreground shrink-0">{label}</span>
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-12 text-right text-xs font-semibold shrink-0">{count} · {pct}%</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex h-40 items-center justify-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Carregando projetos...</span>
          </div>
        )}

        {/* Vazio */}
        {!loading && filtered.length === 0 && (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
            <FolderKanban className="h-8 w-8 opacity-40" />
            <p className="text-sm">
              {query ? 'Nenhum projeto encontrado para essa busca.' : 'Nenhum projeto cadastrado. Converta um orçamento aprovado para criar um projeto.'}
            </p>
          </div>
        )}

        {/* Grid */}
        {!loading && filtered.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground">
              {filtered.length} de {projects.length} projeto{projects.length !== 1 ? 's' : ''}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  clientName={clientNameById.get(project.clientId) ?? 'Cliente não encontrado'}
                  onSummary={() => setSelectedProject(project)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
