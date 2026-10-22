'use client';

import { useEffect, useMemo, useState } from 'react';
import { stockService } from '@/services/api';
import type { StockCategory, StockItem } from '@/types';
import { StockItemType, StockMovementType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import {
  Package, Layers, AlertTriangle, DollarSign,
  RefreshCw, Plus, Search, X, Tag, MapPin,
  Truck, Barcode, ChevronDown, ChevronUp,
  Pencil, Trash2, ArrowUpDown, FileUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImportModal } from '@/components/stock/ImportModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt            = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatCurrency = (v: number) => fmt.format(v);
const safeError      = (e: unknown) => e instanceof Error ? e.message : 'Erro inesperado.';

const TYPE_OPTIONS = Object.values(StockItemType);
const UNIT_OPTIONS = ['UN', 'KG', 'M', 'M²', 'M³', 'L', 'HORA', 'CX', 'PC'];
const MOVEMENT_OPTIONS = [
  { value: StockMovementType.Entrada,      label: 'Entrada',       color: 'text-green-600' },
  { value: StockMovementType.Saida,        label: 'Saída',         color: 'text-red-600'   },
  { value: StockMovementType.Ajuste,       label: 'Ajuste',        color: 'text-blue-600'  },
  { value: StockMovementType.Transferencia,label: 'Transferência', color: 'text-yellow-600'},
];

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, variant = 'default' }: {
  label: string; value: string; icon: React.ElementType;
  variant?: 'default' | 'warning' | 'success' | 'danger';
}) {
  const iconClass = {
    default: 'bg-primary/10 text-primary',
    warning: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    success: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    danger:  'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  }[variant];
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className="mt-1 text-xl font-bold">{value}</p>
          </div>
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', iconClass)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Tipo do formulário ───────────────────────────────────────────────────────

type FormState = {
  name: string; description: string; categoryId: string; type: string;
  unit: string; price: string; quantity: string; minStock: string;
  maxStock: string; barcode: string; supplier: string; location: string;
};

const defaultForm = (): FormState => ({
  name: '', description: '', categoryId: '', type: StockItemType.Produto,
  unit: 'UN', price: '', quantity: '0', minStock: '', maxStock: '',
  barcode: '', supplier: '', location: '',
});

const itemToForm = (item: StockItem): FormState => ({
  name:        item.name,
  description: item.description ?? '',
  categoryId:  item.categoryId,
  type:        item.type,
  unit:        item.unit,
  price:       String(item.price),
  quantity:    String(item.quantity),
  minStock:    item.minStock !== null && item.minStock !== undefined ? String(item.minStock) : '',
  maxStock:    item.maxStock !== null && item.maxStock !== undefined ? String(item.maxStock) : '',
  barcode:     item.barcode  ?? '',
  supplier:    item.supplier ?? '',
  location:    item.location ?? '',
});

// ─── Modal criar / editar item ────────────────────────────────────────────────

function StockItemModal({ open, item, categories, onClose, onSaved }: {
  open: boolean; item: StockItem | null;
  categories: StockCategory[]; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const isEdit = !!item;
  const [form, setForm]         = useState<FormState>(defaultForm());
  const [saving, setSaving]     = useState(false);
  const [showOpt, setShowOpt]   = useState(false);

  useEffect(() => {
    if (open) {
      setForm(item ? itemToForm(item) : defaultForm());
      setSaving(false);
      setShowOpt(item ? !!(item.barcode || item.supplier || item.location) : false);
    }
  }, [open, item]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const num    = (v: string) => Number(v.replace(',', '.'));
  const optNum = (v: string) => v.trim() ? num(v) : undefined;
  const optStr = (v: string) => v.trim() || undefined;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const price    = num(form.price);
    const quantity = optNum(form.quantity) ?? 0;
    const minStock = optNum(form.minStock);
    const maxStock = optNum(form.maxStock);

    if (!form.name.trim() || !form.categoryId || !form.type || !form.unit.trim()) {
      toast({ title: 'Campos obrigatórios', description: 'Preencha nome, categoria, tipo e unidade.', variant: 'destructive' }); return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast({ title: 'Preço inválido', description: 'Informe um preço ≥ 0.', variant: 'destructive' }); return;
    }
    if (minStock !== undefined && maxStock !== undefined && maxStock < minStock) {
      toast({ title: 'Estoque inválido', description: 'Estoque máximo não pode ser menor que o mínimo.', variant: 'destructive' }); return;
    }

    const payload = {
      name: form.name.trim(), description: optStr(form.description),
      categoryId: form.categoryId, type: form.type, unit: form.unit.trim(),
      price, quantity, minStock, maxStock,
      barcode: optStr(form.barcode), supplier: optStr(form.supplier),
      location: optStr(form.location), isActive: true,
    };

    setSaving(true);
    try {
      if (isEdit && item) {
        await stockService.updateItem(item.id, payload);
        toast({ title: 'Produto atualizado com sucesso!', variant: 'success' });
      } else {
        await stockService.createItem(payload);
        toast({ title: 'Produto cadastrado com sucesso!', variant: 'success' });
      }
      await onSaved();
      onClose();
    } catch (err) {
      toast({ title: `Erro ao ${isEdit ? 'atualizar' : 'criar'} produto`, description: safeError(err), variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar produto' : 'Novo produto'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5 py-2">
          {/* Nome + Descrição */}
          <div className="space-y-1.5">
            <Label htmlFor="s-name">Nome *</Label>
            <Input id="s-name" placeholder="Nome do produto" value={form.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-desc">Descrição</Label>
            <Textarea id="s-desc" rows={2} placeholder="Detalhes do item..." value={form.description} onChange={(e) => set('description', e.target.value)} />
          </div>

          {/* Categoria */}
          <div className="space-y-1.5">
            <Label>Categoria *</Label>
            <div className="max-h-36 overflow-y-auto rounded-md border bg-background divide-y divide-border">
              {categories.length === 0
                ? <p className="p-3 text-sm text-muted-foreground">Nenhuma categoria cadastrada.</p>
                : categories.map((c) => (
                  <button key={c.id} type="button" onClick={() => set('categoryId', c.id)}
                    className={cn('w-full text-left px-3 py-2 text-sm transition-colors hover:bg-accent',
                      form.categoryId === c.id && 'bg-primary/10 font-semibold')}>
                    <span className="font-medium">{c.name}</span>
                    {c.description && <span className="ml-2 text-xs text-muted-foreground">{c.description}</span>}
                  </button>
                ))}
            </div>
          </div>

          {/* Tipo */}
          <div className="space-y-1.5">
            <Label>Tipo *</Label>
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((t) => (
                <button key={t} type="button" onClick={() => set('type', t)}
                  className={cn('rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                    form.type === t ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent')}>
                  {t.replaceAll('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Unidade + Preço */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Unidade *</Label>
              <div className="flex flex-wrap gap-1.5">
                {UNIT_OPTIONS.map((u) => (
                  <button key={u} type="button" onClick={() => set('unit', u)}
                    className={cn('rounded border px-2.5 py-1 text-xs font-semibold transition-colors',
                      form.unit === u ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent')}>
                    {u}
                  </button>
                ))}
              </div>
              <Input placeholder="Ou digite..." value={form.unit} onChange={(e) => set('unit', e.target.value)} className="mt-1" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-price">Preço unitário (R$) *</Label>
              <Input id="s-price" type="number" min="0" step="0.01" placeholder="0,00" value={form.price} onChange={(e) => set('price', e.target.value)} />
            </div>
          </div>

          {/* Quantidade + Estoques */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="s-qty">Quantidade</Label>
              <Input id="s-qty" type="number" min="0" step="0.01" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-min">Estoque mín.</Label>
              <Input id="s-min" type="number" min="0" step="0.01" placeholder="—" value={form.minStock} onChange={(e) => set('minStock', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-max">Estoque máx.</Label>
              <Input id="s-max" type="number" min="0" step="0.01" placeholder="—" value={form.maxStock} onChange={(e) => set('maxStock', e.target.value)} />
            </div>
          </div>

          {/* Campos opcionais */}
          <div>
            <button type="button" onClick={() => setShowOpt((v) => !v)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              {showOpt ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              Campos opcionais (cód. barras, fornecedor, localização)
            </button>
            {showOpt && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="s-barcode">Código de barras</Label>
                  <Input id="s-barcode" placeholder="EAN-13..." value={form.barcode} onChange={(e) => set('barcode', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-supplier">Fornecedor</Label>
                  <Input id="s-supplier" placeholder="Nome do fornecedor" value={form.supplier} onChange={(e) => set('supplier', e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="s-location">Localização</Label>
                  <Input id="s-location" placeholder="Prateleira A2..." value={form.location} onChange={(e) => set('location', e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>
              {saving ? (isEdit ? 'Salvando...' : 'Criando...') : (isEdit ? 'Salvar alterações' : 'Criar produto')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal de exclusão ────────────────────────────────────────────────────────

function DeleteModal({ item, onClose, onSaved }: {
  item: StockItem | null; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    if (!item) return;
    setLoading(true);
    try {
      await stockService.deleteItem(item.id);
      await onSaved();
      onClose();
      toast({ title: 'Produto excluído com sucesso!', variant: 'success' });
    } catch (err) {
      toast({ title: 'Erro ao excluir produto', description: safeError(err), variant: 'destructive' });
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir produto</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-2">
          <p className="text-sm text-muted-foreground">
            Deseja excluir permanentemente o produto <strong>{item?.name}</strong>?
          </p>
          <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Categoria</span>
              <span className="font-medium">{item?.category?.name ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantidade</span>
              <span className="font-medium">{item?.quantity} {item?.unit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor em estoque</span>
              <span className="font-medium">{formatCurrency((item?.price ?? 0) * (item?.quantity ?? 0))}</span>
            </div>
          </div>
          <p className="text-xs text-destructive font-medium">Esta ação não pode ser desfeita.</p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button variant="destructive" onClick={() => void confirm()} disabled={loading}>
            {loading ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal de movimentação ────────────────────────────────────────────────────

function MovementModal({ item, onClose, onSaved }: {
  item: StockItem | null; onClose: () => void; onSaved: () => Promise<void>;
}) {
  const [type,     setType]     = useState<StockMovementType>(StockMovementType.Entrada);
  const [quantity, setQuantity] = useState('');
  const [unitPrice,setUnitPrice]= useState('');
  const [reason,   setReason]   = useState('');
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    if (item) {
      setType(StockMovementType.Entrada);
      setQuantity('');
      setUnitPrice(String(item.price));
      setReason('');
    }
  }, [item]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    const qty = Number(quantity);
    if (!qty || qty <= 0) {
      toast({ title: 'Quantidade inválida', description: 'Informe uma quantidade maior que zero.', variant: 'destructive' }); return;
    }

    setLoading(true);
    try {
      await stockService.createMovement({
        itemId:    item.id,
        type,
        quantity:  qty,
        unitPrice: unitPrice ? Number(unitPrice) : undefined,
        reason:    reason.trim() || undefined,
      });
      await onSaved();
      onClose();
      toast({ title: 'Movimentação registrada!', variant: 'success' });
    } catch (err) {
      toast({ title: 'Erro ao registrar movimentação', description: safeError(err), variant: 'destructive' });
    } finally { setLoading(false); }
  };

  // Calcula novo saldo estimado
  const newQty = useMemo(() => {
    const qty = Number(quantity) || 0;
    if (!item) return 0;
    switch (type) {
      case StockMovementType.Entrada:      return item.quantity + qty;
      case StockMovementType.Saida:
      case StockMovementType.Transferencia: return item.quantity - qty;
      case StockMovementType.Ajuste:       return qty;
      default:                             return item.quantity;
    }
  }, [item, quantity, type]);

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar movimentação — {item?.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4 py-2">
          {/* Tipo */}
          <div className="space-y-1.5">
            <Label>Tipo de movimentação</Label>
            <div className="grid grid-cols-2 gap-2">
              {MOVEMENT_OPTIONS.map(({ value, label, color }) => (
                <button key={value} type="button" onClick={() => setType(value)}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-sm font-semibold transition-colors text-left',
                    type === value ? 'bg-primary text-primary-foreground border-primary' : `border-border hover:bg-accent ${color}`
                  )}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Estoque atual */}
          <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estoque atual</span>
              <span className="font-bold">{item?.quantity} {item?.unit}</span>
            </div>
            {quantity && (
              <div className="flex justify-between border-t pt-1 mt-1">
                <span className="text-muted-foreground">Após movimentação</span>
                <span className={cn('font-bold', newQty < 0 ? 'text-destructive' : newQty === 0 ? 'text-yellow-600' : '')}>
                  {newQty} {item?.unit}
                </span>
              </div>
            )}
          </div>

          {/* Quantidade */}
          <div className="space-y-1.5">
            <Label htmlFor="mov-qty">
              {type === StockMovementType.Ajuste ? 'Nova quantidade total' : 'Quantidade'}
            </Label>
            <Input
              id="mov-qty" type="number" min="0" step="0.01"
              placeholder={type === StockMovementType.Ajuste ? 'Quantidade final...' : 'Qtd. a movimentar...'}
              value={quantity} onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          {/* Preço unitário */}
          <div className="space-y-1.5">
            <Label htmlFor="mov-price">Preço unitário (R$) <span className="text-xs text-muted-foreground">(opcional)</span></Label>
            <Input id="mov-price" type="number" min="0" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
          </div>

          {/* Motivo */}
          <div className="space-y-1.5">
            <Label htmlFor="mov-reason">Motivo <span className="text-xs text-muted-foreground">(opcional)</span></Label>
            <Input id="mov-reason" placeholder="Ex: Compra, venda, perda, ajuste de inventário..." value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
            <Button type="submit" disabled={loading || newQty < 0}>
              {loading ? 'Salvando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Card de item ─────────────────────────────────────────────────────────────

function StockItemCard({ item, onEdit, onDelete, onMovement }: {
  item: StockItem;
  onEdit: () => void; onDelete: () => void; onMovement: () => void;
}) {
  const totalValue = item.totalValue ?? item.price * item.quantity;
  const isLow      = item.isLowStock;

  return (
    <Card className={cn('transition-shadow hover:shadow-md', isLow && 'border-yellow-300 dark:border-yellow-800')}>
      <CardContent className="p-5 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-sm leading-tight truncate">{item.name}</p>
              {isLow && (
                <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-yellow-300 bg-yellow-50 px-2 py-0.5 text-[10px] font-semibold text-yellow-700 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                  <AlertTriangle className="h-2.5 w-2.5" /> Baixo estoque
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground">
                <Tag className="h-2.5 w-2.5" />{item.category?.name ?? '—'}
              </span>
              <span className="text-xs text-muted-foreground border rounded-full px-2 py-0.5 bg-muted/50">
                {item.type.replaceAll('_', ' ')}
              </span>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-base font-bold">{formatCurrency(item.price)}</p>
            <p className="text-xs text-muted-foreground">/{item.unit}</p>
          </div>
        </div>

        {/* Descrição */}
        {item.description && (
          <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
        )}

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md bg-muted/50 px-2 py-2 text-center">
            <p className="text-[10px] text-muted-foreground">Quantidade</p>
            <p className={cn('text-sm font-bold mt-0.5', isLow ? 'text-yellow-600 dark:text-yellow-400' : '')}>
              {item.quantity} {item.unit}
            </p>
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-2 text-center">
            <p className="text-[10px] text-muted-foreground">Mín / Máx</p>
            <p className="text-xs font-semibold mt-0.5">
              {item.minStock ?? '—'} / {item.maxStock ?? '—'}
            </p>
          </div>
          <div className="rounded-md bg-muted/50 px-2 py-2 text-center">
            <p className="text-[10px] text-muted-foreground">Valor total</p>
            <p className="text-xs font-bold mt-0.5">{formatCurrency(totalValue)}</p>
          </div>
        </div>

        {/* Barra de estoque */}
        {item.minStock != null && item.maxStock != null && item.maxStock > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Nível de estoque</span>
              <span>{Math.round((item.quantity / item.maxStock) * 100)}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all',
                  item.quantity <= (item.minStock ?? 0) ? 'bg-yellow-500' : 'bg-primary')}
                style={{ width: `${Math.min((item.quantity / item.maxStock) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Fornecedor / Localização / Barcode */}
        {(item.supplier || item.location || item.barcode) && (
          <div className="flex flex-wrap gap-2 pt-1">
            {item.supplier && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Truck className="h-3 w-3" />{item.supplier}
              </span>
            )}
            {item.location && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />{item.location}
              </span>
            )}
            {item.barcode && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Barcode className="h-3 w-3" />{item.barcode}
              </span>
            )}
          </div>
        )}

        {/* Ações CRUD */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={onMovement} title="Registrar entrada/saída">
            <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" /> Movimentar
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit} title="Editar produto">
            <Pencil className="mr-1.5 h-3.5 w-3.5" /> Editar
          </Button>
          <Button variant="outline" size="sm" onClick={onDelete}
            className="text-destructive hover:bg-destructive hover:text-destructive-foreground" title="Excluir produto">
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Excluir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function EstoquePage() {
  const [items,      setItems]      = useState<StockItem[]>([]);
  const [categories, setCategories] = useState<StockCategory[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [query,      setQuery]      = useState('');
  const [catFilter,  setCatFilter]  = useState('');

  // Modais
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editItem,     setEditItem]     = useState<StockItem | null>(null);
  const [deleteItem,   setDeleteItem]   = useState<StockItem | null>(null);
  const [movementItem, setMovementItem] = useState<StockItem | null>(null);
  const [importOpen,   setImportOpen]   = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [i, c] = await Promise.all([
        stockService.getItems().catch(() => []),
        stockService.getCategories().catch(() => []),
      ]);
      setItems(i); setCategories(c);
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const openCreate = () => { setEditItem(null); setModalOpen(true); };
  const openEdit   = (item: StockItem) => { setEditItem(item); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditItem(null); };

  const summary = useMemo(() => ({
    total:      items.length,
    categories: categories.length,
    lowStock:   items.filter((i) => i.isLowStock).length,
    totalValue: items.reduce((s, i) => s + i.price * i.quantity, 0),
  }), [items, categories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const catOk  = !catFilter || item.categoryId === catFilter;
      const textOk = !q || [item.name, item.description ?? '', item.category?.name ?? '', item.supplier ?? '']
        .some((f) => f.toLowerCase().includes(q));
      return catOk && textOk;
    });
  }, [catFilter, items, query]);

  const byCategory = useMemo(() => {
    const map = new Map<string, { name: string; count: number; value: number }>();
    for (const item of items) {
      const key     = item.categoryId ?? item.category?.name ?? 'sem-cat';
      const catName = item.category?.name ?? 'Sem categoria';
      const cur     = map.get(key) ?? { name: catName, count: 0, value: 0 };
      cur.count++;
      cur.value += item.price * item.quantity;
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [items]);

  return (
    <>
      {/* Modal criar / editar */}
      <StockItemModal
        open={modalOpen} item={editItem} categories={categories}
        onClose={closeModal} onSaved={load}
      />
      {/* Modal excluir */}
      <DeleteModal item={deleteItem} onClose={() => setDeleteItem(null)} onSaved={load} />
      {/* Modal movimentação */}
      <MovementModal item={movementItem} onClose={() => setMovementItem(null)} onSaved={load} />
      {/* Modal importação */}
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onImported={load} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Estoque</h1>
            <p className="text-sm text-muted-foreground">Controle de produtos e materiais</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
              Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
              <FileUp className="mr-2 h-4 w-4" /> Importar
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Novo produto
            </Button>
          </div>
        </div>

        {/* StatCards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Itens"         value={String(summary.total)}              icon={Package}       />
          <StatCard label="Categorias"    value={String(summary.categories)}         icon={Layers}        />
          <StatCard label="Baixo estoque" value={String(summary.lowStock)}           icon={AlertTriangle} variant={summary.lowStock > 0 ? 'warning' : 'default'} />
          <StatCard label="Valor total"   value={formatCurrency(summary.totalValue)} icon={DollarSign}    variant="success" />
        </div>

        {/* Busca + filtro de categoria */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome, categoria ou fornecedor..."
              value={query} onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setCatFilter('')}
              className={cn('rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                !catFilter ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent')}>
              Todos
            </button>
            {categories.map((c) => (
              <button key={c.id} onClick={() => setCatFilter(catFilter === c.id ? '' : c.id)}
                className={cn('rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                  catFilter === c.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent')}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Lista principal */}
          <div className="lg:col-span-3 space-y-4">
            {loading && (
              <div className="flex h-40 items-center justify-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span className="text-sm text-muted-foreground">Carregando estoque...</span>
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
                <Package className="h-8 w-8 opacity-40" />
                <p className="text-sm">
                  {query || catFilter ? 'Nenhum item encontrado para esse filtro.' : 'Nenhum item cadastrado.'}
                </p>
              </div>
            )}
            {!loading && filtered.length > 0 && (
              <>
                <p className="text-xs text-muted-foreground">
                  {filtered.length} de {items.length} item{items.length !== 1 ? 's' : ''}
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {filtered.map((item) => (
                    <StockItemCard
                      key={item.id} item={item}
                      onEdit={()     => openEdit(item)}
                      onDelete={()   => setDeleteItem(item)}
                      onMovement={() => setMovementItem(item)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Painel lateral */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Por categoria</CardTitle>
              </CardHeader>
              <CardContent>
                {byCategory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados.</p>
                ) : (
                  <div className="space-y-3">
                    {byCategory.map(({ name, count, value }) => {
                      const pct = summary.totalValue > 0 ? Math.round((value / summary.totalValue) * 100) : 0;
                      return (
                        <div key={name} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium truncate">{name}</span>
                            <span className="text-muted-foreground ml-2 shrink-0">{count} · {pct}%</span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-xs text-muted-foreground text-right">{formatCurrency(value)}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {summary.lowStock > 0 && (
              <Card className="border-yellow-300 dark:border-yellow-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                    <AlertTriangle className="h-4 w-4" />
                    Baixo estoque ({summary.lowStock})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.filter((i) => i.isLowStock).slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs">
                      <span className="truncate font-medium">{item.name}</span>
                      <span className="ml-2 shrink-0 text-yellow-600 dark:text-yellow-400 font-bold">
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
