import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { clientService, expenseService, invoiceService, projectService, quoteService } from '../../services/api';
import { Client, Expense, Invoice, InvoiceStatus, Project, ProjectStatus, Quote, QuoteStatus } from '../../types';
import { Card, formatCurrency, SecondaryButton, ScreenShell, sharedStyles, StatCard, useAppTheme } from './shared';

const statusLabels: Record<string, string> = {
  [ProjectStatus.NaoIniciado]: 'Não iniciado',
  [ProjectStatus.EmAndamento]: 'Em andamento',
  [ProjectStatus.Concluido]: 'Concluído',
};

const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit' });

type DataKey = 'clients' | 'quotes' | 'invoices' | 'projects' | 'expenses';

type MonthlyPoint = {
  key: string;
  label: string;
  revenue: number;
  expenses: number;
};

const getMonthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;

const parseSafeDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

function MiniBarChart({ data }: { data: MonthlyPoint[] }) {
  const { colors } = useAppTheme();
  const maxValue = Math.max(...data.flatMap((item) => [item.revenue, item.expenses]), 1);

  if (data.length === 0) {
    return <Text style={[sharedStyles.helper, { color: colors.textMuted }]}>Sem dados financeiros para exibir.</Text>;
  }

  return (
    <View style={styles.chartRows}>
      {data.map((item) => (
        <View key={item.key} style={styles.chartRow}>
          <Text style={[styles.monthLabel, { color: colors.textMuted }]}>{item.label}</Text>
          <View style={styles.barGroup}>
            <View style={[styles.barTrack, { backgroundColor: colors.surfaceMuted }]}>
              <View style={[styles.barFill, { width: `${(item.revenue / maxValue) * 100}%`, backgroundColor: colors.primary }]} />
            </View>
            <View style={[styles.barTrack, { backgroundColor: colors.surfaceMuted }]}>
              <View style={[styles.barFill, { width: `${(item.expenses / maxValue) * 100}%`, backgroundColor: '#ef4444' }]} />
            </View>
          </View>
          <View style={styles.chartValues}>
            <Text style={[styles.chartValue, { color: colors.text }]}>{formatCurrency(item.revenue)}</Text>
            <Text style={[styles.chartValue, { color: colors.textMuted }]}>{formatCurrency(item.expenses)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function StatusRow({ label, count, total }: { label: string; count: number; total: number }) {
  const { colors } = useAppTheme();
  const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <View style={styles.statusRow}>
      <View style={styles.statusHeader}>
        <Text style={[styles.statusLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.statusCount, { color: colors.textMuted }]}>{count} • {percentage}%</Text>
      </View>
      <View style={[styles.statusTrack, { backgroundColor: colors.surfaceMuted }]}>
        <View style={[styles.statusFill, { width: `${percentage}%`, backgroundColor: colors.primary }]} />
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const { colors } = useAppTheme();
  const [clients, setClients] = useState<Client[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [failedSections, setFailedSections] = useState<DataKey[]>([]);
  const [loading, setLoading] = useState(true);

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
    const failed = keys.filter((_, index) => results[index].status === 'rejected');

    if (results[0].status === 'fulfilled') setClients(results[0].value);
    if (results[1].status === 'fulfilled') setQuotes(results[1].value);
    if (results[2].status === 'fulfilled') setInvoices(results[2].value);
    if (results[3].status === 'fulfilled') setProjects(results[3].value);
    if (results[4].status === 'fulfilled') setExpenses(results[4].value);

    setFailedSections(failed);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const metrics = useMemo(() => {
    const paidInvoices = invoices.filter((invoice) => invoice.status === InvoiceStatus.Pago);
    const openInvoices = invoices.filter((invoice) => invoice.status === InvoiceStatus.Pendente || invoice.status === InvoiceStatus.Atrasado);
    const totalRevenue = paidInvoices.reduce((sum, invoice) => sum + invoice.total, 0);
    const received = invoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const outstandingRevenue = openInvoices.reduce((sum, invoice) => sum + Math.max(invoice.total - invoice.amountPaid, 0), 0);
    const activeProjects = projects.filter((project) => project.status === ProjectStatus.EmAndamento).length;
    const approvedQuotes = quotes.filter((quote) => quote.status === QuoteStatus.Aprovado).length;
    const lateInvoices = invoices.filter((invoice) => invoice.status === InvoiceStatus.Atrasado).length;

    return {
      totalRevenue,
      received,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      outstandingRevenue,
      openInvoices: openInvoices.length,
      activeProjects,
      approvedQuotes,
      lateInvoices,
      clients: clients.length,
    };
  }, [clients.length, expenses, invoices, projects, quotes]);

  const monthlyData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const key = getMonthKey(date);
      return [key, { key, label: monthFormatter.format(date).replace('.', ''), revenue: 0, expenses: 0 }] as const;
    });
    const byMonth = new Map<string, MonthlyPoint>(months);

    invoices.forEach((invoice) => {
      if (invoice.status !== InvoiceStatus.Pago) return;
      const date = parseSafeDate(invoice.issueDate);
      if (!date) return;
      const point = byMonth.get(getMonthKey(date));
      if (point) point.revenue += invoice.total;
    });

    expenses.forEach((expense) => {
      const date = parseSafeDate(expense.date);
      if (!date) return;
      const point = byMonth.get(getMonthKey(date));
      if (point) point.expenses += expense.amount;
    });

    return [...byMonth.values()];
  }, [expenses, invoices]);

  const projectStatus = useMemo(() => {
    const counts = new Map<string, number>();
    projects.forEach((project) => counts.set(project.status, (counts.get(project.status) ?? 0) + 1));
    return Object.values(ProjectStatus).map((status) => ({
      status,
      label: statusLabels[status] ?? status,
      count: counts.get(status) ?? 0,
    }));
  }, [projects]);

  const failuresLabel = failedSections.length > 0
    ? `Alguns dados não foram carregados (${failedSections.length} de 5). Toque em Atualizar para tentar novamente.`
    : null;

  if (loading) {
    return (
      <View style={[sharedStyles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[sharedStyles.helper, { color: colors.textMuted }]}>Carregando painel...</Text>
      </View>
    );
  }

  if (failedSections.length === 5) {
    return (
      <ScreenShell title="Painel" action={<SecondaryButton label="Atualizar" onPress={load} />}>
        <View style={[sharedStyles.center, { backgroundColor: colors.background, padding: 24 }]}>
          <Text style={[sharedStyles.cardTitle, { color: colors.text, textAlign: 'center' }]}>Não foi possível carregar o painel.</Text>
          <Text style={[sharedStyles.helper, { color: colors.textMuted, textAlign: 'center' }]}>Verifique a conexão com a API e tente novamente.</Text>
          <View style={{ marginTop: 16 }}>
            <SecondaryButton label="Tentar novamente" onPress={load} />
          </View>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Painel" action={<SecondaryButton label="Atualizar" onPress={load} />}>
      <ScrollView contentContainerStyle={sharedStyles.contentPad}>
        {failuresLabel && (
          <Card style={{ backgroundColor: '#fef9c3', borderColor: '#facc15' }}>
            <Text style={[sharedStyles.cardText, { color: colors.text }]}>{failuresLabel}</Text>
          </Card>
        )}

        <View style={sharedStyles.grid2}>
          <StatCard label="Faturamento Total" value={formatCurrency(metrics.totalRevenue)} iconLabel="R$" />
          <StatCard label="Despesas Totais" value={formatCurrency(metrics.totalExpenses)} iconLabel="D" />
          <StatCard label="Lucro Líquido" value={formatCurrency(metrics.netProfit)} iconLabel="L" />
          <StatCard label="Pendente Receber" value={formatCurrency(metrics.outstandingRevenue)} iconLabel="P" />
          <StatCard label="Faturas Abertas" value={String(metrics.openInvoices)} iconLabel="F" />
          <StatCard label="Projetos em Andamento" value={String(metrics.activeProjects)} iconLabel="Pj" />
        </View>

        <Card>
          <View style={sharedStyles.sectionHeaderRow}>
            <View>
              <Text style={[sharedStyles.cardTitle, { color: colors.text }]}>Receita vs. Despesas</Text>
              <Text style={[sharedStyles.helper, { color: colors.textMuted }]}>Últimos 6 meses</Text>
            </View>
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.primary }]} /><Text style={[styles.legendText, { color: colors.textMuted }]}>Faturamento</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} /><Text style={[styles.legendText, { color: colors.textMuted }]}>Despesas</Text></View>
          </View>
          <MiniBarChart data={monthlyData} />
        </Card>

        <Card>
          <Text style={[sharedStyles.cardTitle, { color: colors.text }]}>Status dos Projetos</Text>
          <Text style={[sharedStyles.helper, { color: colors.textMuted }]}>Distribuição dos projetos cadastrados</Text>
          <View style={styles.statusList}>
            {projectStatus.map((item) => (
              <StatusRow key={item.status} label={item.label} count={item.count} total={projects.length} />
            ))}
          </View>
        </Card>

        <Card>
          <Text style={[sharedStyles.cardTitle, { color: colors.text }]}>Indicadores complementares</Text>
          <View style={sharedStyles.smallGrid}>
            <View style={[sharedStyles.smallPill, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
              <Text style={[sharedStyles.smallPillLabel, { color: colors.textMuted }]}>Clientes</Text>
              <Text style={[sharedStyles.smallPillValue, { color: colors.text }]}>{metrics.clients}</Text>
            </View>
            <View style={[sharedStyles.smallPill, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
              <Text style={[sharedStyles.smallPillLabel, { color: colors.textMuted }]}>Recebido</Text>
              <Text style={[sharedStyles.smallPillValue, { color: colors.text }]}>{formatCurrency(metrics.received)}</Text>
            </View>
            <View style={[sharedStyles.smallPill, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
              <Text style={[sharedStyles.smallPillLabel, { color: colors.textMuted }]}>Aprovados</Text>
              <Text style={[sharedStyles.smallPillValue, { color: colors.text }]}>{metrics.approvedQuotes}</Text>
            </View>
            <View style={[sharedStyles.smallPill, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
              <Text style={[sharedStyles.smallPillLabel, { color: colors.textMuted }]}>Atrasadas</Text>
              <Text style={[sharedStyles.smallPillValue, { color: colors.text }]}>{metrics.lateInvoices}</Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  legendRow: { flexDirection: 'row', gap: 12, marginTop: 8, marginBottom: 10, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontWeight: '600' },
  chartRows: { gap: 12, marginTop: 4 },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  monthLabel: { width: 52, fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  barGroup: { flex: 1, gap: 4 },
  barTrack: { height: 10, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  chartValues: { width: 82, alignItems: 'flex-end' },
  chartValue: { fontSize: 10, fontWeight: '600' },
  statusList: { gap: 12, marginTop: 12 },
  statusRow: { gap: 6 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusLabel: { fontSize: 13, fontWeight: '700' },
  statusCount: { fontSize: 12, fontWeight: '600' },
  statusTrack: { height: 9, borderRadius: 999, overflow: 'hidden' },
  statusFill: { height: '100%', borderRadius: 999 },
});
