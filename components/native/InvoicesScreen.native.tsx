import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import { clientService, invoiceService } from '../../services/api';
import { Client, Invoice, InvoiceStatus } from '../../types';
import { Badge, Card, Chip, ListScreen, PrimaryButton, SearchField, SecondaryButton, sharedStyles, StatCard, formatCurrency, formatDate, safeErrorMessage } from './shared';

export default function InvoicesScreen() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | InvoiceStatus>('TODOS');

  const load = async () => {
    setLoading(true);
    try {
      const [i, c] = await Promise.all([invoiceService.getAll().catch(() => []), clientService.getAll().catch(() => [])]);
      setInvoices(i); setClients(c);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const clientNameById = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);

  const filteredInvoices = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((inv) => {
      const statusOk = statusFilter === 'TODOS' || inv.status === statusFilter;
      const textOk = !q || [inv.invoiceNumber, clientNameById.get(inv.clientId) ?? ''].some((f) => f.toLowerCase().includes(q));
      return statusOk && textOk;
    });
  }, [clientNameById, invoices, query, statusFilter]);

  const summary = useMemo(() => ({
    total: invoices.length,
    paid: invoices.filter((i) => i.status === InvoiceStatus.Pago).length,
    overdue: invoices.filter((i) => i.status === InvoiceStatus.Atrasado).length,
    openValue: invoices.reduce((s, i) => s + Math.max(i.total - i.amountPaid, 0), 0),
  }), [invoices]);

  const markAsPaid = async (invoice: Invoice) => {
    Alert.alert('Baixar fatura', `Marcar ${invoice.invoiceNumber} como paga?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Marcar como paga',
        onPress: async () => {
          try { await invoiceService.markAsPaid(invoice.id, invoice.total); await load(); Alert.alert('Sucesso', 'Fatura marcada como paga.'); }
          catch (e) { Alert.alert('Erro', safeErrorMessage(e)); }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={sharedStyles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={sharedStyles.helper}>Carregando faturas...</Text>
      </View>
    );
  }

  return (
    <ListScreen
      title="Faturas"
      data={filteredInvoices}
      emptyText="Nenhuma fatura encontrada."
      onRefresh={load}
      action={<SecondaryButton label="Atualizar" onPress={load} />}
      header={
        <View style={sharedStyles.listHeaderBlock}>
          <View style={sharedStyles.grid2}>
            <StatCard label="Faturas" value={String(summary.total)} iconLabel="💳" />
            <StatCard label="Pagas" value={String(summary.paid)} iconLabel="✅" />
            <StatCard label="Atrasadas" value={String(summary.overdue)} iconLabel="⛔" />
            <StatCard label="Em aberto" value={formatCurrency(summary.openValue)} iconLabel="💰" />
          </View>
          <SearchField value={query} onChangeText={setQuery} placeholder="Buscar por número ou cliente" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={sharedStyles.chipRow}>
            <Chip label="Todos" selected={statusFilter === 'TODOS'} onPress={() => setStatusFilter('TODOS')} />
            <Chip label="Rascunho" selected={statusFilter === InvoiceStatus.Rascunho} onPress={() => setStatusFilter(InvoiceStatus.Rascunho)} />
            <Chip label="Pendente" selected={statusFilter === InvoiceStatus.Pendente} onPress={() => setStatusFilter(InvoiceStatus.Pendente)} />
            <Chip label="Pago" selected={statusFilter === InvoiceStatus.Pago} onPress={() => setStatusFilter(InvoiceStatus.Pago)} />
            <Chip label="Atrasado" selected={statusFilter === InvoiceStatus.Atrasado} onPress={() => setStatusFilter(InvoiceStatus.Atrasado)} />
          </ScrollView>
        </View>
      }
      renderItem={({ item }) => {
        const clientName = clientNameById.get(item.clientId) ?? 'Cliente não encontrado';
        const remaining = Math.max(item.total - item.amountPaid, 0);
        return (
          <Card>
            <View style={sharedStyles.cardHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={sharedStyles.cardTitle}>{item.invoiceNumber}</Text>
                <Text style={sharedStyles.cardText}>{clientName}</Text>
              </View>
              <Badge label={item.status} />
            </View>
            <View style={sharedStyles.smallGrid}>
              <View style={sharedStyles.smallPill}><Text style={sharedStyles.smallPillLabel}>Emissão</Text><Text style={sharedStyles.smallPillValue}>{formatDate(item.issueDate)}</Text></View>
              <View style={sharedStyles.smallPill}><Text style={sharedStyles.smallPillLabel}>Vencimento</Text><Text style={sharedStyles.smallPillValue}>{formatDate(item.dueDate)}</Text></View>
              <View style={sharedStyles.smallPill}><Text style={sharedStyles.smallPillLabel}>Pago</Text><Text style={sharedStyles.smallPillValue}>{formatCurrency(item.amountPaid)}</Text></View>
              <View style={sharedStyles.smallPill}><Text style={sharedStyles.smallPillLabel}>Em aberto</Text><Text style={sharedStyles.smallPillValue}>{formatCurrency(remaining)}</Text></View>
            </View>
            <View style={sharedStyles.actionRow}>
              <SecondaryButton label="Detalhes" onPress={() => Alert.alert('Fatura', `${item.invoiceNumber}\nTotal: ${formatCurrency(item.total)}`)} />
              {item.status !== InvoiceStatus.Pago && <PrimaryButton label="Marcar como paga" onPress={() => void markAsPaid(item)} />}
            </View>
          </Card>
        );
      }}
    />
  );
}
