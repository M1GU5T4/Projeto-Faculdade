import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { expenseService } from '../../services/api';
import { Expense } from '../../types';
import { Card, formatCurrency, formatDate, ListScreen, SearchField, SecondaryButton, sharedStyles, StatCard } from './shared';

export default function ExpensesScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setExpenses(await expenseService.getAll().catch(() => []));
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const filteredExpenses = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return expenses;
    return expenses.filter((e) => [e.description, e.category].some((f) => f.toLowerCase().includes(q)));
  }, [expenses, query]);

  const total = useMemo(() => expenses.reduce((s, e) => s + e.amount, 0), [expenses]);

  if (loading) {
    return (
      <View style={sharedStyles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={sharedStyles.helper}>Carregando despesas...</Text>
      </View>
    );
  }

  return (
    <ListScreen
      title="Despesas"
      data={filteredExpenses}
      emptyText="Nenhuma despesa encontrada."
      onRefresh={load}
      action={<SecondaryButton label="Atualizar" onPress={load} />}
      header={
        <View style={sharedStyles.listHeaderBlock}>
          <StatCard label="Total" value={formatCurrency(total)} iconLabel="💸" />
          <SearchField value={query} onChangeText={setQuery} placeholder="Buscar por descrição ou categoria" />
        </View>
      }
      renderItem={({ item }) => (
        <Card>
          <Text style={sharedStyles.cardTitle}>{item.description}</Text>
          <Text style={sharedStyles.cardText}>{item.category}</Text>
          <Text style={sharedStyles.helper}>{formatDate(item.date)}</Text>
          <Text style={sharedStyles.cardText}>{formatCurrency(item.amount)}</Text>
        </Card>
      )}
    />
  );
}
