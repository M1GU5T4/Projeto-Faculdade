import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LogOut } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_URL, authService, clientService, expenseService, invoiceService, projectService, quoteService, settingsService, stockService } from './services/api';
import { Client, Expense, Invoice, InvoiceStatus, Project, ProjectStatus, Quote, QuoteStatus, StockCategory, StockItem } from './types';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TOKEN_KEY = 'token';
const USER_KEY = 'currentUser';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#f5f7fb',
    card: '#ffffff',
    text: '#0f172a',
    border: '#e2e8f0',
    primary: '#2563eb',
  },
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(value));
}

function formatStatus(value: string) {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function safeErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Erro inesperado.';
}

function statusTone(status: string) {
  const normalized = status.toUpperCase();

  if ([QuoteStatus.Aprovado, InvoiceStatus.Pago, ProjectStatus.EmAndamento, ProjectStatus.Concluido].includes(normalized as never)) {
    return { backgroundColor: '#dcfce7', borderColor: '#86efac', color: '#166534' };
  }

  if ([QuoteStatus.Enviado, InvoiceStatus.Pendente, ProjectStatus.NaoIniciado, QuoteStatus.Rascunho].includes(normalized as never)) {
    return { backgroundColor: '#fef3c7', borderColor: '#fde68a', color: '#92400e' };
  }

  if ([QuoteStatus.Rejeitado, InvoiceStatus.Atrasado, InvoiceStatus.Cancelado].includes(normalized as never)) {
    return { backgroundColor: '#fee2e2', borderColor: '#fecaca', color: '#991b1b' };
  }

  return { backgroundColor: '#e2e8f0', borderColor: '#cbd5e1', color: '#334155' };
}

function Badge({ label }: { label: string }) {
  const tone = statusTone(label);

  return (
    <View style={[styles.badge, { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor }]}>
      <Text style={[styles.badgeText, { color: tone.color }]}>{formatStatus(label)}</Text>
    </View>
  );
}

function ScreenShell({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{title}</Text>
        {action}
      </View>
      {children}
    </SafeAreaView>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

function StatCard({ label, value, iconLabel }: { label: string; value: string; iconLabel: string }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Text style={styles.statIconText}>{iconLabel}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

function SearchField({ value, onChangeText, placeholder }: { value: string; onChangeText: (value: string) => void; placeholder: string }) {
  return <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#94a3b8" style={styles.searchInput} />;
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.primaryButton, disabled && styles.buttonDisabled, pressed && !disabled && styles.buttonPressed]}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.secondaryButton, disabled && styles.buttonDisabled, pressed && !disabled && styles.buttonPressed]}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function useAppSession() {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      const rawUser = await AsyncStorage.getItem(USER_KEY);
      const parsedUser = rawUser ? JSON.parse(rawUser) : null;
      const isJwt = !!token && token.split('.').length === 3;

      if (token && !isJwt) {
        await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
        setAuthenticated(false);
        setUser(null);
        setLoading(false);
        return;
      }

      setAuthenticated(Boolean(token));
      setUser(parsedUser);
      setLoading(false);
    })();
  }, []);

  return { loading, authenticated, setAuthenticated, user, setUser };
}

async function loadPdfAndShare(quote: Quote) {
  const token = await AsyncStorage.getItem(TOKEN_KEY);

  if (!token) {
    throw new Error('Sessão expirada.');
  }

  const targetDirectory = Paths.cache ?? Paths.document;

  if (!targetDirectory) {
    throw new Error('Não foi possível preparar o arquivo do PDF.');
  }

  const result = await File.downloadFileAsync(`${API_URL}/quotes/${quote.id}/pdf`, new File(targetDirectory, `orcamento-${quote.quoteNumber}.pdf`), {
    headers: { Authorization: `Bearer ${token}` },
    idempotent: true,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(result.uri, { mimeType: 'application/pdf' });
    return;
  }

  Alert.alert('PDF gerado', `Arquivo salvo em: ${result.uri}`);
}

type ClientFormState = {
  name: string;
  email: string;
  phone: string;
  address: string;
};

type QuoteLineItemDraft = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

type QuoteFormState = {
  quoteNumber: string;
  clientId: string;
  issueDate: string;
  expiryDate: string;
  tax: string;
  notes: string;
  lineItems: QuoteLineItemDraft[];
};

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createQuoteLineItemDraft() {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    description: '',
    quantity: '1',
    unitPrice: '0',
  };
}

function createDefaultClientForm(): ClientFormState {
  return {
    name: '',
    email: '',
    phone: '',
    address: '',
  };
}

function createDefaultQuoteForm(clients: Client[]): QuoteFormState {
  const today = toDateInputValue(new Date());
  const expiry = toDateInputValue(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

  return {
    quoteNumber: `ORC-${Date.now()}`,
    clientId: clients[0]?.id ?? '',
    issueDate: today,
    expiryDate: expiry,
    tax: '0',
    notes: '',
    lineItems: [createQuoteLineItemDraft()],
  };
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
  multiline?: boolean;
}) {
  return (
    <View style={styles.formField}>
      <Text style={styles.formLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.formInput, multiline && styles.formInputMultiline]}
      />
    </View>
  );
}

