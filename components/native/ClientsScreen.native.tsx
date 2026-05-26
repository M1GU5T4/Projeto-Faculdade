import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, View } from 'react-native';
import { clientService, invoiceService, projectService, quoteService } from '../../services/api';
import { Client, Invoice, Project, Quote } from '../../types';
import {
  Badge, Card, FormField, ListScreen, PrimaryButton, SearchField,
  SecondaryButton, sharedStyles, StatCard, safeErrorMessage,
} from './shared';

function ClientCreateModal({ visible, onClose, onSaved }: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) { setForm({ name: '', email: '', phone: '', address: '' }); setSaving(false); }
  }, [visible]);

  const submit = async () => {
    const { name, email, phone, address } = form;
    if (!name.trim() || !email.trim() || !phone.trim() || !address.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha nome, e-mail, telefone e endereço.');
      return;
    }
    setSaving(true);
    try {
      await clientService.create({ name: name.trim(), email: email.trim(), phone: phone.trim(), address: address.trim() });
      await onSaved();
      onClose();
      Alert.alert('Sucesso', 'Cliente criado com sucesso.');
    } catch (error) {
      Alert.alert('Erro ao criar cliente', safeErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sharedStyles.modalBackdrop}>
        <View style={sharedStyles.modalCard}>
          <View style={sharedStyles.modalHeader}>
            <Text style={sharedStyles.modalTitle}>Novo cliente</Text>
            <SecondaryButton label="Fechar" onPress={onClose} />
          </View>
          <ScrollView contentContainerStyle={sharedStyles.modalBody} keyboardShouldPersistTaps="handled">
            <FormField label="Nome" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Nome do cliente" />
            <FormField label="E-mail" value={form.email} onChangeText={(v) => setForm((f) => ({ ...f, email: v }))} placeholder="cliente@empresa.com" keyboardType="email-address" />
            <FormField label="Telefone" value={form.phone} onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))} placeholder="(00) 00000-0000" keyboardType="phone-pad" />
            <FormField label="Endereço" value={form.address} onChangeText={(v) => setForm((f) => ({ ...f, address: v }))} placeholder="Rua, número, bairro, cidade" multiline />
          </ScrollView>
          <View style={sharedStyles.modalActions}>
            <SecondaryButton label="Cancelar" onPress={onClose} />
            <PrimaryButton label={saving ? 'Salvando...' : 'Criar cliente'} onPress={() => void submit()} disabled={saving} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ClientsScreen() {
  const [clients, setClients] = useState<Client[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [createVisible, setCreateVisible] = useState(false);

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
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const metrics = useMemo(() => {
    const map = new Map<string, { quotes: number; invoices: number; projects: number; faturado: number }>();
    for (const c of clients) map.set(c.id, { quotes: 0, invoices: 0, projects: 0, faturado: 0 });
    for (const q of quotes) {
      const cur = map.get(q.clientId) ?? { quotes: 0, invoices: 0, projects: 0, faturado: 0 };
      cur.quotes += 1; cur.faturado += q.total; map.set(q.clientId, cur);
    }
    for (const i of invoices) {
      const cur = map.get(i.clientId) ?? { quotes: 0, invoices: 0, projects: 0, faturado: 0 };
      cur.invoices += 1; cur.faturado += i.total; map.set(i.clientId, cur);
    }
    for (const p of projects) {
      const cur = map.get(p.clientId) ?? { quotes: 0, invoices: 0, projects: 0, faturado: 0 };
      cur.projects += 1; map.set(p.clientId, cur);
    }
    return map;
  }, [clients, invoices, projects, quotes]);

  const filteredClients = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.name, c.email, c.phone, c.address].some((f) => f.toLowerCase().includes(q))
    );
  }, [clients, query]);

  if (loading) {
    return (
      <View style={sharedStyles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={sharedStyles.helper}>Carregando clientes...</Text>
      </View>
    );
  }

  return (
    <>
      <ClientCreateModal visible={createVisible} onClose={() => setCreateVisible(false)} onSaved={load} />
      <ListScreen
        title="Clientes"
        data={filteredClients}
        emptyText="Nenhum cliente encontrado."
        onRefresh={load}
        action={
          <View style={sharedStyles.actionRow}>
            <SecondaryButton label="Atualizar" onPress={load} />
            <PrimaryButton label="Novo cliente" onPress={() => setCreateVisible(true)} />
          </View>
        }
        header={
          <View style={sharedStyles.listHeaderBlock}>
            <View style={sharedStyles.grid2}>
              <StatCard label="Clientes" value={String(clients.length)} iconLabel="👥" />
              <StatCard label="Orçamentos" value={String(quotes.length)} iconLabel="🧾" />
              <StatCard label="Faturas" value={String(invoices.length)} iconLabel="💳" />
              <StatCard label="Projetos" value={String(projects.length)} iconLabel="✅" />
            </View>
            <SearchField value={query} onChangeText={setQuery} placeholder="Buscar cliente por nome, e-mail, telefone ou endereço" />
          </View>
        }
        renderItem={({ item }) => {
          const info = metrics.get(item.id) ?? { quotes: 0, invoices: 0, projects: 0, faturado: 0 };
          return (
            <Card>
              <Text style={sharedStyles.cardTitle}>{item.name}</Text>
              <Text style={sharedStyles.cardText}>{item.email}</Text>
              <Text style={sharedStyles.cardText}>{item.phone}</Text>
              <Text style={sharedStyles.cardText}>{item.address}</Text>
              <View style={sharedStyles.badgeRow}>
                <Badge label={`Orçamentos ${info.quotes}`} />
                <Badge label={`Faturas ${info.invoices}`} />
                <Badge label={`Projetos ${info.projects}`} />
              </View>
            </Card>
          );
        }}
      />
    </>
  );
}
