import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, View } from 'react-native';
import { stockService } from '../../services/api';
import { StockCategory, StockItem, StockItemType } from '../../types';
import { Card, FormField, formatCurrency, ListScreen, PrimaryButton, SecondaryButton, sharedStyles, StatCard, safeErrorMessage } from './shared';

type StockItemFormState = {
  name: string;
  description: string;
  categoryId: string;
  type: string;
  unit: string;
  price: string;
  quantity: string;
  minStock: string;
  maxStock: string;
  barcode: string;
  supplier: string;
  location: string;
};

const stockTypeOptions = Object.values(StockItemType);

const defaultStockItemForm = (): StockItemFormState => ({
  name: '',
  description: '',
  categoryId: '',
  type: StockItemType.Produto,
  unit: 'UN',
  price: '',
  quantity: '0',
  minStock: '',
  maxStock: '',
  barcode: '',
  supplier: '',
  location: '',
});

const parseFormNumber = (value: string) => Number(value.replace(',', '.'));
const optionalFormNumber = (value: string) => value.trim() ? parseFormNumber(value) : undefined;
const optionalText = (value: string) => value.trim() || undefined;

function StockItemCreateModal({ visible, categories, onClose, onSaved }: {
  visible: boolean;
  categories: StockCategory[];
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}) {
  const [form, setForm] = useState<StockItemFormState>(defaultStockItemForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm(defaultStockItemForm());
      setSaving(false);
    }
  }, [visible]);

  const selectedCategory = categories.find((category) => category.id === form.categoryId);

  const submit = async () => {
    const price = parseFormNumber(form.price);
    const quantity = optionalFormNumber(form.quantity) ?? 0;
    const minStock = optionalFormNumber(form.minStock);
    const maxStock = optionalFormNumber(form.maxStock);

    if (!form.name.trim() || !form.categoryId || !form.type.trim() || !form.unit.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha nome, categoria, tipo e unidade.');
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      Alert.alert('Preço inválido', 'Informe um preço maior ou igual a zero.');
      return;
    }

    if (!Number.isFinite(quantity) || quantity < 0) {
      Alert.alert('Quantidade inválida', 'Informe uma quantidade maior ou igual a zero.');
      return;
    }

    if ((minStock !== undefined && (!Number.isFinite(minStock) || minStock < 0)) || (maxStock !== undefined && (!Number.isFinite(maxStock) || maxStock < 0))) {
      Alert.alert('Estoque inválido', 'Informe limites de estoque maiores ou iguais a zero.');
      return;
    }

    if (minStock !== undefined && maxStock !== undefined && maxStock < minStock) {
      Alert.alert('Estoque inválido', 'O estoque máximo não pode ser menor que o estoque mínimo.');
      return;
    }

    setSaving(true);
    try {
      await stockService.createItem({
        name: form.name.trim(),
        description: optionalText(form.description),
        categoryId: form.categoryId,
        type: form.type,
        unit: form.unit.trim(),
        price,
        quantity,
        minStock,
        maxStock,
        barcode: optionalText(form.barcode),
        supplier: optionalText(form.supplier),
        location: optionalText(form.location),
        isActive: true,
      });
      await onSaved();
      onClose();
      Alert.alert('Sucesso', 'Produto cadastrado no estoque.');
    } catch (error) {
      Alert.alert('Erro ao criar produto', safeErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={sharedStyles.modalBackdrop}>
        <View style={sharedStyles.modalCard}>
          <View style={sharedStyles.modalHeader}>
            <Text style={sharedStyles.modalTitle}>Novo produto</Text>
            <SecondaryButton label="Fechar" onPress={onClose} />
          </View>
          <ScrollView contentContainerStyle={sharedStyles.modalBody} keyboardShouldPersistTaps="handled">
            <FormField label="Nome" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Nome do produto" />
            <FormField label="Descrição" value={form.description} onChangeText={(v) => setForm((f) => ({ ...f, description: v }))} placeholder="Detalhes do item" multiline />

            <Text style={sharedStyles.formLabel}>Categoria</Text>
            <View style={sharedStyles.clientPickerList}>
              {categories.length === 0 ? <Text style={sharedStyles.helper}>Nenhuma categoria cadastrada.</Text> : null}
              {categories.map((category) => (
                <View key={category.id} style={[sharedStyles.clientPickerItem, form.categoryId === category.id && sharedStyles.clientPickerItemSelected]}>
                  <Text style={sharedStyles.clientPickerName} onPress={() => setForm((f) => ({ ...f, categoryId: category.id }))}>{category.name}</Text>
                  {category.description ? <Text style={sharedStyles.clientPickerInfo}>{category.description}</Text> : null}
                </View>
              ))}
            </View>
            {selectedCategory ? <Text style={sharedStyles.helper}>Selecionada: {selectedCategory.name}</Text> : null}

            <Text style={sharedStyles.formLabel}>Tipo</Text>
            <View style={sharedStyles.clientPickerList}>
              {stockTypeOptions.map((type) => (
                <View key={type} style={[sharedStyles.clientPickerItem, form.type === type && sharedStyles.clientPickerItemSelected]}>
                  <Text style={sharedStyles.clientPickerName} onPress={() => setForm((f) => ({ ...f, type }))}>{type}</Text>
                </View>
              ))}
            </View>

            <View style={sharedStyles.formRow}>
              <View style={sharedStyles.formColumn}>
                <FormField label="Unidade" value={form.unit} onChangeText={(v) => setForm((f) => ({ ...f, unit: v }))} placeholder="UN, KG, M" />
              </View>
              <View style={sharedStyles.formColumn}>
                <FormField label="Preço" value={form.price} onChangeText={(v) => setForm((f) => ({ ...f, price: v }))} placeholder="0,00" keyboardType="decimal-pad" />
              </View>
            </View>

            <View style={sharedStyles.formRow}>
              <View style={sharedStyles.formColumn}>
                <FormField label="Quantidade" value={form.quantity} onChangeText={(v) => setForm((f) => ({ ...f, quantity: v }))} placeholder="0" keyboardType="decimal-pad" />
              </View>
              <View style={sharedStyles.formColumn}>
                <FormField label="Estoque mínimo" value={form.minStock} onChangeText={(v) => setForm((f) => ({ ...f, minStock: v }))} placeholder="0" keyboardType="decimal-pad" />
              </View>
            </View>

            <View style={sharedStyles.formRow}>
              <View style={sharedStyles.formColumn}>
                <FormField label="Estoque máximo" value={form.maxStock} onChangeText={(v) => setForm((f) => ({ ...f, maxStock: v }))} placeholder="0" keyboardType="decimal-pad" />
              </View>
              <View style={sharedStyles.formColumn}>
                <FormField label="Código de barras" value={form.barcode} onChangeText={(v) => setForm((f) => ({ ...f, barcode: v }))} placeholder="Opcional" />
              </View>
            </View>

            <View style={sharedStyles.formRow}>
              <View style={sharedStyles.formColumn}>
                <FormField label="Fornecedor" value={form.supplier} onChangeText={(v) => setForm((f) => ({ ...f, supplier: v }))} placeholder="Opcional" />
              </View>
              <View style={sharedStyles.formColumn}>
                <FormField label="Localização" value={form.location} onChangeText={(v) => setForm((f) => ({ ...f, location: v }))} placeholder="Prateleira, setor..." />
              </View>
            </View>
          </ScrollView>
          <View style={sharedStyles.modalActions}>
            <SecondaryButton label="Cancelar" onPress={onClose} />
            <PrimaryButton label={saving ? 'Salvando...' : 'Criar produto'} onPress={() => void submit()} disabled={saving} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function StockScreen() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [categories, setCategories] = useState<StockCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [createVisible, setCreateVisible] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [i, c] = await Promise.all([stockService.getItems().catch(() => []), stockService.getCategories().catch(() => [])]);
      setItems(i); setCategories(c);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const lowStockCount = useMemo(() => items.filter((i) => i.isLowStock).length, [items]);
  const totalValue = useMemo(() => items.reduce((s, i) => s + i.price * i.quantity, 0), [items]);

  if (loading) {
    return (
      <View style={sharedStyles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={sharedStyles.helper}>Carregando estoque...</Text>
      </View>
    );
  }

  return (
    <>
      <ListScreen
        title="Estoque"
        data={items}
        emptyText="Nenhum item de estoque encontrado."
        onRefresh={load}
        action={
          <View style={sharedStyles.actionRow}>
            <SecondaryButton label="Atualizar" onPress={load} />
            <PrimaryButton label="Novo produto" onPress={() => setCreateVisible(true)} />
          </View>
        }
        header={
          <View style={sharedStyles.listHeaderBlock}>
            <View style={sharedStyles.grid2}>
              <StatCard label="Itens" value={String(items.length)} iconLabel="📦" />
              <StatCard label="Categorias" value={String(categories.length)} iconLabel="🗂️" />
              <StatCard label="Baixo estoque" value={String(lowStockCount)} iconLabel="⚠️" />
              <StatCard label="Valor total" value={formatCurrency(totalValue)} iconLabel="💎" />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Card>
            <Text style={sharedStyles.cardTitle}>{item.name}</Text>
            <Text style={sharedStyles.cardText}>{item.category?.name ?? 'Sem categoria'}</Text>
            <View style={sharedStyles.smallGrid}>
              <View style={sharedStyles.smallPill}><Text style={sharedStyles.smallPillLabel}>Qtd</Text><Text style={sharedStyles.smallPillValue}>{String(item.quantity)}</Text></View>
              <View style={sharedStyles.smallPill}><Text style={sharedStyles.smallPillLabel}>Preço</Text><Text style={sharedStyles.smallPillValue}>{formatCurrency(item.price)}</Text></View>
              <View style={sharedStyles.smallPill}><Text style={sharedStyles.smallPillLabel}>Unidade</Text><Text style={sharedStyles.smallPillValue}>{item.unit}</Text></View>
            </View>
          </Card>
        )}
      />
      <StockItemCreateModal visible={createVisible} categories={categories} onClose={() => setCreateVisible(false)} onSaved={load} />
    </>
  );
}
