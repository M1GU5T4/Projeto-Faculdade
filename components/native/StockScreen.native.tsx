import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { stockService } from '../../services/api';
import { StockCategory, StockItem } from '../../types';
import { Card, formatCurrency, ListScreen, SecondaryButton, sharedStyles, StatCard } from './shared';

export default function StockScreen() {
  const [items, setItems] = useState<StockItem[]>([]);
  const [categories, setCategories] = useState<StockCategory[]>([]);
  const [loading, setLoading] = useState(true);

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
    <ListScreen
      title="Estoque"
      data={items}
      emptyText="Nenhum item de estoque encontrado."
      onRefresh={load}
      action={<SecondaryButton label="Atualizar" onPress={load} />}
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
  );
}
