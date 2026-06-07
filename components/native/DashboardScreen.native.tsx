import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { clientService, expenseService, invoiceService, projectService, quoteService } from '../../services/api';
import { Client, Expense, Invoice, Project, ProjectStatus, Quote, QuoteStatus } from '../../types';
import { Card, formatCurrency, SecondaryButton, ScreenShell, sharedStyles, StatCard, useAppTheme } from './shared';

type DashboardRoute = 'Clientes' | 'Orçamentos' | 'Financeiro' | 'Faturas' | 'Projetos' | 'Despesas' | 'Estoque' | 'Configurações';

const moduleRoutes: DashboardRoute[] = ['Clientes', 'Orçamentos', 'Financeiro', 'Faturas', 'Projetos', 'Despesas', 'Estoque', 'Configurações'];

export default function DashboardScreen({ navigation }: any) {
  const { colors } = useAppTheme();
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

  const statCards: Array<{ label: string; value: string; iconLabel: string; route: DashboardRoute }> = [
    { label: 'Faturado', value: formatCurrency(stats.faturado), iconLabel: '💰', route: 'Financeiro' },
    { label: 'Recebido', value: formatCurrency(stats.recebido), iconLabel: '✅', route: 'Financeiro' },
    { label: 'Em aberto', value: formatCurrency(stats.emAberto), iconLabel: '⏳', route: 'Financeiro' },
    { label: 'Despesas', value: formatCurrency(stats.despesasTotal), iconLabel: '💸', route: 'Despesas' },
    { label: 'Saldo', value: formatCurrency(stats.saldo), iconLabel: '📊', route: 'Financeiro' },
    { label: 'Clientes', value: String(clients.length), iconLabel: '👥', route: 'Clientes' },
  ];

  if (loading) {
    return (
      <View style={[sharedStyles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[sharedStyles.helper, { color: colors.textMuted }]}>Carregando dados...</Text>
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
          {statCards.map((item) => (
            <Pressable
              key={item.label}
              onPress={() => navigation.navigate(item.route)}
              style={({ pressed }) => [sharedStyles.statCardPressable, pressed && sharedStyles.buttonPressed]}
            >
              <StatCard label={item.label} value={item.value} iconLabel={item.iconLabel} />
            </Pressable>
          ))}
        </View>

        <Card>
          <Text style={[sharedStyles.cardTitle, { color: colors.text }]}>Acesso rápido</Text>
          <View style={sharedStyles.chipRow}>
            <SecondaryButton label="Clientes" onPress={() => navigation.navigate('Clientes')} />
            <SecondaryButton label="Orçamentos" onPress={() => navigation.navigate('Orçamentos')} />
            <SecondaryButton label="Faturas" onPress={() => navigation.navigate('Faturas')} />
            <SecondaryButton label="Despesas" onPress={() => navigation.navigate('Despesas')} />
          </View>
        </Card>

        <Card>
          <Text style={[sharedStyles.cardTitle, { color: colors.text }]}>Módulos principais</Text>
          <View style={sharedStyles.moduleGrid}>
            {moduleRoutes.map((name) => (
              <Pressable
                key={name}
                onPress={() => navigation.navigate(name)}
                style={({ pressed }) => [
                  sharedStyles.modulePill,
                  { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
                  pressed && sharedStyles.buttonPressed,
                ]}
              >
                <Text style={[sharedStyles.modulePillText, { color: colors.text }]}>{name}</Text>
              </Pressable>
            ))}
          </View>
        </Card>
      </ScrollView>
    </ScreenShell>
  );
}