function ClientCreateModal({
  visible,
  onClose,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [form, setForm] = useState<ClientFormState>(createDefaultClientForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm(createDefaultClientForm());
      setSaving(false);
    }
  }, [visible]);

  const submit = async () => {
    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    const address = form.address.trim();

    if (!name || !email || !phone || !address) {
      Alert.alert('Campos obrigatórios', 'Preencha nome, e-mail, telefone e endereço.');
      return;
    }

    setSaving(true);
    try {
      await clientService.create({ name, email, phone, address });
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
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Novo cliente</Text>
            <SecondaryButton label="Fechar" onPress={onClose} />
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <FormField label="Nome" value={form.name} onChangeText={(name) => setForm((current) => ({ ...current, name }))} placeholder="Nome do cliente" />
            <FormField label="E-mail" value={form.email} onChangeText={(email) => setForm((current) => ({ ...current, email }))} placeholder="cliente@empresa.com" keyboardType="email-address" />
            <FormField label="Telefone" value={form.phone} onChangeText={(phone) => setForm((current) => ({ ...current, phone }))} placeholder="(00) 00000-0000" keyboardType="phone-pad" />
            <FormField label="Endereço" value={form.address} onChangeText={(address) => setForm((current) => ({ ...current, address }))} placeholder="Rua, número, bairro, cidade" multiline />
          </ScrollView>

          <View style={styles.modalActions}>
            <SecondaryButton label="Cancelar" onPress={onClose} />
            <PrimaryButton label={saving ? 'Salvando...' : 'Criar cliente'} onPress={() => void submit()} disabled={saving} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function QuoteCreateModal({
  visible,
  clients,
  onClose,
  onSaved,
}: {
  visible: boolean;
  clients: Client[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [form, setForm] = useState<QuoteFormState>(createDefaultQuoteForm(clients));
  const [clientQuery, setClientQuery] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm(createDefaultQuoteForm(clients));
      setClientQuery('');
      setSaving(false);
    }
  }, [visible, clients]);

  const filteredClients = useMemo(() => {
    const normalizedQuery = clientQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return clients;
    }

    return clients.filter((client) => [client.name, client.email, client.phone].some((field) => field.toLowerCase().includes(normalizedQuery)));
  }, [clientQuery, clients]);

  const updateLineItem = (id: string, field: keyof Omit<QuoteLineItemDraft, 'id'>, value: string) => {
    setForm((current) => ({
      ...current,
      lineItems: current.lineItems.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    }));
  };

  const addLineItem = () => {
    setForm((current) => ({
      ...current,
      lineItems: [...current.lineItems, createQuoteLineItemDraft()],
    }));
  };

  const removeLineItem = (id: string) => {
    setForm((current) => ({
      ...current,
      lineItems: current.lineItems.length > 1 ? current.lineItems.filter((item) => item.id !== id) : current.lineItems,
    }));
  };

  const submit = async () => {
    const quoteNumber = form.quoteNumber.trim();
    const clientId = form.clientId.trim();
    const tax = Number(form.tax || 0);
    const lineItems = form.lineItems
      .map((item) => ({
        description: item.description.trim(),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      }))
      .filter((item) => item.description && item.quantity > 0 && item.unitPrice > 0);

    if (!clients.length) {
      Alert.alert('Sem clientes', 'Cadastre um cliente antes de criar um orçamento.');
      return;
    }

    if (!quoteNumber || !clientId) {
      Alert.alert('Campos obrigatórios', 'Preencha número do orçamento e cliente.');
      return;
    }

    if (!lineItems.length) {
      Alert.alert('Itens obrigatórios', 'Adicione ao menos um item válido ao orçamento.');
      return;
    }

    setSaving(true);
    try {
      await quoteService.create({
        quoteNumber,
        clientId,
        issueDate: form.issueDate,
        expiryDate: form.expiryDate,
        tax: Number.isFinite(tax) ? tax : 0,
        notes: form.notes.trim() || null,
        status: QuoteStatus.Rascunho,
        lineItems: lineItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
        })),
      });
      await onSaved();
      onClose();
      Alert.alert('Sucesso', 'Orçamento criado com sucesso.');
    } catch (error) {
      Alert.alert('Erro ao criar orçamento', safeErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Novo orçamento</Text>
            <SecondaryButton label="Fechar" onPress={onClose} />
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <FormField label="Número" value={form.quoteNumber} onChangeText={(quoteNumber) => setForm((current) => ({ ...current, quoteNumber }))} placeholder="ORC-123456" />
            <FormField label="Busca de cliente" value={clientQuery} onChangeText={setClientQuery} placeholder="Filtrar clientes" />
            <Text style={styles.formLabel}>Cliente</Text>
            <View style={styles.clientPickerList}>
              {filteredClients.length === 0 ? (
                <Text style={styles.helper}>Nenhum cliente encontrado.</Text>
              ) : (
                filteredClients.map((client) => {
                  const selected = form.clientId === client.id;
                  return (
                    <Pressable
                      key={client.id}
                      onPress={() => setForm((current) => ({ ...current, clientId: client.id }))}
                      style={[styles.clientPickerItem, selected && styles.clientPickerItemSelected]}
                    >
                      <Text style={styles.clientPickerName}>{client.name}</Text>
                      <Text style={styles.clientPickerInfo}>{client.email}</Text>
                    </Pressable>
                  );
                })
              )}
            </View>
            <View style={styles.formRow}>
              <View style={styles.formColumn}>
                <FormField label="Emissão" value={form.issueDate} onChangeText={(issueDate) => setForm((current) => ({ ...current, issueDate }))} placeholder="YYYY-MM-DD" />
              </View>
              <View style={styles.formColumn}>
                <FormField label="Validade" value={form.expiryDate} onChangeText={(expiryDate) => setForm((current) => ({ ...current, expiryDate }))} placeholder="YYYY-MM-DD" />
              </View>
            </View>
            <FormField label="Taxa" value={form.tax} onChangeText={(tax) => setForm((current) => ({ ...current, tax }))} placeholder="0" keyboardType="decimal-pad" />
            <FormField label="Observações" value={form.notes} onChangeText={(notes) => setForm((current) => ({ ...current, notes }))} placeholder="Detalhes adicionais" multiline />

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.formLabel}>Itens</Text>
              <SecondaryButton label="Adicionar item" onPress={addLineItem} />
            </View>

            {form.lineItems.map((item, index) => (
              <Card key={item.id} style={styles.lineItemCard}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.cardTitle}>Item {index + 1}</Text>
                  {form.lineItems.length > 1 ? <SecondaryButton label="Remover" onPress={() => removeLineItem(item.id)} /> : null}
                </View>
                <FormField label="Descrição" value={item.description} onChangeText={(description) => updateLineItem(item.id, 'description', description)} placeholder="Descrição do serviço ou produto" />
                <View style={styles.formRow}>
                  <View style={styles.formColumn}>
                    <FormField label="Quantidade" value={item.quantity} onChangeText={(quantity) => updateLineItem(item.id, 'quantity', quantity)} placeholder="1" keyboardType="decimal-pad" />
                  </View>
                  <View style={styles.formColumn}>
                    <FormField label="Preço unitário" value={item.unitPrice} onChangeText={(unitPrice) => updateLineItem(item.id, 'unitPrice', unitPrice)} placeholder="0" keyboardType="decimal-pad" />
                  </View>
                </View>
              </Card>
            ))}
          </ScrollView>

          <View style={styles.modalActions}>
            <SecondaryButton label="Cancelar" onPress={onClose} />
            <PrimaryButton label={saving ? 'Salvando...' : 'Criar orçamento'} onPress={() => void submit()} disabled={saving} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function DashboardScreen({ navigation }: any) {
  const [clients, setClients] = useState<Client[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [clientsData, quotesData, invoicesData, projectsData, expensesData] = await Promise.all([
          clientService.getAll(),
          quoteService.getAll(),
          invoiceService.getAll(),
          projectService.getAll(),
          expenseService.getAll(),
        ]);

        setClients(clientsData);
        setQuotes(quotesData);
        setInvoices(invoicesData);
        setProjects(projectsData);
        setExpenses(expensesData);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const faturado = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
    const recebido = invoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0);
    const emAberto = invoices.reduce((sum, invoice) => sum + Math.max(invoice.total - invoice.amountPaid, 0), 0);
    const despesasTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const saldo = recebido - despesasTotal;
    const orcamentosAprovados = quotes.filter((quote) => quote.status === QuoteStatus.Aprovado).length;
    const projetosAtivos = projects.filter((project) => project.status === ProjectStatus.EmAndamento).length;

    return { faturado, recebido, emAberto, despesasTotal, saldo, orcamentosAprovados, projetosAtivos };
  }, [expenses, invoices, projects, quotes]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.helper}>Carregando dados...</Text></View>;
  }

  return (
    <ScreenShell
      title="Painel"
      action={<SecondaryButton label="Financeiro" onPress={() => navigation.navigate('Financeiro')} />}
    >
      <ScrollView contentContainerStyle={styles.contentPad}>
        <View style={styles.grid2}>
          <StatCard label="Faturado" value={formatCurrency(stats.faturado)} iconLabel="💰" />
          <StatCard label="Recebido" value={formatCurrency(stats.recebido)} iconLabel="✅" />
          <StatCard label="Em aberto" value={formatCurrency(stats.emAberto)} iconLabel="⏳" />
          <StatCard label="Despesas" value={formatCurrency(stats.despesasTotal)} iconLabel="💸" />
          <StatCard label="Saldo" value={formatCurrency(stats.saldo)} iconLabel="📊" />
          <StatCard label="Clientes" value={String(clients.length)} iconLabel="👥" />
        </View>

        <Card>
          <Text style={styles.cardTitle}>Acesso rápido</Text>
          <View style={styles.chipRow}>
            <SecondaryButton label="Clientes" onPress={() => navigation.navigate('Clientes')} />
            <SecondaryButton label="Orçamentos" onPress={() => navigation.navigate('Orçamentos')} />
            <SecondaryButton label="Faturas" onPress={() => navigation.navigate('Faturas')} />
            <SecondaryButton label="Despesas" onPress={() => navigation.navigate('Despesas')} />
          </View>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Módulos principais</Text>
          <View style={styles.moduleGrid}>
            {['Clientes', 'Orçamentos', 'Financeiro', 'Faturas', 'Projetos', 'Despesas', 'Estoque', 'Configurações'].map((name) => (
              <View key={name} style={styles.modulePill}>
                <Text style={styles.modulePillText}>{name}</Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </ScreenShell>
  );
}

function ListScreen<T extends { id: string }>({
  title,
  data,
  renderItem,
  emptyText,
  onRefresh,
  header,
  footer,
  action,
}: {
  title: string;
  data: T[];
  renderItem: ({ item }: { item: T }) => React.ReactElement;
  emptyText: string;
  onRefresh?: () => Promise<void> | void;
  header?: React.ReactElement | null;
  footer?: React.ReactElement | null;
  action?: React.ReactNode;
}) {
  const [refreshing, setRefreshing] = useState(false);

  return (
    <ScreenShell title={title} action={action}>
      <FlatList
        contentContainerStyle={styles.listPad}
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={<Text style={styles.empty}>{emptyText}</Text>}
        ListFooterComponent={footer}
        refreshing={refreshing}
        onRefresh={async () => {
          if (!onRefresh) {
            return;
          }

          setRefreshing(true);
          try {
            await onRefresh();
          } finally {
            setRefreshing(false);
          }
        }}
      />
    </ScreenShell>
  );
}

function ClientsScreen() {
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
      const [clientsData, quotesData, invoicesData, projectsData] = await Promise.all([
        clientService.getAll(),
        quoteService.getAll(),
        invoiceService.getAll(),
        projectService.getAll(),
      ]);

      setClients(clientsData);
      setQuotes(quotesData);
      setInvoices(invoicesData);
      setProjects(projectsData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const metrics = useMemo(() => {
    const map = new Map<string, { quotes: number; invoices: number; projects: number; faturado: number }>();

    for (const client of clients) {
      map.set(client.id, { quotes: 0, invoices: 0, projects: 0, faturado: 0 });
    }

    for (const quote of quotes) {
      const current = map.get(quote.clientId) ?? { quotes: 0, invoices: 0, projects: 0, faturado: 0 };
      current.quotes += 1;
      current.faturado += quote.total;
      map.set(quote.clientId, current);
    }

    for (const invoice of invoices) {
      const current = map.get(invoice.clientId) ?? { quotes: 0, invoices: 0, projects: 0, faturado: 0 };
      current.invoices += 1;
      current.faturado += invoice.total;
      map.set(invoice.clientId, current);
    }

    for (const project of projects) {
      const current = map.get(project.clientId) ?? { quotes: 0, invoices: 0, projects: 0, faturado: 0 };
      current.projects += 1;
      map.set(project.clientId, current);
    }

    return map;
  }, [clients, invoices, projects, quotes]);

  const filteredClients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return clients;
    }

    return clients.filter((client) => {
      return [client.name, client.email, client.phone, client.address].some((field) => field.toLowerCase().includes(normalizedQuery));
    });
  }, [clients, query]);

  const totalQuotes = quotes.length;
  const totalInvoices = invoices.length;
  const totalProjects = projects.length;

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.helper}>Carregando clientes...</Text></View>;
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
          <View style={styles.actionRow}>
            <SecondaryButton label="Atualizar" onPress={load} />
            <PrimaryButton label="Novo cliente" onPress={() => setCreateVisible(true)} />
          </View>
        }
      header={
        <View style={styles.listHeaderBlock}>
          <View style={styles.grid2}>
            <StatCard label="Clientes" value={String(clients.length)} iconLabel="👥" />
            <StatCard label="Orçamentos" value={String(totalQuotes)} iconLabel="🧾" />
            <StatCard label="Faturas" value={String(totalInvoices)} iconLabel="💳" />
            <StatCard label="Projetos" value={String(totalProjects)} iconLabel="✅" />
          </View>
          <SearchField value={query} onChangeText={setQuery} placeholder="Buscar cliente por nome, e-mail, telefone ou endereço" />
        </View>
      }
      renderItem={({ item }) => {
        const info = metrics.get(item.id) ?? { quotes: 0, invoices: 0, projects: 0, faturado: 0 };

        return (
          <Card>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardText}>{item.email}</Text>
            <Text style={styles.cardText}>{item.phone}</Text>
            <Text style={styles.cardText}>{item.address}</Text>
            <View style={styles.badgeRow}>
              <Badge label={`Orçamentos ${info.quotes}`} />
              <Badge label={`Faturas ${info.invoices}`} />
              <Badge label={`Projetos ${info.projects}`} />
            </View>
            <Text style={styles.helper}>Faturado relacionado: {formatCurrency(info.faturado)}</Text>
          </Card>
        );
      }}
      />
    </>
  );
}

