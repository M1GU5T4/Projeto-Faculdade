import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList,
  SafeAreaView, StyleSheet,
} from 'react-native';
import { InvoiceStatus, ProjectStatus, QuoteStatus } from '../../types';

// ─── Formatadores ────────────────────────────────────────────────────────────

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(value));
}

export function formatStatus(value: string) {
  return value
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export function safeErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Erro inesperado.';
}

export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ─── Status / Badge ───────────────────────────────────────────────────────────

export function statusTone(status: string) {
  const normalized = status.toUpperCase();
  if (
    [QuoteStatus.Aprovado, InvoiceStatus.Pago, ProjectStatus.EmAndamento, ProjectStatus.Concluido]
      .includes(normalized as never)
  ) {
    return { backgroundColor: '#dcfce7', borderColor: '#86efac', color: '#166534' };
  }
  if (
    [QuoteStatus.Enviado, InvoiceStatus.Pendente, ProjectStatus.NaoIniciado, QuoteStatus.Rascunho]
      .includes(normalized as never)
  ) {
    return { backgroundColor: '#fef3c7', borderColor: '#fde68a', color: '#92400e' };
  }
  if (
    [QuoteStatus.Rejeitado, InvoiceStatus.Atrasado, InvoiceStatus.Cancelado]
      .includes(normalized as never)
  ) {
    return { backgroundColor: '#fee2e2', borderColor: '#fecaca', color: '#991b1b' };
  }
  return { backgroundColor: '#e2e8f0', borderColor: '#cbd5e1', color: '#334155' };
}

export function Badge({ label }: { label: string }) {
  const tone = statusTone(label);
  return (
    <View style={[sharedStyles.badge, { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor }]}>
      <Text style={[sharedStyles.badgeText, { color: tone.color }]}>{formatStatus(label)}</Text>
    </View>
  );
}

// ─── Componentes base ─────────────────────────────────────────────────────────

export function ScreenShell({ title, action, children }: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <SafeAreaView style={sharedStyles.screen}>
      <View style={sharedStyles.headerRow}>
        <Text style={sharedStyles.title}>{title}</Text>
        {action}
      </View>
      {children}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[sharedStyles.card, style]}>{children}</View>;
}

export function StatCard({ label, value, iconLabel }: { label: string; value: string; iconLabel: string }) {
  return (
    <View style={sharedStyles.statCard}>
      <View style={sharedStyles.statIcon}>
        <Text style={sharedStyles.statIconText}>{iconLabel}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={sharedStyles.statLabel}>{label}</Text>
        <Text style={sharedStyles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

export function SearchField({ value, onChangeText, placeholder }: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#94a3b8"
      style={sharedStyles.searchInput}
    />
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[sharedStyles.chip, selected && sharedStyles.chipSelected]}>
      <Text style={[sharedStyles.chipText, selected && sharedStyles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        sharedStyles.primaryButton,
        disabled && sharedStyles.buttonDisabled,
        pressed && !disabled && sharedStyles.buttonPressed,
      ]}
    >
      <Text style={sharedStyles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        sharedStyles.secondaryButton,
        disabled && sharedStyles.buttonDisabled,
        pressed && !disabled && sharedStyles.buttonPressed,
      ]}
    >
      <Text style={sharedStyles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function FormField({
  label, value, onChangeText, placeholder, keyboardType, multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
  multiline?: boolean;
}) {
  return (
    <View style={sharedStyles.formField}>
      <Text style={sharedStyles.formLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        keyboardType={keyboardType}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[sharedStyles.formInput, multiline && sharedStyles.formInputMultiline]}
      />
    </View>
  );
}

export function ListScreen<T extends { id: string }>({
  title, data, renderItem, emptyText, onRefresh, header, footer, action,
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
        contentContainerStyle={sharedStyles.listPad}
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListEmptyComponent={<Text style={sharedStyles.empty}>{emptyText}</Text>}
        ListFooterComponent={footer}
        refreshing={refreshing}
        onRefresh={async () => {
          if (!onRefresh) return;
          setRefreshing(true);
          try { await onRefresh(); } finally { setRefreshing(false); }
        }}
      />
    </ScreenShell>
  );
}

// ─── Estilos compartilhados ───────────────────────────────────────────────────

export const sharedStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f7fb' },
  headerRow: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  contentPad: { padding: 16, gap: 12 },
  listPad: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f7fb' },
  helper: { marginTop: 4, color: '#64748b', fontSize: 13 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  cardText: { color: '#475569', marginTop: 2 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  empty: { textAlign: 'center', color: '#64748b', paddingVertical: 24 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  statCard: { flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', flex: 1, minWidth: '47%' },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eff6ff' },
  statIconText: { fontSize: 18 },
  statLabel: { color: '#64748b', fontSize: 12 },
  statValue: { color: '#0f172a', fontSize: 16, fontWeight: '700', marginTop: 2 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  searchInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#0f172a', marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', marginRight: 6 },
  chipSelected: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  chipTextSelected: { color: '#fff' },
  chipRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  primaryButton: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  secondaryButton: { backgroundColor: '#f1f5f9', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  secondaryButtonText: { color: '#334155', fontWeight: '600', fontSize: 14 },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.8 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  iconButton: { padding: 8, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  listHeaderBlock: { marginBottom: 8, gap: 8 },
  smallGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  smallPill: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 8, borderWidth: 1, borderColor: '#e2e8f0', minWidth: 80 },
  smallPillLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase' },
  smallPillValue: { fontSize: 13, color: '#0f172a', fontWeight: '600', marginTop: 2 },
  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  modulePill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  modulePillText: { color: '#0f172a', fontSize: 12, fontWeight: '600' },
  financeRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  formField: { marginBottom: 14 },
  formLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 5 },
  formInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827', backgroundColor: '#fff' },
  formInputMultiline: { minHeight: 80, paddingTop: 10 },
  formRow: { flexDirection: 'row', gap: 10 },
  formColumn: { flex: 1 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  modalBody: { padding: 16 },
  modalActions: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  lineItemCard: { marginBottom: 10, backgroundColor: '#f8fafc' },
  clientPickerList: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, marginBottom: 14, maxHeight: 180 },
  clientPickerItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  clientPickerItemSelected: { backgroundColor: '#eff6ff' },
  clientPickerName: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  clientPickerInfo: { fontSize: 12, color: '#64748b', marginTop: 2 },
});
