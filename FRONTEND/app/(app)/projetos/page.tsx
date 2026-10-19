'use client';

import { useEffect, useMemo, useState } from 'react';
import { clientService, projectService } from '@/services/api';
import type { Client, Project, ProjectExpense } from '@/types';
import { ProjectStatus } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  FolderKanban, RefreshCw, Search, User, Calendar, AlertTriangle,
  CheckCircle, Clock, PlayCircle, FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt     = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = new Intl.DateTimeFormat('pt-BR');
const formatCurrency = (v: number) => fmt.format(v);
const formatDate     = (v: string) => { try { return fmtDate.format(new Date(v)); } catch { return v; } };
const safeError      = (e: unknown) => e instanceof Error ? e.message : 'Erro inesperado.';

const STATUS_LABEL: Record<string, string> = {
  [ProjectStatus.NaoIniciado]: 'Não iniciado',
  [ProjectStatus.EmAndamento]: 'Em andamento',
  [ProjectStatus.Concluido]:   'Concluído',
};

const statusStyle = (s: string) => ({
  NAO_INICIADO: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-800',
  EM_ANDAMENTO: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  CONCLUIDO:    'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
} as Record<string, string>)[s] ?? 'bg-muted text-muted-foreground border-border';

const formatCategory = (value: string) =>
  value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());

type StatusFilter = 'TODOS' | ProjectStatus;

type ProjectReport = Project & {
  statistics?: { totalExpenses?: number; taskProgress?: number; budget?: number };
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
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', iconClass)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-md bg-muted/50 px-2.5 py-2 text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={cn('text-xs font-semibold mt-0.5', accent)}>{value}</p>
    </div>
  );
}

// ─── Modal de resumo ──────────────────────────────────────────────────────────

