import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_URL, clientService, projectService, quoteService } from '../../services/api';
import { Client, Project, Quote, QuoteStatus } from '../../types';
import {
  Badge, Card, Chip, FormField, ListScreen, PrimaryButton, SearchField,
  SecondaryButton, sharedStyles, StatCard, formatCurrency, formatDate,
  safeErrorMessage, toDateInputValue,
} from './shared';

type QuoteLineItemDraft = { id: string; description: string; quantity: string; unitPrice: string };
type QuoteFormState = { quoteNumber: string; clientId: string; issueDate: string; expiryDate: string; tax: string; notes: string; lineItems: QuoteLineItemDraft[] };

function createDraft(): QuoteLineItemDraft {
  return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, description: '', quantity: '1', unitPrice: '0' };
}

function defaultForm(clients: Client[]): QuoteFormState {
  const today = toDateInputValue(new Date());
  const expiry = toDateInputValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  return { quoteNumber: `ORC-${Date.now()}`, clientId: clients[0]?.id ?? '', issueDate: today, expiryDate: expiry, tax: '0', notes: '', lineItems: [createDraft()] };
}

async function loadPdfAndShare(quote: Quote) {
  const token = await AsyncStorage.getItem('token');
  if (!token) throw new Error('Sessão expirada.');
  const dir = Paths.cache ?? Paths.document;
  if (!dir) throw new Error('Não foi possível preparar o arquivo do PDF.');
  const result = await File.downloadFileAsync(
    `${API_URL}/quotes/${quote.id}/pdf`,
    new File(dir, `orcamento-${quote.quoteNumber}.pdf`),
    { headers: { Authorization: `Bearer ${token}` }, idempotent: true },
  );
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf' });
    return;
  }
  Alert.alert('PDF gerado', `Arquivo salvo em: ${result.uri}`);
}

