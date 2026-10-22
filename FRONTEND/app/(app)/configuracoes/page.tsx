'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL, authService, settingsService } from '@/services/api';
import type { User } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import {
  Sun, Moon, Monitor, Bell, BellOff, FileText,
  LogOut, RefreshCw, Save, User as UserIcon,
  Shield, Server, Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ThemeMode = 'light' | 'dark' | 'auto';

type NotificationSettings = {
  newQuotes:       boolean;
  overdueInvoices: boolean;
  weeklyReports:   boolean;
};

type Settings = {
  theme?:         ThemeMode;
  notifications?: Partial<NotificationSettings> | string;
};

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  newQuotes:       true,
  overdueInvoices: true,
  weeklyReports:   false,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseNotifications = (v: Settings['notifications']): NotificationSettings => {
  if (!v) return DEFAULT_NOTIFICATIONS;
  if (typeof v === 'string') {
    try { return { ...DEFAULT_NOTIFICATIONS, ...JSON.parse(v) }; }
    catch { return DEFAULT_NOTIFICATIONS; }
  }
  return { ...DEFAULT_NOTIFICATIONS, ...v };
};

const initialsFrom = (name?: string, email?: string) => {
  const src = name || email || 'U';
  return src.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || 'U';
};

const formatRole = (role?: string) =>
  role ? role.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : 'Usuário';

// ─────────────────────────────────────────────────────────────────────────────
//  SEÇÕES MODULARES
//  Cada seção é um componente autônomo que recebe props bem definidas.
//  Para adicionar uma nova seção basta criar um componente e incluí-lo
//  na lista `sections` no final da página, filtrando por role se necessário.
// ─────────────────────────────────────────────────────────────────────────────

// ─── Seção: Perfil do usuário ─────────────────────────────────────────────────

function ProfileSection({ user }: { user: User | null }) {
  const initials = useMemo(() => initialsFrom(user?.name, user?.email), [user]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserIcon className="h-4 w-4" /> Perfil
        </CardTitle>
        <CardDescription>Informações da sua conta</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Avatar + dados principais */}
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-base truncate">{user?.name ?? 'Usuário'}</p>
            <p className="text-sm text-muted-foreground truncate">{user?.email ?? '—'}</p>
            <span className="mt-1 inline-block rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {formatRole(user?.role)}
            </span>
          </div>
        </div>

        <Separator />

        {/* Detalhes */}
        <div className="space-y-2 text-sm">
          <InfoRow label="ID" value={user?.id ?? '—'} mono />
          <InfoRow label="Role" value={formatRole(user?.role)} />
          <InfoRow label="Sessão" value="Ativa" highlight />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Seção: Aparência ─────────────────────────────────────────────────────────

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: React.ElementType }[] = [
  { value: 'light', label: 'Claro',      icon: Sun     },
  { value: 'dark',  label: 'Escuro',     icon: Moon    },
  { value: 'auto',  label: 'Automático', icon: Monitor },
];

function AppearanceSection({ theme, onChange }: {
  theme: ThemeMode; onChange: (t: ThemeMode) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sun className="h-4 w-4" /> Aparência
        </CardTitle>
        <CardDescription>Escolha o tema da interface</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => onChange(value)}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border px-3 py-4 text-sm font-medium transition-all',
                theme === value
                  ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                  : 'border-border hover:bg-accent'
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Seção: Notificações ──────────────────────────────────────────────────────

const NOTIFICATION_ITEMS: { key: keyof NotificationSettings; title: string; description: string; icon: React.ElementType }[] = [
  { key: 'newQuotes',       title: 'Novos orçamentos',    description: 'Alertas sobre movimentação em orçamentos.',      icon: FileText },
  { key: 'overdueInvoices', title: 'Faturas vencidas',    description: 'Destaque para cobranças que precisam de atenção.', icon: Bell    },
  { key: 'weeklyReports',   title: 'Relatórios semanais', description: 'Resumo semanal de desempenho por e-mail.',         icon: BellOff },
];

function NotificationsSection({ notifications, onChange }: {
  notifications: NotificationSettings;
  onChange: (key: keyof NotificationSettings, value: boolean) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" /> Notificações
        </CardTitle>
        <CardDescription>Controle o que você quer ser avisado</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {NOTIFICATION_ITEMS.map(({ key, title, description, icon: Icon }, idx) => (
          <div key={key}>
            {idx > 0 && <Separator className="mb-4" />}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
              <Switch
                checked={notifications[key]}
                onCheckedChange={(v) => onChange(key, v)}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Seção: Sistema / Informações ─────────────────────────────────────────────

function SystemSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Server className="h-4 w-4" /> Sistema
        </CardTitle>
        <CardDescription>Informações de conexão e versão</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <InfoRow label="API"            value={API_URL} mono />
        <InfoRow label="Autenticação"   value="JWT — Token local" />
        <InfoRow label="Versão"         value="1.0.0" />
        <InfoRow label="Frontend"       value="Next.js 14 + Tailwind + shadcn/ui" />
        <InfoRow label="Backend"        value="Node.js + Express + Prisma + MySQL" />
      </CardContent>
    </Card>
  );
}

// ─── Seção: Segurança (placeholder para expansão futura) ─────────────────────

function SecuritySection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-4 w-4" /> Segurança
        </CardTitle>
        <CardDescription>Configurações de acesso e autenticação</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border bg-muted/40 px-4 py-3 flex items-start gap-3">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Alteração de senha e configurações avançadas de segurança serão disponibilizadas em breve.
          </p>
        </div>
        <div className="space-y-2 text-sm">
          <InfoRow label="Tipo de sessão"      value="Token JWT" />
          <InfoRow label="Expiração do token"  value="7 dias" />
          <InfoRow label="2FA"                 value="Não configurado" />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Componente auxiliar: linha de info ───────────────────────────────────────

function InfoRow({ label, value, mono = false, highlight = false }: {
  label: string; value: string; mono?: boolean; highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-xs font-semibold uppercase text-muted-foreground shrink-0">{label}</span>
      <span className={cn(
        'text-right text-xs truncate',
        mono && 'font-mono',
        highlight && 'text-green-600 dark:text-green-400 font-semibold'
      )}>
        {value}
      </span>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
  const router = useRouter();
  const [user,          setUser]          = useState<User | null>(null);
  const [theme,         setTheme]         = useState<ThemeMode>('light');
  const [notifications, setNotifications] = useState<NotificationSettings>(DEFAULT_NOTIFICATIONS);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [currentUser, settings] = await Promise.all([
        Promise.resolve(authService.getCurrentUser() as User | null),
        settingsService.getSettings().catch(() => null),
      ]);
      setUser(currentUser);
      if (settings) {
        setTheme((settings.theme as ThemeMode) ?? 'light');
        setNotifications(parseNotifications(settings.notifications));
      }
    } catch {
      toast({ title: 'Erro ao carregar configurações', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleThemeChange = (t: ThemeMode) => setTheme(t);

  const handleNotificationChange = (key: keyof NotificationSettings, value: boolean) =>
    setNotifications((n) => ({ ...n, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsService.updateSettings({ theme, notifications });
      toast({ title: 'Preferências salvas com sucesso!', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Erro ao salvar preferências',
        description: err instanceof Error ? err.message : 'Erro inesperado.',
        variant: 'destructive',
      });
    } finally { setSaving(false); }
  };

  const handleLogout = () => {
    authService.logout();
    router.replace('/login');
  };

  // ─── Definição modular das seções ───────────────────────────────────────────
  // Para adicionar uma seção por role, basta filtrar aqui:
  // Ex: user?.role === 'ADMIN' && <AdminSection />
  //
  // Cada seção é independente — pode ser reordenada, ocultada ou expandida
  // sem afetar as outras.

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-muted-foreground">Carregando configurações...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-sm text-muted-foreground">Gerencie sua conta e preferências do sistema</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadData()} disabled={saving}>
            <RefreshCw className="mr-2 h-4 w-4" /> Recarregar
          </Button>
          <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar preferências'}
          </Button>
        </div>
      </div>

      {/* ── Seções modulares ── */}

      {/* 1. Perfil — sempre visível */}
      <ProfileSection user={user} />

      {/* 2. Aparência — sempre visível */}
      <AppearanceSection theme={theme} onChange={handleThemeChange} />

      {/* 3. Notificações — sempre visível */}
      <NotificationsSection notifications={notifications} onChange={handleNotificationChange} />

      {/* 4. Segurança — sempre visível (expandir conforme roles) */}
      <SecuritySection />

      {/* 5. Sistema — visível para todos; pode ser restrito a ADMIN futuramente */}
      <SystemSection />

      {/* ── Ação de logout ── */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <LogOut className="h-4 w-4" /> Sair da conta
          </CardTitle>
          <CardDescription>Encerra sua sessão atual e redireciona para o login</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleLogout} className="w-full sm:w-auto">
            <LogOut className="mr-2 h-4 w-4" /> Sair da conta
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
