import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { clientService, expenseService, invoiceService, projectService, quoteService } from '../../services/api';
import { Client, Expense, Invoice, Project, ProjectStatus, Quote, QuoteStatus } from '../../types';
import { Card, formatCurrency, SecondaryButton, ScreenShell, sharedStyles, StatCard } from './shared';

export default function DashboardScreen({ navigation }: any) {
  const [clients, setClients] = useState<Client[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [c, q, i, p, e] = await Promise.all([
          clientService.getAll().catch(() => []),
          quoteService.getAll().catch(() => []),
          invoiceService.getAll().catch(() => []),
          projectService.getAll().catch(() => []),
          expenseService.getAll().catch(() => []),
        ]);
        setClients(c); setQuotes(q); setInvoices(i); setProjects(p); setExpenses(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const faturado = invoices.reduce((s, i) => s + i.total, 0);
    const recebido = invoices.reduce((s, i) => s + i.amountPaid, 0);
    const emAberto = invoices.reduce((s, i) => s + Math.max(i.total - i.amountPaid, 0), 0);
    const despesasTotal = expenses.reduce((s, e) => s + e.amount, 0);
    const saldo = recebido - despesasTotal;
    const orcamentosAprovados = quotes.filter((q) => q.status === QuoteStatus.Aprovado).length;
    const projetosAtivos = projects.filter((p) => p.status === ProjectStatus.EmAndamento).length;
    return { faturado, recebido, emAberto, despesasTotal, saldo, orcamentosAprovados, projetosAtivos };
  }, [expenses, invoices, projects, quotes]);

  if (loading) {
    return (
      <View style={sharedStyles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={sharedStyles.helper}>Carregando dados...</Text>
      </View>
    );
  }

  return (
    <ScreenShell
      title="Painel"
      action={<SecondaryButton label="Financeiro" onPress={() => navigation.navigate('Financeiro')} />}
    >
      <ScrollView contentContainerStyle={sharedStyles.contentPad}>
        <View style={sharedStyles.grid2}>
          <StatCard label="Faturado" value={formatCurrency(stats.faturado)} iconLabel="💰" />
          <StatCard label="Recebido" value={formatCurrency(stats.recebido)} iconLabel="✅" />
          <StatCard label="Em aberto" value={formatCurrency(stats.emAberto)} iconLabel="⏳" />
          <StatCard label="Despesas" value={formatCurrency(stats.despesasTotal)} iconLabel="💸" />
          <StatCard label="Saldo" value={formatCurrency(stats.saldo)} iconLabel="📊" />
          <StatCard label="Clientes" value={String(clients.length)} iconLabel="👥" />
        </View>

        <Card>
          <Text style={sharedStyles.cardTitle}>Acesso rápido</Text>
          <View style={sharedStyles.chipRow}>
            <SecondaryButton label="Clientes" onPress={() => navigation.navigate('Clientes')} />
            <SecondaryButton label="Orçamentos" onPress={() => navigation.navigate('Orçamentos')} />
            <SecondaryButton label="Faturas" onPress={() => navigation.navigate('Faturas')} />
            <SecondaryButton label="Despesas" onPress={() => navigation.navigate('Despesas')} />
          </View>
        </Card>

        <Card>
          <Text style={sharedStyles.cardTitle}>Módulos principais</Text>
          <View style={sharedStyles.moduleGrid}>
            {['Clientes', 'Orçamentos', 'Financeiro', 'Faturas', 'Projetos', 'Despesas', 'Estoque', 'Configurações'].map((name) => (
              <View key={name} style={sharedStyles.modulePill}>
                <Text style={sharedStyles.modulePillText}>{name}</Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </ScreenShell>
  );
}