function QuoteCreateModal({ visible, clients, onClose, onSaved }: {
  visible: boolean; clients: Client[]; onClose: () => void; onSaved: () => Promise<void> | void;
}) {
  const [form, setForm] = useState<QuoteFormState>(defaultForm(clients));
  const [clientQuery, setClientQuery] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) { setForm(defaultForm(clients)); setClientQuery(''); setSaving(false); }
  }, [visible, clients]);

  const filteredClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => [c.name, c.email, c.phone].some((f) => f.toLowerCase().includes(q)));
  }, [clientQuery, clients]);

  const updateItem = (id: string, field: keyof Omit<QuoteLineItemDraft, 'id'>, value: string) =>
    setForm((f) => ({ ...f, lineItems: f.lineItems.map((i) => (i.id === id ? { ...i, [field]: value } : i)) }));

  const submit = async () => {
    const lineItems = form.lineItems
      .map((i) => ({ description: i.description.trim(), quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) }))
      .filter((i) => i.description && i.quantity > 0 && i.unitPrice > 0);

    if (!clients.length) { Alert.alert('Sem clientes', 'Cadastre um cliente antes de criar um orçamento.'); return; }
    if (!form.quoteNumber.trim() || !form.clientId.trim()) { Alert.alert('Campos obrigatórios', 'Preencha número do orçamento e cliente.'); return; }
    if (!lineItems.length) { Alert.alert('Itens obrigatórios', 'Adicione ao menos um item válido.'); return; }

    setSaving(true);
    try {
      await quoteService.create({
        quoteNumber: form.quoteNumber.trim(),
        clientId: form.clientId.trim(),
        issueDate: form.issueDate,
        expiryDate: form.expiryDate,
        tax: Number(form.tax || 0),
        notes: form.notes.trim() || null,
        status: QuoteStatus.Rascunho,
        lineItems: lineItems.map((i) => ({ ...i, total: i.quantity * i.unitPrice })),
      });
      await onSaved();
      onClose();
      Alert.alert('Sucesso', 'Orçamento criado com sucesso.');
    } catch (error) {
      Alert.alert('Erro ao criar orçamento', safeErrorMessage(error));
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sharedStyles.modalBackdrop}>
        <View style={sharedStyles.modalCard}>
          <View style={sharedStyles.modalHeader}>
            <Text style={sharedStyles.modalTitle}>Novo orçamento</Text>
            <SecondaryButton label="Fechar" onPress={onClose} />
          </View>
          <ScrollView contentContainerStyle={sharedStyles.modalBody} keyboardShouldPersistTaps="handled">
            <FormField label="Número" value={form.quoteNumber} onChangeText={(v) => setForm((f) => ({ ...f, quoteNumber: v }))} placeholder="ORC-123456" />
            <FormField label="Busca de cliente" value={clientQuery} onChangeText={setClientQuery} placeholder="Filtrar clientes" />
            <Text style={sharedStyles.formLabel}>Cliente</Text>
            <View style={sharedStyles.clientPickerList}>
              {filteredClients.length === 0
                ? <Text style={sharedStyles.helper}>Nenhum cliente encontrado.</Text>
                : filteredClients.map((c) => (
                  <View key={c.id} style={[sharedStyles.clientPickerItem, form.clientId === c.id && sharedStyles.clientPickerItemSelected]}>
                    <Text style={sharedStyles.clientPickerName} onPress={() => setForm((f) => ({ ...f, clientId: c.id }))}>{c.name}</Text>
                    <Text style={sharedStyles.clientPickerInfo}>{c.email}</Text>
                  </View>
                ))}
            </View>
            <View style={sharedStyles.formRow}>
              <View style={sharedStyles.formColumn}>
                <FormField label="Emissão" value={form.issueDate} onChangeText={(v) => setForm((f) => ({ ...f, issueDate: v }))} placeholder="YYYY-MM-DD" />
              </View>
              <View style={sharedStyles.formColumn}>
                <FormField label="Validade" value={form.expiryDate} onChangeText={(v) => setForm((f) => ({ ...f, expiryDate: v }))} placeholder="YYYY-MM-DD" />
              </View>
            </View>
            <FormField label="Taxa (%)" value={form.tax} onChangeText={(v) => setForm((f) => ({ ...f, tax: v }))} placeholder="0" keyboardType="decimal-pad" />
            <FormField label="Observações" value={form.notes} onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))} placeholder="Detalhes adicionais" multiline />
            <View style={sharedStyles.sectionHeaderRow}>
              <Text style={sharedStyles.formLabel}>Itens</Text>
              <SecondaryButton label="Adicionar item" onPress={() => setForm((f) => ({ ...f, lineItems: [...f.lineItems, createDraft()] }))} />
            </View>
            {form.lineItems.map((item, index) => (
              <Card key={item.id} style={sharedStyles.lineItemCard}>
                <View style={sharedStyles.sectionHeaderRow}>
                  <Text style={sharedStyles.cardTitle}>Item {index + 1}</Text>
                  {form.lineItems.length > 1 && (
                    <SecondaryButton label="Remover" onPress={() => setForm((f) => ({ ...f, lineItems: f.lineItems.filter((i) => i.id !== item.id) }))} />
                  )}
                </View>
                <FormField label="Descrição" value={item.description} onChangeText={(v) => updateItem(item.id, 'description', v)} placeholder="Descrição do serviço ou produto" />
                <View style={sharedStyles.formRow}>
                  <View style={sharedStyles.formColumn}>
                    <FormField label="Quantidade" value={item.quantity} onChangeText={(v) => updateItem(item.id, 'quantity', v)} placeholder="1" keyboardType="decimal-pad" />
                  </View>
                  <View style={sharedStyles.formColumn}>
                    <FormField label="Preço unitário" value={item.unitPrice} onChangeText={(v) => updateItem(item.id, 'unitPrice', v)} placeholder="0" keyboardType="decimal-pad" />
                  </View>
                </View>
              </Card>
            ))}
          </ScrollView>
          <View style={sharedStyles.modalActions}>
            <SecondaryButton label="Cancelar" onPress={onClose} />
            <PrimaryButton label={saving ? 'Salvando...' : 'Criar orçamento'} onPress={() => void submit()} disabled={saving} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function QuotesScreen() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | QuoteStatus>('TODOS');
  const [createVisible, setCreateVisible] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [q, c, p] = await Promise.all([
        quoteService.getAll().catch(() => []),
        clientService.getAll().catch(() => []),
        projectService.getAll().catch(() => []),
      ]);
      setQuotes(q); setClients(c); setProjects(p);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const clientNameById = useMemo(() => new Map(clients.map((c) => [c.id, c.name])), [clients]);
  const projectQuoteIds = useMemo(() => new Set(projects.map((p) => p.quoteId).filter(Boolean) as string[]), [projects]);

  const filteredQuotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    return quotes.filter((quote) => {
      const statusOk = statusFilter === 'TODOS' || quote.status === statusFilter;
      const textOk = !q || [quote.quoteNumber, clientNameById.get(quote.clientId) ?? '', quote.notes ?? ''].some((f) => f.toLowerCase().includes(q));
      return statusOk && textOk;
    });
  }, [clientNameById, query, quotes, statusFilter]);

  const summary = useMemo(() => ({
    total: quotes.length,
    approved: quotes.filter((q) => q.status === QuoteStatus.Aprovado).length,
    sent: quotes.filter((q) => q.status === QuoteStatus.Enviado).length,
    draft: quotes.filter((q) => q.status === QuoteStatus.Rascunho).length,
  }), [quotes]);

  const convertQuote = async (quote: Quote) => {
    if (quote.status !== QuoteStatus.Aprovado) { Alert.alert('Orçamento não aprovado', 'Só é possível converter orçamentos aprovados.'); return; }
    if (projectQuoteIds.has(quote.id)) { Alert.alert('Projeto existente', 'Este orçamento já foi convertido em projeto.'); return; }
    Alert.alert('Converter orçamento', `Criar um projeto a partir de ${quote.quoteNumber}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Converter', onPress: async () => { try { await quoteService.convertToProject(quote.id, {}); await load(); Alert.alert('Sucesso', 'Orçamento convertido em projeto.'); } catch (e) { Alert.alert('Erro', safeErrorMessage(e)); } } },
    ]);
  };

  if (loading) {
    return (
      <View style={sharedStyles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={sharedStyles.helper}>Carregando orçamentos...</Text>
      </View>
    );
  }

  return (
    <>
      <QuoteCreateModal visible={createVisible} clients={clients} onClose={() => setCreateVisible(false)} onSaved={load} />
      <ListScreen
        title="Orçamentos"
        data={filteredQuotes}
        emptyText="Nenhum orçamento encontrado."
        onRefresh={load}
        action={
          <View style={sharedStyles.actionRow}>
            <SecondaryButton label="Atualizar" onPress={load} />
            <PrimaryButton label="Novo" onPress={() => setCreateVisible(true)} />
          </View>
        }
        header={
          <View style={sharedStyles.listHeaderBlock}>
            <View style={sharedStyles.grid2}>
              <StatCard label="Total" value={String(summary.total)} iconLabel="🧾" />
              <StatCard label="Aprovados" value={String(summary.approved)} iconLabel="✅" />
              <StatCard label="Enviados" value={String(summary.sent)} iconLabel="📤" />
              <StatCard label="Rascunhos" value={String(summary.draft)} iconLabel="📝" />
            </View>
            <SearchField value={query} onChangeText={setQuery} placeholder="Buscar por número, cliente ou observação" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={sharedStyles.chipRow}>
              <Chip label="Todos" selected={statusFilter === 'TODOS'} onPress={() => setStatusFilter('TODOS')} />
              <Chip label="Rascunho" selected={statusFilter === QuoteStatus.Rascunho} onPress={() => setStatusFilter(QuoteStatus.Rascunho)} />
              <Chip label="Enviado" selected={statusFilter === QuoteStatus.Enviado} onPress={() => setStatusFilter(QuoteStatus.Enviado)} />
              <Chip label="Aprovado" selected={statusFilter === QuoteStatus.Aprovado} onPress={() => setStatusFilter(QuoteStatus.Aprovado)} />
              <Chip label="Rejeitado" selected={statusFilter === QuoteStatus.Rejeitado} onPress={() => setStatusFilter(QuoteStatus.Rejeitado)} />
            </ScrollView>
          </View>
        }
        renderItem={({ item }) => {
          const clientName = clientNameById.get(item.clientId) ?? 'Cliente não encontrado';
          const linked = projectQuoteIds.has(item.id);
          return (
            <Card>
              <View style={sharedStyles.cardHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={sharedStyles.cardTitle}>{item.quoteNumber}</Text>
                  <Text style={sharedStyles.cardText}>{clientName}</Text>
                </View>
                <Badge label={item.status} />
              </View>
              <View style={sharedStyles.smallGrid}>
                <View style={sharedStyles.smallPill}><Text style={sharedStyles.smallPillLabel}>Emissão</Text><Text style={sharedStyles.smallPillValue}>{formatDate(item.issueDate)}</Text></View>
                <View style={sharedStyles.smallPill}><Text style={sharedStyles.smallPillLabel}>Validade</Text><Text style={sharedStyles.smallPillValue}>{formatDate(item.expiryDate)}</Text></View>
                <View style={sharedStyles.smallPill}><Text style={sharedStyles.smallPillLabel}>Total</Text><Text style={sharedStyles.smallPillValue}>{formatCurrency(item.total)}</Text></View>
              </View>
              {item.notes ? <Text style={sharedStyles.helper}>{item.notes}</Text> : null}
              <View style={sharedStyles.actionRow}>
                <SecondaryButton label="PDF" onPress={() => void loadPdfAndShare(item).catch((e) => Alert.alert('Erro ao gerar PDF', safeErrorMessage(e)))} />
                <PrimaryButton label={linked ? 'Já virou projeto' : 'Converter'} disabled={linked || item.status !== QuoteStatus.Aprovado} onPress={() => void convertQuote(item)} />
              </View>
            </Card>
          );
        }}
      />
    </>
  );
}
