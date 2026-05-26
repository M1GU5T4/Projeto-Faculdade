import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { clientService, expenseService, invoiceService, projectService, quoteService } from '../../services/api';
import { Client, Expense, Invoice, InvoiceStatus, Project, ProjectStatus, Quote, QuoteStatus } from '../../types';
import { Badge, Card, formatCurrency, formatDate, SecondaryButton, ScreenShell, sharedStyles, StatCard } from './shared';

export default function FinanceiroScreen({ navigation }: any) {
  const [clients, setClients] = useState<Client[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

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
    const faturado = invoices.reduce((s, i) => s + i.total, 0);
    const recebido = invoices.reduce((s, i) => s + i.amountPaid, 0);
    const emAberto = invoices.reduce((s, i) => s + Math.max(i.total - i.amountPaid, 0), 0);
    const despesasTotal = expenses.reduce((s, e) => s + e.amount, 0);
    const saldo = recebido - despesasTotal;
    const aprovados = quotes.filter((q) => q.status === QuoteStatus.Aprovado).length;
    const atrasadas = invoices.filter((i) => i.status === InvoiceStatus.Atrasado).length;
    const projetosAtivos = projects.filter((p) => p.status === ProjectStatus.EmAndamento).length;
    const now = new Date();
    const isCurrentMonth = (d: string) => { const dt = new Date(d); return dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth(); };
    const faturadoMes = invoices.filter((i) => isCurrentMonth(i.issueDate)).reduce((s, i) => s + i.total, 0);
    const despesasMes = expenses.filter((e) => isCurrentMonth(e.date)).reduce((s, e) => s + e.amount, 0);
    return { faturado, recebido, emAberto, despesasTotal, saldo, aprovados, atrasadas, projetosAtivos, faturadoMes, despesasMes };
  }, [expenses, invoices, projects, quotes]);

  const clientNameById = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);

  const pendingInvoices = useMemo(() =>
    [...invoices].filter((i) => i.status !== InvoiceStatus.Pago).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 4),
    [invoices]);

  const recentExpenses = useMemo(() =>
    [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4),
    [expenses]);

  if (loading) {
    return (
      <View style={sharedStyles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={sharedStyles.helper}>Carregando financeiro...</Text>
      </View>
    );
  }

  return (
    <ScreenShell title="Financeiro" action={<SecondaryButton label="Atualizar" onPress={load} />}>
      <ScrollView contentContainerStyle={sharedStyles.contentPad}>
        <View style={sharedStyles.grid2}>
          <StatCard label="Faturado" value={formatCurrency(metrics.faturado)} iconLabel="💰" />
          <StatCard label="Recebido" value={formatCurrency(metrics.recebido)} iconLabel="✅" />
          <StatCard label="Em aberto" value={formatCurrency(metrics.emAberto)} iconLabel="⏳" />
          <StatCard label="Despesas" value={formatCurrency(metrics.despesasTotal)} iconLabel="💸" />
          <StatCard label="Saldo" value={formatCurrency(metrics.saldo)} iconLabel="📊" />
          <StatCard label="Atrasadas" value={String(metrics.atrasadas)} iconLabel="⚠️" />
        </View>

        <Card>
          <Text style={sharedStyles.cardTitle}>Resumo do mês</Text>
          <View style={sharedStyles.grid2}>
            <StatCard label="Receita do mês" value={formatCurrency(metrics.faturadoMes)} iconLabel="📥" />
            <StatCard label="Despesas do mês" value={formatCurrency(metrics.despesasMes)} iconLabel="📤" />
          </View>
          <View style={sharedStyles.chipRow}>
            <SecondaryButton label="Clientes" onPress={() => navigation.navigate('Clientes')} />
            <SecondaryButton label="Orçamentos" onPress={() => navigation.navigate('Orçamentos')} />
            <SecondaryButton label="Faturas" onPress={() => navigation.navigate('Faturas')} />
            <SecondaryButton label="Despesas" onPress={() => navigation.navigate('Despesas')} />
          </View>
        </Card>

        <Card>
          <Text style={sharedStyles.cardTitle}>Indicadores</Text>
          <View style={sharedStyles.badgeRow}>
            <Badge label={`Orçamentos aprovados ${metrics.aprovados}`} />
            <Badge label={`Projetos ativos ${metrics.projetosAtivos}`} />
            <Badge label={`Clientes ${clients.length}`} />
          </View>
        </Card>

        <Card>
          <Text style={sharedStyles.cardTitle}>Contas a receber</Text>
          {pendingInvoices.length === 0
            ? <Text style={sharedStyles.helper}>Nenhuma fatura pendente.</Text>
            : pendingInvoices.map((inv) => (
              <View key={inv.id} style={sharedStyles.financeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={sharedStyles.cardTitle}>{inv.invoiceNumber}</Text>
                  <Text style={sharedStyles.cardText}>{clientNameById.get(inv.clientId) ?? 'Cliente não encontrado'}</Text>
                  <Text style={sharedStyles.helper}>Vencimento: {formatDate(inv.dueDate)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Badge label={inv.status} />
                  <Text style={sharedStyles.cardText}>{formatCurrency(Math.max(inv.total - inv.amountPaid, 0))}</Text>
                </View>
              </View>
            ))}
        </Card>

        <Card>
          <Text style={sharedStyles.cardTitle}>Despesas recentes</Text>
          {recentExpenses.length === 0
            ? <Text style={sharedStyles.helper}>Nenhuma despesa cadastrada.</Text>
            : recentExpenses.map((exp) => (
              <View key={exp.id} style={sharedStyles.financeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={sharedStyles.cardTitle}>{exp.description}</Text>
                  <Text style={sharedStyles.cardText}>{exp.category}</Text>
                  <Text style={sharedStyles.helper}>{formatDate(exp.date)}</Text>
                </View>
                <Text style={sharedStyles.cardText}>{formatCurrency(exp.amount)}</Text>
              </View>
            ))}
        </Card>
      </ScrollView>
    </ScreenShell>
  );
}
