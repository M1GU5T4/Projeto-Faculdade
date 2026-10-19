'use client';

import { useEffect, useMemo, useState } from 'react';
import { clientService, invoiceService, projectService, quoteService } from '@/services/api';
import type { Client, Invoice, Project, Quote } from '@/types';
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
  Users, FileText, Receipt, FolderKanban,
  RefreshCw, Plus, Search, Mail, Phone, MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const safeErrorMessage = (e: unknown) => e instanceof Error ? e.message : 'Erro inesperado.';

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Modal de criação ─────────────────────────────────────────────────────────

function ClientCreateModal({
  open, onClose, onSaved,
}: { open: boolean; onClose: () => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<typeof form>>({});

  // Reset ao abrir
  useEffect(() => {
    if (open) { setForm({ name: '', email: '', phone: '', address: '' }); setErrors({}); setSaving(false); }
  }, [open]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e: Partial<typeof form> = {};
    if (!form.name.trim())    e.name    = 'Nome é obrigatório.';
    if (!form.email.trim())   e.email   = 'E-mail é obrigatório.';
    if (!form.phone.trim())   e.phone   = 'Telefone é obrigatório.';
    if (!form.address.trim()) e.address = 'Endereço é obrigatório.';
    return e;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      await clientService.create({
        name: form.name.trim(), email: form.email.trim(),
        phone: form.phone.trim(), address: form.address.trim(),
      });
      await onSaved();
      onClose();
      toast({ title: 'Cliente criado com sucesso!', variant: 'success' });
    } catch (err) {
      toast({ title: 'Erro ao criar cliente', description: safeErrorMessage(err), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 py-2">
          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="c-name">Nome</Label>
            <Input id="c-name" placeholder="Nome do cliente" value={form.name} onChange={set('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>
          {/* E-mail */}
          <div className="space-y-1.5">
            <Label htmlFor="c-email">E-mail</Label>
            <Input id="c-email" type="email" placeholder="cliente@empresa.com" value={form.email} onChange={set('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          {/* Telefone */}
          <div className="space-y-1.5">
            <Label htmlFor="c-phone">Telefone</Label>
            <Input id="c-phone" type="tel" placeholder="(00) 00000-0000" value={form.phone} onChange={set('phone')} />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
          </div>
          {/* Endereço */}
          <div className="space-y-1.5">
            <Label htmlFor="c-address">Endereço</Label>
            <Textarea id="c-address" placeholder="Rua, número, bairro, cidade" rows={2} value={form.address} onChange={set('address')} />
            {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Salvando...' : 'Criar cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Card de cliente ──────────────────────────────────────────────────────────

function ClientCard({ client, info }: {
  client: Client;
  info: { quotes: number; invoices: number; projects: number };
}) {
  const initials = client.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
            {initials}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-semibold text-sm leading-none">{client.name}</p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="h-3 w-3 shrink-0" />
              <span className="truncate">{client.email}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Phone className="h-3 w-3 shrink-0" />
              <span>{client.phone}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{client.address}</span>
            </div>
          </div>
        </div>

        {/* Badges de vinculação */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border',
            'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300'
          )}>
            <FileText className="h-3 w-3" /> {info.quotes} Orçamento{info.quotes !== 1 ? 's' : ''}
          </span>
          <span className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border',
            'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-300'
          )}>
            <Receipt className="h-3 w-3" /> {info.invoices} Fatura{info.invoices !== 1 ? 's' : ''}
          </span>
          <span className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border',
            'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300'
          )}>
            <FolderKanban className="h-3 w-3" /> {info.projects} Projeto{info.projects !== 1 ? 's' : ''}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function ClientesPage() {
  const [clients,  setClients]  = useState<Client[]>([]);
  const [quotes,   setQuotes]   = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [query,    setQuery]    = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [c, q, i, p] = await Promise.all([
        clientService.getAll().catch(() => []),
        quoteService.getAll().catch(() => []),
        invoiceService.getAll().catch(() => []),
        projectService.getAll().catch(() => []),
      ]);
      setClients(c); setQuotes(q); setInvoices(i); setProjects(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  // Mapa clientId → contadores
  const metricsMap = useMemo(() => {
    const map = new Map<string, { quotes: number; invoices: number; projects: number }>();
    for (const c of clients) map.set(c.id, { quotes: 0, invoices: 0, projects: 0 });
    for (const q of quotes)   { const m = map.get(q.clientId);   if (m) m.quotes++;   }
    for (const i of invoices) { const m = map.get(i.clientId);   if (m) m.invoices++; }
    for (const p of projects) { const m = map.get(p.clientId);   if (m) m.projects++; }
    return map;
  }, [clients, invoices, projects, quotes]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.name, c.email, c.phone, c.address].some((f) => f.toLowerCase().includes(q))
    );
  }, [clients, query]);

  return (
    <>
      <ClientCreateModal open={createOpen} onClose={() => setCreateOpen(false)} onSaved={load} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Clientes</h1>
            <p className="text-sm text-muted-foreground">Gerencie sua base de clientes</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
              Atualizar
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo cliente
            </Button>
          </div>
        </div>

        {/* StatCards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Clientes"   value={String(clients.length)}  icon={Users}        />
          <StatCard label="Orçamentos" value={String(quotes.length)}   icon={FileText}     />
          <StatCard label="Faturas"    value={String(invoices.length)} icon={Receipt}      />
          <StatCard label="Projetos"   value={String(projects.length)} icon={FolderKanban} />
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, e-mail, telefone ou endereço..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex h-40 items-center justify-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">Carregando clientes...</span>
          </div>
        )}

        {/* Lista */}
        {!loading && filtered.length === 0 && (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
            <Users className="h-8 w-8 opacity-40" />
            <p className="text-sm">
              {query ? 'Nenhum cliente encontrado para essa busca.' : 'Nenhum cliente cadastrado.'}
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground">
              {filtered.length} de {clients.length} cliente{clients.length !== 1 ? 's' : ''}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  info={metricsMap.get(client.id) ?? { quotes: 0, invoices: 0, projects: 0 }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