function downloadDisabledReason(quote: Quote) {
  if (!quote.id) {
    return 'Orçamento inválido.';
  }

  return '';
}

function QuotesScreen() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | QuoteStatus>(('TODOS' as const));
  const [createVisible, setCreateVisible] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [quotesData, clientsData, projectsData] = await Promise.all([
        quoteService.getAll(),
        clientService.getAll(),
        projectService.getAll(),
      ]);

      setQuotes(quotesData);
      setClients(clientsData);
      setProjects(projectsData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const clientNameById = useMemo(() => {
    return new Map(clients.map((client) => [client.id, client.name]));
  }, [clients]);

  const projectQuoteIds = useMemo(() => new Set(projects.map((project) => project.quoteId).filter(Boolean) as string[]), [projects]);

  const filteredQuotes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return quotes.filter((quote) => {
      const statusMatches = statusFilter === 'TODOS' || quote.status === statusFilter;
      const textMatches = !normalizedQuery
        || [quote.quoteNumber, clientNameById.get(quote.clientId) ?? '', quote.notes ?? ''].some((field) => field.toLowerCase().includes(normalizedQuery));

      return statusMatches && textMatches;
    });
  }, [clientNameById, query, quotes, statusFilter]);

  const summary = useMemo(() => {
    return {
      total: quotes.length,
      approved: quotes.filter((quote) => quote.status === QuoteStatus.Aprovado).length,
      sent: quotes.filter((quote) => quote.status === QuoteStatus.Enviado).length,
      draft: quotes.filter((quote) => quote.status === QuoteStatus.Rascunho).length,
    };
  }, [quotes]);

  const convertQuote = async (quote: Quote) => {
    if (quote.status !== QuoteStatus.Aprovado) {
      Alert.alert('Orçamento não aprovado', 'Só é possível converter orçamentos aprovados em projeto.');
      return;
    }

    if (projectQuoteIds.has(quote.id)) {
      Alert.alert('Projeto existente', 'Este orçamento já foi convertido em projeto.');
      return;
    }

    Alert.alert('Converter orçamento', `Criar um projeto a partir de ${quote.quoteNumber}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Converter',
        onPress: async () => {
          try {
            await quoteService.convertToProject(quote.id, {});
            await load();
            Alert.alert('Sucesso', 'Orçamento convertido em projeto.');
          } catch (error) {
            Alert.alert('Erro', safeErrorMessage(error));
          }
        },
      },
    ]);
  };

  const sharePdf = async (quote: Quote) => {
    try {
      await loadPdfAndShare(quote);
    } catch (error) {
      Alert.alert('Erro ao gerar PDF', safeErrorMessage(error));
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.helper}>Carregando orçamentos...</Text></View>;
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
          <View style={styles.actionRow}>
            <SecondaryButton label="Atualizar" onPress={load} />
            <PrimaryButton label="Novo orçamento" onPress={() => setCreateVisible(true)} />
          </View>
        }
      header={
        <View style={styles.listHeaderBlock}>
          <View style={styles.grid2}>
            <StatCard label="Total" value={String(summary.total)} iconLabel="🧾" />
            <StatCard label="Aprovados" value={String(summary.approved)} iconLabel="✅" />
            <StatCard label="Enviados" value={String(summary.sent)} iconLabel="📤" />
            <StatCard label="Rascunhos" value={String(summary.draft)} iconLabel="📝" />
          </View>
          <SearchField value={query} onChangeText={setQuery} placeholder="Buscar por número, cliente ou observação" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
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
        const projectLinked = projectQuoteIds.has(item.id);

        return (
          <Card>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.quoteNumber}</Text>
                <Text style={styles.cardText}>{clientName}</Text>
              </View>
              <Badge label={item.status} />
            </View>

            <View style={styles.smallGrid}>
              <View style={styles.smallPill}><Text style={styles.smallPillLabel}>Emissão</Text><Text style={styles.smallPillValue}>{formatDate(item.issueDate)}</Text></View>
              <View style={styles.smallPill}><Text style={styles.smallPillLabel}>Validade</Text><Text style={styles.smallPillValue}>{formatDate(item.expiryDate)}</Text></View>
              <View style={styles.smallPill}><Text style={styles.smallPillLabel}>Total</Text><Text style={styles.smallPillValue}>{formatCurrency(item.total)}</Text></View>
            </View>

            {item.notes ? <Text style={styles.helper}>{item.notes}</Text> : null}

            <View style={styles.actionRow}>
              <SecondaryButton label="PDF" onPress={() => void sharePdf(item)} />
              <PrimaryButton label={projectLinked ? 'Já virou projeto' : 'Converter'} disabled={projectLinked || item.status !== QuoteStatus.Aprovado} onPress={() => void convertQuote(item)} />
            </View>
          </Card>
        );
      }}
      />
    </>
  );
}

function InvoicesScreen() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | InvoiceStatus>('TODOS');

  const load = async () => {
    setLoading(true);
    try {
      const [invoicesData, clientsData] = await Promise.all([invoiceService.getAll(), clientService.getAll()]);
      setInvoices(invoicesData);
      setClients(clientsData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const clientNameById = useMemo(() => new Map(clients.map((client) => [client.id, client.name])), [clients]);

  const filteredInvoices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const statusMatches = statusFilter === 'TODOS' || invoice.status === statusFilter;
      const textMatches = !normalizedQuery
        || [invoice.invoiceNumber, clientNameById.get(invoice.clientId) ?? ''].some((field) => field.toLowerCase().includes(normalizedQuery));

      return statusMatches && textMatches;
    });
  }, [clientNameById, invoices, query, statusFilter]);

  const summary = useMemo(() => {
    return {
      total: invoices.length,
      paid: invoices.filter((invoice) => invoice.status === InvoiceStatus.Pago).length,
      overdue: invoices.filter((invoice) => invoice.status === InvoiceStatus.Atrasado).length,
      openValue: invoices.reduce((sum, invoice) => sum + Math.max(invoice.total - invoice.amountPaid, 0), 0),
    };
  }, [invoices]);

  const markAsPaid = async (invoice: Invoice) => {
    Alert.alert('Baixar fatura', `Marcar ${invoice.invoiceNumber} como paga?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Marcar como paga',
        onPress: async () => {
          try {
            await invoiceService.markAsPaid(invoice.id, invoice.total);
            await load();
            Alert.alert('Sucesso', 'Fatura marcada como paga.');
          } catch (error) {
            Alert.alert('Erro', safeErrorMessage(error));
          }
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.helper}>Carregando faturas...</Text></View>;
  }

  return (
    <ListScreen
      title="Faturas"
      data={filteredInvoices}
      emptyText="Nenhuma fatura encontrada."
      onRefresh={load}
      action={<SecondaryButton label="Atualizar" onPress={load} />}
      header={
        <View style={styles.listHeaderBlock}>
          <View style={styles.grid2}>
            <StatCard label="Faturas" value={String(summary.total)} iconLabel="💳" />
            <StatCard label="Pagas" value={String(summary.paid)} iconLabel="✅" />
            <StatCard label="Atrasadas" value={String(summary.overdue)} iconLabel="⛔" />
            <StatCard label="Em aberto" value={formatCurrency(summary.openValue)} iconLabel="💰" />
          </View>
          <SearchField value={query} onChangeText={setQuery} placeholder="Buscar por número ou cliente" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
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
        const paid = item.amountPaid;

        return (
          <Card>
            <View style={styles.cardHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.invoiceNumber}</Text>
                <Text style={styles.cardText}>{clientName}</Text>
              </View>
              <Badge label={item.status} />
            </View>

            <View style={styles.smallGrid}>
              <View style={styles.smallPill}><Text style={styles.smallPillLabel}>Emissão</Text><Text style={styles.smallPillValue}>{formatDate(item.issueDate)}</Text></View>
              <View style={styles.smallPill}><Text style={styles.smallPillLabel}>Vencimento</Text><Text style={styles.smallPillValue}>{formatDate(item.dueDate)}</Text></View>
              <View style={styles.smallPill}><Text style={styles.smallPillLabel}>Pago</Text><Text style={styles.smallPillValue}>{formatCurrency(paid)}</Text></View>
              <View style={styles.smallPill}><Text style={styles.smallPillLabel}>Em aberto</Text><Text style={styles.smallPillValue}>{formatCurrency(remaining)}</Text></View>
            </View>

            <View style={styles.actionRow}>
              <SecondaryButton label="Detalhes" onPress={() => Alert.alert('Fatura', `${item.invoiceNumber}\nTotal: ${formatCurrency(item.total)}`)} />
              {item.status !== InvoiceStatus.Pago ? <PrimaryButton label="Marcar como paga" onPress={() => void markAsPaid(item)} /> : null}
            </View>
          </Card>
        );
      }}
    />
  );
}

