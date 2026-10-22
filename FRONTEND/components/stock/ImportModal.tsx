'use client';

import { useCallback, useRef, useState } from 'react';
import { API_URL } from '@/services/api';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import {
  Upload, FileSpreadsheet, Download, CheckCircle2,
  XCircle, AlertTriangle, X, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type PreviewItem = {
  row: number;
  name: string;
  categoryName: string;
  type: string;
  unit: string;
  price: number;
  quantity?: number;
  description?: string;
  minStock?: number;
  maxStock?: number;
  supplier?: string;
  location?: string;
};

type PreviewError = { row: number; name: string; reason: string };

type PreviewResponse = {
  total: number;
  valid: number;
  errors: number;
  preview: PreviewItem[];
  errorDetails: PreviewError[];
};

type ImportResult = {
  success: number;
  errors: PreviewError[];
  items: { id: string; name: string }[];
};

type Step = 'upload' | 'preview' | 'result';

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const safeError = (e: unknown) => e instanceof Error ? e.message : 'Erro inesperado.';

// ─── Componente principal ─────────────────────────────────────────────────────

export function ImportModal({ open, onClose, onImported }: {
  open: boolean;
  onClose: () => void;
  onImported: () => Promise<void>;
}) {
  const inputRef              = useRef<HTMLInputElement>(null);
  const [step, setStep]       = useState<Step>('upload');
  const [file, setFile]       = useState<File | null>(null);
  const [dragging, setDrag]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [result,  setResult]  = useState<ImportResult | null>(null);

  const reset = () => {
    setStep('upload');
    setFile(null);
    setPreview(null);
    setResult(null);
    setLoading(false);
  };

  const handleClose = () => { reset(); onClose(); };

  // ── Drag & drop ──────────────────────────────────────────────────────────────
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f) setFile(f);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  // ── Download template ────────────────────────────────────────────────────────
  const downloadTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      const res   = await fetch(`${API_URL}/stock/import/template`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erro ao baixar template.');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'template_estoque.xlsx';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({ title: 'Erro ao baixar template', description: safeError(err), variant: 'destructive' });
    }
  };

  // ── Preview ──────────────────────────────────────────────────────────────────
  const runPreview = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const fd    = new FormData();
      fd.append('file', file);
      const res  = await fetch(`${API_URL}/stock/import/preview`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao processar arquivo.');
      setPreview(data);
      setStep('preview');
    } catch (err) {
      toast({ title: 'Erro ao processar arquivo', description: safeError(err), variant: 'destructive' });
    } finally { setLoading(false); }
  };

  // ── Importar ─────────────────────────────────────────────────────────────────
  const runImport = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const fd    = new FormData();
      fd.append('file', file);
      const res  = await fetch(`${API_URL}/stock/import`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      const data: ImportResult = await res.json();
      setResult(data);
      setStep('result');
      if (data.success > 0) {
        await onImported();
        toast({ title: `${data.success} item(s) importado(s) com sucesso!`, variant: 'success' });
      }
    } catch (err) {
      toast({ title: 'Erro ao importar', description: safeError(err), variant: 'destructive' });
    } finally { setLoading(false); }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar itens do estoque
          </DialogTitle>
        </DialogHeader>

        {/* ── STEP 1: Upload ── */}
        {step === 'upload' && (
          <div className="space-y-4 py-2">
            {/* Download template */}
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-3">
              <div>
                <p className="text-sm font-semibold">Template Excel</p>
                <p className="text-xs text-muted-foreground">Baixe e preencha com seus produtos</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => void downloadTemplate()}>
                <Download className="mr-2 h-3.5 w-3.5" /> Baixar template
              </Button>
            </div>

            {/* Colunas esperadas */}
            <div className="rounded-lg border bg-muted/20 px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground mb-2">COLUNAS DO ARQUIVO</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {[
                  { col: 'name', req: true }, { col: 'categoryName', req: true },
                  { col: 'type', req: true }, { col: 'unit', req: true },
                  { col: 'price', req: true }, { col: 'quantity', req: false },
                  { col: 'description', req: false }, { col: 'minStock', req: false },
                  { col: 'maxStock', req: false }, { col: 'supplier', req: false },
                  { col: 'location', req: false }, { col: 'barcode', req: false },
                ].map(({ col, req }) => (
                  <div key={col} className="flex items-center gap-1.5">
                    <span className={cn('h-1.5 w-1.5 rounded-full', req ? 'bg-primary' : 'bg-muted-foreground/40')} />
                    <span className="font-mono">{col}</span>
                    {req && <span className="text-primary text-[10px]">*</span>}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground pt-1">* obrigatório</p>
            </div>

            {/* Tipos válidos */}
            <div className="rounded-lg border bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
              <span className="font-semibold">type</span> aceita:{' '}
              {['PRODUTO', 'MAO_DE_OBRA', 'METRO', 'EQUIPAMENTO', 'FERRAMENTA', 'MATERIAL'].map((t) => (
                <span key={t} className="mx-0.5 font-mono">{t}</span>
              ))}
            </div>

            {/* Drag & drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                'cursor-pointer rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors',
                dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30',
                file && 'border-green-400 bg-green-50 dark:bg-green-950/20'
              )}
            >
              <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFileChange} />
              {file ? (
                <div className="space-y-2">
                  <CheckCircle2 className="mx-auto h-8 w-8 text-green-500" />
                  <p className="font-semibold text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
                    <X className="h-3 w-3" /> Remover
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium">Arraste o arquivo aqui ou clique para selecionar</p>
                  <p className="text-xs text-muted-foreground">.xlsx, .xls ou .csv — máx. 10MB</p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button onClick={() => void runPreview()} disabled={!file || loading}>
                {loading ? 'Processando...' : <><ArrowRight className="mr-2 h-4 w-4" />Validar arquivo</>}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ── STEP 2: Preview ── */}
        {step === 'preview' && preview && (
          <div className="space-y-4 py-2">
            {/* Resumo */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Total no arquivo</p>
                <p className="text-xl font-bold mt-0.5">{preview.total}</p>
              </div>
              <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 p-3 text-center">
                <p className="text-xs text-green-700 dark:text-green-400">Válidos</p>
                <p className="text-xl font-bold mt-0.5 text-green-700 dark:text-green-300">{preview.valid}</p>
              </div>
              <div className={cn('rounded-lg border p-3 text-center',
                preview.errors > 0 ? 'border-red-200 bg-red-50 dark:bg-red-950/30' : 'border-muted bg-muted/30')}>
                <p className={cn('text-xs', preview.errors > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>Com erro</p>
                <p className={cn('text-xl font-bold mt-0.5', preview.errors > 0 ? 'text-red-700 dark:text-red-300' : '')}>{preview.errors}</p>
              </div>
            </div>

            {/* Erros */}
            {preview.errorDetails.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-sm font-semibold flex items-center gap-1.5 text-destructive">
                  <XCircle className="h-4 w-4" /> Linhas com erro (não serão importadas)
                </p>
                <div className="max-h-36 overflow-y-auto space-y-1.5 rounded-lg border bg-red-50 dark:bg-red-950/20 p-3">
                  {preview.errorDetails.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className="shrink-0 font-mono text-red-500">Linha {e.row}</span>
                      <span className="text-muted-foreground">{e.name && `"${e.name}" — `}{e.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preview dos válidos */}
            {preview.preview.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-sm font-semibold flex items-center gap-1.5 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  Prévia dos primeiros {preview.preview.length} itens válidos
                </p>
                <div className="max-h-52 overflow-y-auto rounded-lg border divide-y divide-border text-xs">
                  <div className="grid grid-cols-5 gap-2 bg-muted/50 px-3 py-2 font-semibold text-muted-foreground sticky top-0">
                    <span>Nome</span><span>Categoria</span><span>Tipo</span><span>Unidade</span><span>Preço</span>
                  </div>
                  {preview.preview.map((item, i) => (
                    <div key={i} className="grid grid-cols-5 gap-2 px-3 py-2 hover:bg-muted/30">
                      <span className="truncate font-medium">{item.name}</span>
                      <span className="truncate text-muted-foreground">{item.categoryName}</span>
                      <span className="truncate text-muted-foreground">{item.type}</span>
                      <span className="text-muted-foreground">{item.unit}</span>
                      <span>{fmt.format(item.price)}</span>
                    </div>
                  ))}
                </div>
                {preview.valid > preview.preview.length && (
                  <p className="text-xs text-muted-foreground text-center">
                    + {preview.valid - preview.preview.length} itens não exibidos na prévia
                  </p>
                )}
              </div>
            )}

            {preview.valid === 0 && (
              <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Nenhum item válido encontrado. Corrija os erros e tente novamente.
              </div>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" onClick={reset}>Voltar</Button>
              <Button onClick={() => void runImport()} disabled={loading || preview.valid === 0}>
                {loading ? 'Importando...' : `Importar ${preview.valid} item(s)`}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* ── STEP 3: Resultado ── */}
        {step === 'result' && result && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 p-4 text-center">
                <CheckCircle2 className="mx-auto h-6 w-6 text-green-500 mb-1" />
                <p className="text-xs text-green-700 dark:text-green-400">Importados</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{result.success}</p>
              </div>
              <div className={cn('rounded-lg border p-4 text-center',
                result.errors.length > 0 ? 'border-red-200 bg-red-50 dark:bg-red-950/30' : 'border-muted bg-muted/30')}>
                {result.errors.length > 0 ? <XCircle className="mx-auto h-6 w-6 text-red-500 mb-1" /> : <CheckCircle2 className="mx-auto h-6 w-6 text-muted-foreground mb-1" />}
                <p className={cn('text-xs', result.errors.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')}>Com erro</p>
                <p className={cn('text-2xl font-bold', result.errors.length > 0 ? 'text-red-700 dark:text-red-300' : '')}>{result.errors.length}</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-destructive">Itens não importados</p>
                <div className="max-h-40 overflow-y-auto rounded-lg border bg-red-50 dark:bg-red-950/20 p-3 space-y-1.5">
                  {result.errors.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className="shrink-0 font-mono text-red-500">Linha {e.row}</span>
                      <span className="text-muted-foreground">{e.name && `"${e.name}" — `}{e.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.success > 0 && (
              <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/30 px-4 py-3 text-sm text-green-800 dark:text-green-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {result.success} item(s) adicionado(s) ao estoque com sucesso!
              </div>
            )}

            <DialogFooter className="gap-2 pt-2">
              {result.errors.length > 0 && (
                <Button variant="outline" onClick={reset}>Importar outro arquivo</Button>
              )}
              <Button onClick={handleClose}>Fechar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