function SummaryModal({
  project, clientName, onClose,
}: {
  project: Project | null;
  clientName: string;
  onClose: () => void;
}) {
  const [report, setReport]     = useState<ProjectReport | null>(null);
  const [expenses, setExpenses] = useState<ProjectExpense[]>([]);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (!project) { setReport(null); setExpenses([]); return; }
    setLoading(true);
    projectService.getReport(project.id)
      .then((data: ProjectReport) => {
        setReport(data);
        setExpenses(data.projectExpenses ?? []);
      })
      .catch((err: unknown) => toast({ title: 'Erro ao carregar relatório', description: safeError(err), variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [project]);

  const stats = report?.statistics ?? report ?? {};
  const budget    = stats.budget ?? project?.budget ?? 0;
  const totalExp  = stats.totalExpenses ?? expenses.reduce((s, e) => s + e.amount, 0);
  const progress  = stats.taskProgress ?? project?.taskProgress ?? project?.progress ?? 0;
  const balance   = budget - totalExp;
  const notes     = report?.projectNotes ?? [];
  const tasks     = report?.tasks ?? project?.tasks ?? [];
  const doneTasks = tasks.filter((t) => t.isCompleted).length;

  return (
    <Dialog open={!!project} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Resumo do projeto</DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex h-32 items-center justify-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Carregando estatísticas...</span>
          </div>
        )}

        {!loading && project && (
          <div className="space-y-4 py-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-lg font-bold leading-tight">{project.name}</p>
                <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <User className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{clientName}</span>
                </div>
              </div>
              <span className={cn('shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold', statusStyle(project.status))}>
                {STATUS_LABEL[project.status] ?? project.status}
              </span>
            </div>

            {project.description && (
              <p className="text-sm text-muted-foreground">{project.description}</p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <MiniStat label="Orçamento" value={formatCurrency(budget)} />
              <MiniStat label="Despesas" value={formatCurrency(totalExp)} accent="text-red-600 dark:text-red-400" />
              <MiniStat
                label="Saldo estimado"
                value={formatCurrency(balance)}
                accent={balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
              />
              <MiniStat label="Tarefas" value={`${progress}%`} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Início</p>
                <p className="font-semibold mt-0.5">{formatDate(project.startDate)}</p>
              </div>
              <div className="rounded-md bg-muted/50 px-3 py-2">
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />Prazo</p>
                <p className="font-semibold mt-0.5">{project.endDate ? formatDate(project.endDate) : '—'}</p>
              </div>
            </div>

            {tasks.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Tarefas ({doneTasks}/{tasks.length})</p>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
              </div>
            )}

            <div>
              <p className="text-sm font-semibold mb-2">Últimas despesas do projeto</p>
              {expenses.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Nenhuma despesa lançada para este projeto.</p>
              ) : (
                <div className="space-y-2">
                  {expenses.slice(0, 5).map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2.5 gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{expense.description}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatCategory(expense.category)} · {formatDate(expense.date)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold shrink-0 text-red-600 dark:text-red-400">
                        {formatCurrency(expense.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {notes.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-2">Anotações</p>
                <div className="space-y-2">
                  {notes.slice(0, 3).map((note) => (
                    <div key={note.id} className="rounded-md border px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{note.title}</p>
                        <span className="text-[10px] uppercase text-muted-foreground">{formatCategory(note.type)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{note.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Card de projeto ──────────────────────────────────────────────────────────

function ProjectCard({
  project, clientName, onSummary,
}: {
  project: Project; clientName: string; onSummary: () => void;
}) {
  const progress = project.taskProgress ?? project.progress ?? 0;
  const days     = project.daysRemaining;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-none">{project.name}</p>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">{clientName}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className={cn('rounded-full border px-2.5 py-0.5 text-xs font-semibold', statusStyle(project.status))}>
              {STATUS_LABEL[project.status] ?? project.status}
            </span>
            {project.isOverdue && (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
                <AlertTriangle className="h-3 w-3" /> Atrasado
              </span>
            )}
          </div>
        </div>

        {project.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
        )}

        <div>
          <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Progresso</span>
            <span className="font-semibold">{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <MiniStat label="Orçamento" value={formatCurrency(project.budget ?? 0)} />
          <MiniStat label="Despesas" value={formatCurrency(project.totalExpenses ?? 0)} accent="text-red-600 dark:text-red-400" />
          {typeof days === 'number' && (
            <MiniStat
              label="Dias restantes"
              value={String(days)}
              accent={days < 0 ? 'text-red-600 dark:text-red-400' : undefined}
            />
          )}
          {project.endDate && (
            <MiniStat label="Prazo" value={formatDate(project.endDate)} />
          )}
        </div>

        <Button variant="outline" size="sm" className="w-full" onClick={onSummary}>
          <FileText className="mr-1.5 h-3.5 w-3.5" />
          Resumo
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'TODOS', label: 'Todos' },
  { id: ProjectStatus.NaoIniciado, label: 'Não iniciado' },
  { id: ProjectStatus.EmAndamento, label: 'Em andamento' },
  { id: ProjectStatus.Concluido,   label: 'Concluído' },
];

export default function ProjetosPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients,  setClients]  = useState<Client[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [query,    setQuery]    = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('TODOS');
  const [selected, setSelected] = useState<Project | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, c] = await Promise.all([
        projectService.getAll().catch(() => []),
        clientService.getAll().catch(() => []),
      ]);
      setProjects(p);
      setClients(c);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const clientNameById = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);

  const summary = useMemo(() => ({
    total:     projects.length,
    running:   projects.filter((p) => p.status === ProjectStatus.EmAndamento).length,
    done:      projects.filter((p) => p.status === ProjectStatus.Concluido).length,
    overdue:   projects.filter((p) => p.isOverdue).length,
  }), [projects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (statusFilter !== 'TODOS' && p.status !== statusFilter) return false;
      if (!q) return true;
      const client = clientNameById.get(p.clientId) ?? p.client?.name ?? '';
      return [p.name, p.description ?? '', client].some((f) => f.toLowerCase().includes(q));
    });
  }, [clientNameById, projects, query, statusFilter]);

  return (
    <>
      <SummaryModal
        project={selected}
        clientName={selected ? (clientNameById.get(selected.clientId) ?? selected.client?.name ?? 'Cliente não encontrado') : ''}
        onClose={() => setSelected(null)}
      />

      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Projetos</h1>
            <p className="text-sm text-muted-foreground">Acompanhe o andamento e o relatório de cada projeto</p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            Atualizar
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Projetos"      value={String(summary.total)}   icon={FolderKanban} />
          <StatCard label="Em andamento"  value={String(summary.running)} icon={PlayCircle}   variant="info" />
          <StatCard label="Concluídos"    value={String(summary.done)}    icon={CheckCircle}  variant="success" />
          <StatCard label="Atrasados"     value={String(summary.overdue)} icon={Clock}        variant="danger" />
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                statusFilter === f.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-accent'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, cliente ou descrição..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {loading && (
          <div className="flex h-40 items-center justify-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Carregando projetos...</span>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
            <FolderKanban className="h-8 w-8 opacity-40" />
            <p className="text-sm">
              {query || statusFilter !== 'TODOS'
                ? 'Nenhum projeto encontrado para esse filtro.'
                : 'Nenhum projeto cadastrado.'}
            </p>
          </div>
        )}

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
                  clientName={clientNameById.get(project.clientId) ?? project.client?.name ?? 'Cliente não encontrado'}
                  onSummary={() => setSelected(project)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