function FinanceiroScreen({ navigation }: any) {
  const [clients, setClients] = useState<Client[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [clientsData, quotesData, invoicesData, projectsData, expensesData] = await Promise.all([
        clientService.getAll(),
        quoteService.getAll(),
        invoiceService.getAll(),
        projectService.getAll(),
        expenseService.getAll(),
      ]);

      setClients(clientsData);
      setQuotes(quotesData);
      setInvoices(invoicesData);
      setProjects(projectsData);
      setExpenses(expensesData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const metrics = useMemo(() => {
    const faturado = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
    const recebido = invoices.reduce((sum, invoice) => sum + invoice.amountPaid, 0);
    const emAberto = invoices.reduce((sum, invoice) => sum + Math.max(invoice.total - invoice.amountPaid, 0), 0);
    const despesasTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const saldo = recebido - despesasTotal;
    const aprovados = quotes.filter((quote) => quote.status === QuoteStatus.Aprovado).length;
    const atrasadas = invoices.filter((invoice) => invoice.status === InvoiceStatus.Atrasado).length;
    const projetosAtivos = projects.filter((project) => project.status === ProjectStatus.EmAndamento).length;
    const currentMonth = new Date();

    const isCurrentMonth = (dateString: string) => {
      const date = new Date(dateString);
      return date.getFullYear() === currentMonth.getFullYear() && date.getMonth() === currentMonth.getMonth();
    };

    const faturadoMes = invoices.filter((invoice) => isCurrentMonth(invoice.issueDate)).reduce((sum, invoice) => sum + invoice.total, 0);
    const despesasMes = expenses.filter((expense) => isCurrentMonth(expense.date)).reduce((sum, expense) => sum + expense.amount, 0);

    return { faturado, recebido, emAberto, despesasTotal, saldo, aprovados, atrasadas, projetosAtivos, faturadoMes, despesasMes };
  }, [expenses, invoices, projects, quotes]);

  const clientNameById = useMemo(() => new Map(clients.map((client) => [client.id, client.name])), [clients]);

  const pendingInvoices = useMemo(() => {
    return [...invoices]
      .filter((invoice) => invoice.status !== InvoiceStatus.Pago)
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .slice(0, 4);
  }, [invoices]);

  const recentExpenses = useMemo(() => {
    return [...expenses]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4);
  }, [expenses]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.helper}>Carregando financeiro...</Text></View>;
  }

  return (
    <ScreenShell
      title="Financeiro"
      action={<SecondaryButton label="Atualizar" onPress={load} />}
    >
      <ScrollView contentContainerStyle={styles.contentPad}>
        <View style={styles.grid2}>
          <StatCard label="Faturado" value={formatCurrency(metrics.faturado)} iconLabel="💰" />
          <StatCard label="Recebido" value={formatCurrency(metrics.recebido)} iconLabel="✅" />
          <StatCard label="Em aberto" value={formatCurrency(metrics.emAberto)} iconLabel="⏳" />
          <StatCard label="Despesas" value={formatCurrency(metrics.despesasTotal)} iconLabel="💸" />
          <StatCard label="Saldo" value={formatCurrency(metrics.saldo)} iconLabel="📊" />
          <StatCard label="Atrasadas" value={String(metrics.atrasadas)} iconLabel="⚠️" />
        </View>

        <Card>
          <Text style={styles.cardTitle}>Resumo do mês</Text>
          <View style={styles.grid2}>
            <StatCard label="Receita do mês" value={formatCurrency(metrics.faturadoMes)} iconLabel="📥" />
            <StatCard label="Despesas do mês" value={formatCurrency(metrics.despesasMes)} iconLabel="📤" />
          </View>
          <View style={styles.chipRow}>
            <SecondaryButton label="Clientes" onPress={() => navigation.navigate('Clientes')} />
            <SecondaryButton label="Orçamentos" onPress={() => navigation.navigate('Orçamentos')} />
            <SecondaryButton label="Faturas" onPress={() => navigation.navigate('Faturas')} />
            <SecondaryButton label="Despesas" onPress={() => navigation.navigate('Despesas')} />
          </View>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Indicadores adicionais</Text>
          <View style={styles.badgeRow}>
            <Badge label={`Orçamentos aprovados ${metrics.aprovados}`} />
            <Badge label={`Projetos ativos ${metrics.projetosAtivos}`} />
            <Badge label={`Clientes ${clients.length}`} />
          </View>
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Contas a receber</Text>
          {pendingInvoices.length === 0 ? (
            <Text style={styles.helper}>Nenhuma fatura pendente.</Text>
          ) : (
            pendingInvoices.map((invoice) => {
              const remaining = Math.max(invoice.total - invoice.amountPaid, 0);
              const clientName = clientNameById.get(invoice.clientId) ?? 'Cliente não encontrado';

              return (
                <View key={invoice.id} style={styles.financeRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{invoice.invoiceNumber}</Text>
                    <Text style={styles.cardText}>{clientName}</Text>
                    <Text style={styles.helper}>Vencimento: {formatDate(invoice.dueDate)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Badge label={invoice.status} />
                    <Text style={styles.cardText}>{formatCurrency(remaining)}</Text>
                  </View>
                </View>
              );
            })
          )}
        </Card>

        <Card>
          <Text style={styles.cardTitle}>Despesas recentes</Text>
          {recentExpenses.length === 0 ? (
            <Text style={styles.helper}>Nenhuma despesa cadastrada.</Text>
          ) : (
            recentExpenses.map((expense) => (
              <View key={expense.id} style={styles.financeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{expense.description}</Text>
                  <Text style={styles.cardText}>{expense.category}</Text>
                  <Text style={styles.helper}>{formatDate(expense.date)}</Text>
                </View>
                <Text style={styles.cardText}>{formatCurrency(expense.amount)}</Text>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </ScreenShell>
  );
}

function ProjectsScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [projectsData, clientsData] = await Promise.all([projectService.getAll(), clientService.getAll()]);
      setProjects(projectsData);
      setClients(clientsData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const clientNameById = useMemo(() => new Map(clients.map((client) => [client.id, client.name])), [clients]);

  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return projects;
    }

    return projects.filter((project) => [project.name, project.description ?? '', clientNameById.get(project.clientId) ?? ''].some((field) => field.toLowerCase().includes(normalizedQuery)));
  }, [clientNameById, projects, query]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.helper}>Carregando projetos...</Text></View>;
  }

  return (
    <ListScreen
      title="Projetos"
      data={filteredProjects}
      emptyText="Nenhum projeto encontrado."
      onRefresh={load}
      action={<SecondaryButton label="Atualizar" onPress={load} />}
      header={
        <View style={styles.listHeaderBlock}>
          <SearchField value={query} onChangeText={setQuery} placeholder="Buscar projeto por nome, cliente ou descrição" />
        </View>
      }
      renderItem={({ item }) => (
        <Card>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardText}>{clientNameById.get(item.clientId) ?? 'Cliente não encontrado'}</Text>
          {item.description ? <Text style={styles.helper}>{item.description}</Text> : null}
          <View style={styles.smallGrid}>
            <View style={styles.smallPill}><Text style={styles.smallPillLabel}>Status</Text><Text style={styles.smallPillValue}>{formatStatus(item.status)}</Text></View>
            <View style={styles.smallPill}><Text style={styles.smallPillLabel}>Progresso</Text><Text style={styles.smallPillValue}>{item.progress}%</Text></View>
            <View style={styles.smallPill}><Text style={styles.smallPillLabel}>Orçamento</Text><Text style={styles.smallPillValue}>{formatCurrency(item.budget ?? 0)}</Text></View>
          </View>
        </Card>
      )}
    />
  );
}

function ExpensesScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const expensesData = await expenseService.getAll();
      setExpenses(expensesData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredExpenses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return expenses;
    }

    return expenses.filter((expense) => [expense.description, expense.category].some((field) => field.toLowerCase().includes(normalizedQuery)));
  }, [expenses, query]);

  const total = useMemo(() => expenses.reduce((sum, expense) => sum + expense.amount, 0), [expenses]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.helper}>Carregando despesas...</Text></View>;
  }

  return (
    <ListScreen
      title="Despesas"
      data={filteredExpenses}
      emptyText="Nenhuma despesa encontrada."
      onRefresh={load}
      action={<SecondaryButton label="Atualizar" onPress={load} />}
      header={
        <View style={styles.listHeaderBlock}>
          <StatCard label="Total" value={formatCurrency(total)} iconLabel="💸" />
          <SearchField value={query} onChangeText={setQuery} placeholder="Buscar por descrição ou categoria" />
        </View>
      }
      renderItem={({ item }) => (
        <Card>
          <Text style={styles.cardTitle}>{item.description}</Text>
          <Text style={styles.cardText}>{item.category}</Text>
          <Text style={styles.helper}>{formatDate(item.date)}</Text>
          <Text style={styles.cardText}>{formatCurrency(item.amount)}</Text>
        </Card>
      )}
    />
  );
}

