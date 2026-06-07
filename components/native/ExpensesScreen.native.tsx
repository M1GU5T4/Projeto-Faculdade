import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, View } from 'react-native';
import { expenseService, invoiceService } from '../../services/api';
import { Expense, Invoice } from '../../types';
import { Badge, Card, FormField, formatCurrency, formatDate, ListScreen, PrimaryButton, SearchField, SecondaryButton, sharedStyles, StatCard, safeErrorMessage, toDateInputValue } from './shared';

type ExpenseFormState = {
  category: string;
  description: string;
  amount: string;
  date: string;
  invoiceId: string;
};

const defaultExpenseForm = (): ExpenseFormState => ({
  category: '',
  description: '',
  amount: '',
  date: toDateInputValue(new Date()),
  invoiceId: '',
});

function ExpenseCreateModal({ visible, invoices, onClose, onSaved }: {
  visible: boolean;
  invoices: Invoice[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [form, setForm] = useState<ExpenseFormState>(defaultExpenseForm);
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm(defaultExpenseForm());
      setInvoiceQuery('');
      setSaving(false);
    }
  }, [visible]);

  const filteredInvoices = useMemo(() => {
    const q = invoiceQuery.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter((invoice) => invoice.invoiceNumber.toLowerCase().includes(q));
  }, [invoiceQuery, invoices]);

  const submit = async () => {
    const amount = Number(form.amount.replace(',', '.'));

    if (!form.category.trim() || !form.description.trim() || !form.date.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha categoria, descrição e data.');
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Valor inválido', 'Informe um valor maior que zero.');
      return;
    }

    setSaving(true);
    try {
      await expenseService.create({
        category: form.category.trim(),
        description: form.description.trim(),
        amount,
        date: form.date.trim(),
        invoiceId: form.invoiceId || undefined,
      });
      await onSaved();
      onClose();
      Alert.alert('Sucesso', 'Despesa cadastrada com sucesso.');
    } catch (error) {
      Alert.alert('Erro ao criar despesa', safeErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const selectedInvoice = invoices.find((invoice) => invoice.id === form.invoiceId);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sharedStyles.modalBackdrop}>
        <View style={sharedStyles.modalCard}>
          <View style={sharedStyles.modalHeader}>
            <Text style={sharedStyles.modalTitle}>Nova despesa</Text>
            <SecondaryButton label="Fechar" onPress={onClose} />
          </View>
          <ScrollView contentContainerStyle={sharedStyles.modalBody} keyboardShouldPersistTaps="handled">
            <FormField label="Categoria" value={form.category} onChangeText={(v) => setForm((f) => ({ ...f, category: v }))} placeholder="Material, transporte, alimentação..." />
            <FormField label="Descrição" value={form.description} onChangeText={(v) => setForm((f) => ({ ...f, description: v }))} placeholder="O que foi gasto" multiline />
            <View style={sharedStyles.formRow}>
              <View style={sharedStyles.formColumn}>
                <FormField label="Valor" value={form.amount} onChangeText={(v) => setForm((f) => ({ ...f, amount: v }))} placeholder="0,00" keyboardType="decimal-pad" />
              </View>
              <View style={sharedStyles.formColumn}>
                <FormField label="Data" value={form.date} onChangeText={(v) => setForm((f) => ({ ...f, date: v }))} placeholder="YYYY-MM-DD" />
              </View>
            </View>

            <Text style={sharedStyles.formLabel}>Vincular a fatura</Text>
            <FormField label="Buscar fatura" value={invoiceQuery} onChangeText={setInvoiceQuery} placeholder="Número da fatura" />
            <View style={sharedStyles.clientPickerList}>
              <View style={[sharedStyles.clientPickerItem, !form.invoiceId && sharedStyles.clientPickerItemSelected]}>
                <Text style={sharedStyles.clientPickerName} onPress={() => setForm((f) => ({ ...f, invoiceId: '' }))}>Despesa avulsa</Text>
                <Text style={sharedStyles.clientPickerInfo}>Sem vínculo com fatura</Text>
              </View>
              {filteredInvoices.map((invoice) => (
                <View key={invoice.id} style={[sharedStyles.clientPickerItem, form.invoiceId === invoice.id && sharedStyles.clientPickerItemSelected]}>
                  <Text style={sharedStyles.clientPickerName} onPress={() => setForm((f) => ({ ...f, invoiceId: invoice.id }))}>{invoice.invoiceNumber}</Text>
                  <Text style={sharedStyles.clientPickerInfo}>{formatCurrency(invoice.total)} · vence em {formatDate(invoice.dueDate)}</Text>
                </View>
              ))}
            </View>
            {selectedInvoice ? <Text style={sharedStyles.helper}>Selecionada: {selectedInvoice.invoiceNumber}</Text> : null}
          </ScrollView>
          <View style={sharedStyles.modalActions}>
            <SecondaryButton label="Cancelar" onPress={onClose} />
            <PrimaryButton label={saving ? 'Salvando...' : 'Criar despesa'} onPress={() => void submit()} disabled={saving} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ExpensesScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [createVisible, setCreateVisible] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [loadedExpenses, loadedInvoices] = await Promise.all([
        expenseService.getAll().catch(() => []),
        invoiceService.getAll().catch(() => []),
      ]);
      setExpenses(loadedExpenses);
      setInvoices(loadedInvoices);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const invoiceNumberById = useMemo(() => new Map(invoices.map((invoice) => [invoice.id, invoice.invoiceNumber])), [invoices]);

  const filteredExpenses = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return expenses;
    return expenses.filter((e) => [e.description, e.category, e.invoiceId ? invoiceNumberById.get(e.invoiceId) ?? '' : '']
      .some((f) => f.toLowerCase().includes(q)));
  }, [expenses, invoiceNumberById, query]);

  const summary = useMemo(() => {
    const linked = expenses.filter((expense) => expense.invoiceId);
    const linkedTotal = linked.reduce((s, e) => s + e.amount, 0);
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    return { total, linkedCount: linked.length, linkedTotal, looseTotal: total - linkedTotal };
  }, [expenses]);

  if (loading) {
    return (
      <View style={sharedStyles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={sharedStyles.helper}>Carregando despesas...</Text>
      </View>
    );
  }

  return (
    <>
      <ListScreen
        title="Despesas"
        data={filteredExpenses}
        emptyText="Nenhuma despesa encontrada."
        onRefresh={load}
        action={
          <View style={sharedStyles.actionRow}>
            <SecondaryButton label="Atualizar" onPress={load} />
            <PrimaryButton label="Nova despesa" onPress={() => setCreateVisible(true)} />
          </View>
        }
        header={
          <View style={sharedStyles.listHeaderBlock}>
            <View style={sharedStyles.grid2}>
              <StatCard label="Total" value={formatCurrency(summary.total)} iconLabel="💸" />
              <StatCard label="Vinculadas" value={String(summary.linkedCount)} iconLabel="NF" />
              <StatCard label="Com fatura" value={formatCurrency(summary.linkedTotal)} iconLabel="R$" />
              <StatCard label="Avulsas" value={formatCurrency(summary.looseTotal)} iconLabel="AV" />
            </View>
            <SearchField value={query} onChangeText={setQuery} placeholder="Buscar por descrição, categoria ou fatura" />
          </View>
        }
        renderItem={({ item }) => {
          const invoiceNumber = item.invoiceId ? invoiceNumberById.get(item.invoiceId) : null;
          return (
            <Card>
              <View style={sharedStyles.cardHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={sharedStyles.cardTitle}>{item.description}</Text>
                  <Text style={sharedStyles.cardText}>{item.category}</Text>
                </View>
                {invoiceNumber ? <Badge label={`Fatura ${invoiceNumber}`} /> : null}
              </View>
              <Text style={sharedStyles.helper}>{formatDate(item.date)}</Text>
              <Text style={sharedStyles.cardText}>{formatCurrency(item.amount)}</Text>
              {item.invoiceId && !invoiceNumber ? <Text style={sharedStyles.helper}>Fatura vinculada não encontrada.</Text> : null}
            </Card>
          );
        }}
      />
      <ExpenseCreateModal visible={createVisible} invoices={invoices} onClose={() => setCreateVisible(false)} onSaved={load} />
    </>
  );
}