function StockScreen() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [categories, setCategories] = useState<StockCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [itemsData, categoriesData] = await Promise.all([stockService.getItems(), stockService.getCategories()]);
      setItems(itemsData);
      setCategories(categoriesData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const lowStockCount = useMemo(() => items.filter((item) => item.isLowStock).length, [items]);
  const totalValue = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /><Text style={styles.helper}>Carregando estoque...</Text></View>;
  }

  return (
    <ListScreen
      title="Estoque"
      data={items}
      emptyText="Nenhum item de estoque encontrado."
      onRefresh={load}
      action={<SecondaryButton label="Atualizar" onPress={load} />}
      header={
        <View style={styles.listHeaderBlock}>
          <View style={styles.grid2}>
            <StatCard label="Itens" value={String(items.length)} iconLabel="📦" />
            <StatCard label="Categorias" value={String(categories.length)} iconLabel="🗂️" />
            <StatCard label="Baixo estoque" value={String(lowStockCount)} iconLabel="⚠️" />
            <StatCard label="Valor total" value={formatCurrency(totalValue)} iconLabel="💎" />
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <Card>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardText}>{item.category?.name ?? 'Sem categoria'}</Text>
          <Text style={styles.cardText}>Qtd: {String(item.quantity)}</Text>
          <Text style={styles.cardText}>{formatCurrency(item.price)}</Text>
        </Card>
      )}
    />
  );
}

function SettingsScreen({ onLogout }: { onLogout: () => Promise<void> | void }) {
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    settingsService.getSettings().then(setSettings).catch(() => setSettings(null));
  }, []);

  return (
    <ScreenShell title="Configurações" action={<Pressable onPress={onLogout} style={styles.iconButton}><LogOut size={18} /></Pressable>}>
      <ScrollView contentContainerStyle={styles.contentPad}>
        <Card>
          <Text style={styles.cardTitle}>Sessão</Text>
          <Text style={styles.cardText}>Configurações carregadas: {settings ? 'sim' : 'não'}</Text>
          <Text style={styles.helper}>Esta área pode receber ajustes do Gemini, notificações e preferências do app.</Text>
        </Card>
      </ScrollView>
    </ScreenShell>
  );
}

function MainApp({ onLogout }: { onLogout: () => Promise<void> | void }) {
  const tabBarIcon = (label: string) => {
    const icons: Record<string, string> = {
      Dashboard: '🏠',
      Clientes: '👥',
      'Orçamentos': '🧾',
      Financeiro: '💼',
      Faturas: '💳',
      Projetos: '✅',
      Despesas: '💸',
      Estoque: '📦',
      Configurações: '⚙️',
    };

    return icons[label] ?? '•';
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: { borderTopColor: '#e2e8f0' },
        tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 16 }}>{tabBarIcon(route.name)}</Text>,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Clientes" component={ClientsScreen} />
      <Tab.Screen name="Orçamentos" component={QuotesScreen} />
      <Tab.Screen name="Financeiro" component={FinanceiroScreen} />
      <Tab.Screen name="Faturas" component={InvoicesScreen} />
      <Tab.Screen name="Projetos" component={ProjectsScreen} />
      <Tab.Screen name="Despesas" component={ExpensesScreen} />
      <Tab.Screen name="Estoque" component={StockScreen} />
      <Tab.Screen name="Configurações">
        {() => <SettingsScreen onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function LoginScreen({ onLoggedIn }: { onLoggedIn: () => void }) {
  const NativeLogin = require('./components/native/Login.native').default;
  return <NativeLogin onLogin={onLoggedIn} />;
}

export default function App() {
  const session = useAppSession();

  if (session.loading) {
    return (
      <SafeAreaProvider>
        <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
      </SafeAreaProvider>
    );
  }

  const logout = async () => {
    await authService.logout();
    session.setAuthenticated(false);
    session.setUser(null);
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={theme}>
        {session.authenticated ? (
          <MainApp onLogout={logout} />
        ) : (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login">
              {() => (
                <LoginScreen
                  onLoggedIn={async () => {
                    const token = await AsyncStorage.getItem(TOKEN_KEY);
                    const rawUser = await AsyncStorage.getItem(USER_KEY);
                    const parsedUser = rawUser ? JSON.parse(rawUser) : null;
                    session.setAuthenticated(Boolean(token));
                    session.setUser(parsedUser);
                  }}
                />
              )}
            </Stack.Screen>
          </Stack.Navigator>
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f7fb' },
  headerRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  contentPad: { padding: 16, gap: 12 },
  listPad: { padding: 16, gap: 12, paddingBottom: 36 },
  listHeaderBlock: { gap: 12, marginBottom: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f7fb' },
  helper: { marginTop: 8, color: '#64748b' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  cardText: { color: '#475569', marginTop: 2 },
  empty: { textAlign: 'center', color: '#64748b', paddingVertical: 24 },
  statCard: { flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', flex: 1, minWidth: '47%' },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eff6ff' },
  statIconText: { fontSize: 18 },
  statLabel: { color: '#64748b', fontSize: 12 },
  statValue: { color: '#0f172a', fontSize: 16, fontWeight: '700', marginTop: 2 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modulePill: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  modulePillText: { color: '#0f172a', fontSize: 12, fontWeight: '600' },
  searchInput: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#dbe4ef', paddingHorizontal: 14, paddingVertical: 12, color: '#0f172a' },
  chipRow: { gap: 8, paddingVertical: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dbe4ef' },
  chipSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { color: '#334155', fontSize: 12, fontWeight: '600' },
  chipTextSelected: { color: '#fff' },
  primaryButton: { backgroundColor: '#2563eb', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  primaryButtonText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  secondaryButton: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1' },
  secondaryButtonText: { color: '#0f172a', fontWeight: '700', fontSize: 12 },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { transform: [{ scale: 0.98 }] },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12, flexWrap: 'wrap' },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  cardHeaderRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', justifyContent: 'space-between' },
  smallGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  smallPill: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 10, minWidth: '48%', flexGrow: 1 },
  smallPillLabel: { color: '#64748b', fontSize: 11, fontWeight: '600' },
  smallPillValue: { color: '#0f172a', fontSize: 13, fontWeight: '700', marginTop: 2 },
  financeRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, paddingTop: 12, marginTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  iconButton: { padding: 8, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'center', padding: 16 },
  modalCard: { maxHeight: '90%', backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  modalBody: { gap: 12, paddingBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  formField: { gap: 6 },
  formLabel: { color: '#334155', fontSize: 12, fontWeight: '700' },
  formInput: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#dbe4ef', paddingHorizontal: 14, paddingVertical: 12, color: '#0f172a' },
  formInputMultiline: { minHeight: 96, textAlignVertical: 'top' },
  formRow: { flexDirection: 'row', gap: 12 },
  formColumn: { flex: 1 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  lineItemCard: { backgroundColor: '#f8fafc' },
  clientPickerList: { gap: 8 },
  clientPickerItem: { borderWidth: 1, borderColor: '#dbe4ef', borderRadius: 14, padding: 12, backgroundColor: '#fff' },
  clientPickerItemSelected: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  clientPickerName: { color: '#0f172a', fontSize: 14, fontWeight: '700' },
  clientPickerInfo: { color: '#64748b', fontSize: 12, marginTop: 2 },
});
