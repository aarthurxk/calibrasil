import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { Upload, Download, FileSpreadsheet, AlertCircle, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

// Column definitions
const TEMPLATE_COLUMNS = [
  'product_id',
  'product_name',
  'category',
  'status',
  'price',
  'featured',
  'image_url',
  'variant_model',
  'variant_color',
  'variant_sku',
  'variant_price',
  'variant_stock',
];

interface ParsedRow {
  original: Record<string, string>;
  productId?: string;
  productName: string;
  category: string;
  status: string;
  price: number;
  featured: boolean;
  imageUrl?: string;
  hasVariant: boolean;
  variantModel?: string;
  variantColor?: string;
  variantSku?: string;
  variantPrice: number;
  variantStock: number;
  warnings: string[];
  errors: string[];
  rowIndex: number;
}

interface ProductImportExportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Generate deterministic SKU from product name + model + color
const generateSku = (productName: string, model?: string, color?: string): string => {
  const parts = [productName, model, color].filter(Boolean);
  const base = parts.join('-').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);
  return base.toUpperCase();
};

const ProductImportExport = ({ open, onOpenChange }: ProductImportExportProps) => {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const queryClient = useQueryClient();

  const importable = parsedRows.filter(r => r.errors.length === 0 && r.warnings.length === 0);
  const withWarnings = parsedRows.filter(r => r.errors.length === 0 && r.warnings.length > 0);
  const withErrors = parsedRows.filter(r => r.errors.length > 0);

  const parseFile = useCallback((file: File) => {
    setParsedRows([]);
    setImportComplete(false);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows: ParsedRow[] = results.data.map((row: any, index: number) => {
          const warnings: string[] = [];
          const errors: string[] = [];

          // Required fields
          const productName = (row.product_name || '').trim();
          const category = (row.category || '').trim();

          if (!productName) errors.push('product_name é obrigatório');
          if (!category) errors.push('category é obrigatório');

          // Status with fallback
          let status = (row.status || '').trim().toLowerCase();
          if (!status) {
            status = 'em_estoque';
            warnings.push('status vazio: usando "em_estoque"');
          }
          const inStock = status === 'em_estoque' || status === 'true' || status === '1';

          // Featured with fallback
          let featured = false;
          const featuredRaw = (row.featured || '').trim().toLowerCase();
          if (featuredRaw === 'true' || featuredRaw === '1' || featuredRaw === 'sim') {
            featured = true;
          }

          // Price validation
          let price = 0;
          const priceRaw = (row.price || '').trim();
          if (priceRaw) {
            const parsedPrice = parseFloat(priceRaw.replace(',', '.'));
            if (isNaN(parsedPrice)) {
              errors.push(`price inválido: "${priceRaw}"`);
            } else {
              price = parsedPrice;
            }
          }

          // Variant fields
          const variantModel = (row.variant_model || '').trim() || undefined;
          const variantColor = (row.variant_color || '').trim() || undefined;
          let variantSku = (row.variant_sku || '').trim() || undefined;
          const variantStockRaw = (row.variant_stock || '').trim();
          const variantPriceRaw = (row.variant_price || '').trim();

          // Determine if this row has a variant
          const hasVariant = Boolean(variantModel || variantColor || variantSku);

          // Variant price with fallback to product price
          let variantPrice = price;
          if (variantPriceRaw) {
            const parsedVP = parseFloat(variantPriceRaw.replace(',', '.'));
            if (isNaN(parsedVP)) {
              errors.push(`variant_price inválido: "${variantPriceRaw}"`);
            } else {
              variantPrice = parsedVP;
            }
          } else if (hasVariant) {
            warnings.push(`variant_price vazio: usando preço do produto (${price})`);
          }

          // Variant stock
          let variantStock = 0;
          if (variantStockRaw) {
            const parsedVS = parseInt(variantStockRaw, 10);
            if (isNaN(parsedVS)) {
              errors.push(`variant_stock inválido: "${variantStockRaw}"`);
            } else {
              variantStock = parsedVS;
            }
          }

          // Generate SKU if variant exists but SKU is empty
          if (hasVariant && !variantSku && productName && (variantModel || variantColor)) {
            variantSku = generateSku(productName, variantModel, variantColor);
            warnings.push(`variant_sku gerado: "${variantSku}"`);
          }

          // Price warning
          if (!priceRaw && !variantPriceRaw) {
            warnings.push('Preço ausente: definido como 0');
          }

          return {
            original: row,
            productId: (row.product_id || '').trim() || undefined,
            productName,
            category,
            status: inStock ? 'em_estoque' : 'esgotado',
            price,
            featured,
            imageUrl: (row.image_url || '').trim() || undefined,
            hasVariant,
            variantModel,
            variantColor,
            variantSku,
            variantPrice,
            variantStock,
            warnings,
            errors,
            rowIndex: index + 2, // +2 for 1-indexed + header row
          };
        });

        setParsedRows(rows);
      },
      error: (error) => {
        toast.error(`Erro ao ler arquivo: ${error.message}`);
      },
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseFile(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      parseFile(file);
    } else {
      toast.error('Por favor, selecione um arquivo CSV');
    }
  }, [parseFile]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const doImport = async () => {
    const rowsToImport = [...importable, ...withWarnings];
    if (rowsToImport.length === 0) {
      toast.error('Nenhuma linha válida para importar');
      return;
    }

    setIsImporting(true);

    try {
      // Group rows by product (for variants handling)
      const productMap = new Map<string, ParsedRow[]>();
      
      for (const row of rowsToImport) {
        const key = row.productId || row.productName;
        if (!productMap.has(key)) {
          productMap.set(key, []);
        }
        productMap.get(key)!.push(row);
      }

      let productsCreated = 0;
      let productsUpdated = 0;
      let variantsCreated = 0;

      for (const [key, rows] of productMap) {
        const firstRow = rows[0];
        let productId = firstRow.productId;

        if (productId) {
          // Update existing product
          const { error } = await supabase
            .from('products')
            .update({
              name: firstRow.productName,
              category: firstRow.category,
              price: firstRow.price,
              in_stock: firstRow.status === 'em_estoque',
              featured: firstRow.featured,
              image: firstRow.imageUrl,
            })
            .eq('id', productId);

          if (error) throw error;
          productsUpdated++;
        } else {
          // Create new product
          const { data, error } = await supabase
            .from('products')
            .insert({
              name: firstRow.productName,
              category: firstRow.category,
              price: firstRow.price,
              in_stock: firstRow.status === 'em_estoque',
              featured: firstRow.featured,
              image: firstRow.imageUrl,
            })
            .select('id')
            .single();

          if (error) throw error;
          productId = data.id;
          productsCreated++;
        }

        // Handle variants
        for (const row of rows) {
          if (row.hasVariant && row.variantSku) {
            // Check if variant exists
            const { data: existingVariant } = await supabase
              .from('product_variants')
              .select('id')
              .eq('product_id', productId)
              .eq('model', row.variantModel || '')
              .eq('color', row.variantColor || '')
              .maybeSingle();

            if (existingVariant) {
              // Update variant
              await supabase
                .from('product_variants')
                .update({
                  stock_quantity: row.variantStock,
                })
                .eq('id', existingVariant.id);
            } else {
              // Create variant
              const { error } = await supabase
                .from('product_variants')
                .insert({
                  product_id: productId,
                  model: row.variantModel || null,
                  color: row.variantColor || null,
                  stock_quantity: row.variantStock,
                });

              if (error) throw error;
              variantsCreated++;
            }
          }
        }
      }

      toast.success(
        `Importação concluída: ${productsCreated} criados, ${productsUpdated} atualizados, ${variantsCreated} variações`
      );
      setImportComplete(true);
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (error: any) {
      toast.error(`Erro na importação: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async () => {
    try {
      // Fetch products with variants
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (productsError) throw productsError;

      const { data: variants, error: variantsError } = await supabase
        .from('product_variants')
        .select('*');

      if (variantsError) throw variantsError;

      // Build export rows
      const exportRows: Record<string, string>[] = [];

      for (const product of products || []) {
        const productVariants = (variants || []).filter(v => v.product_id === product.id);

        if (productVariants.length === 0) {
          // Simple product - one row with empty variant fields
          exportRows.push({
            product_id: product.id,
            product_name: product.name,
            category: product.category,
            status: product.in_stock ? 'em_estoque' : 'esgotado',
            price: String(product.price),
            featured: product.featured ? 'true' : 'false',
            image_url: product.image || '',
            variant_model: '',
            variant_color: '',
            variant_sku: '',
            variant_price: '',
            variant_stock: '',
          });
        } else {
          // Product with variants - one row per variant
          for (const variant of productVariants) {
            exportRows.push({
              product_id: product.id,
              product_name: product.name,
              category: product.category,
              status: product.in_stock ? 'em_estoque' : 'esgotado',
              price: String(product.price),
              featured: product.featured ? 'true' : 'false',
              image_url: product.image || '',
              variant_model: variant.model || '',
              variant_color: variant.color || '',
              variant_sku: generateSku(product.name, variant.model || '', variant.color || ''),
              variant_price: String(product.price),
              variant_stock: String(variant.stock_quantity),
            });
          }
        }
      }

      const csv = Papa.unparse(exportRows, { columns: TEMPLATE_COLUMNS });
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `produtos_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Exportação concluída!');
    } catch (error: any) {
      toast.error(`Erro na exportação: ${error.message}`);
    }
  };

  const downloadTemplate = () => {
    const csv = Papa.unparse([{}], { columns: TEMPLATE_COLUMNS });
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_produtos.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template baixado!');
  };

  const resetState = () => {
    setParsedRows([]);
    setImportComplete(false);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetState();
    }
    onOpenChange(isOpen);
  };

  const renderRowPreview = (rows: ParsedRow[], type: 'ok' | 'warning' | 'error') => {
    if (rows.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma linha nesta categoria
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.rowIndex}
            className={`p-3 rounded-lg border ${
              type === 'error'
                ? 'border-destructive/50 bg-destructive/5'
                : type === 'warning'
                ? 'border-yellow-500/50 bg-yellow-500/5'
                : 'border-primary/50 bg-primary/5'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    Linha {row.rowIndex}
                  </Badge>
                  <span className="font-medium truncate">{row.productName || '(sem nome)'}</span>
                  {row.hasVariant && (
                    <Badge variant="secondary" className="text-xs">
                      Variação
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {row.category} • R$ {row.price.toFixed(2)}
                  {row.hasVariant && (
                    <span>
                      {' '}• {row.variantModel} {row.variantColor}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {row.warnings.length > 0 && (
              <div className="mt-2 space-y-1">
                {row.warnings.map((w, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-yellow-600">
                    <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}
            {row.errors.length > 0 && (
              <div className="mt-2 space-y-1">
                {row.errors.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-destructive">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    <span>{e}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar / Exportar Produtos
          </DialogTitle>
          <DialogDescription>
            Importe produtos via CSV ou exporte sua base atual
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Template
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar Produtos
            </Button>
          </div>

          {/* Upload area */}
          {parsedRows.length === 0 && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors"
            >
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">
                Arraste um arquivo CSV ou clique para selecionar
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload">
                <Button variant="secondary" asChild>
                  <span>Selecionar Arquivo</span>
                </Button>
              </label>
            </div>
          )}

          {/* Preview */}
          {parsedRows.length > 0 && !importComplete && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="default" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {importable.length} OK
                  </Badge>
                  <Badge variant="secondary" className="gap-1 bg-yellow-500/20 text-yellow-700">
                    <AlertTriangle className="h-3 w-3" />
                    {withWarnings.length} Avisos
                  </Badge>
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {withErrors.length} Erros
                  </Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={resetState}>
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              </div>

              <Tabs defaultValue="ok" className="flex-1 flex flex-col min-h-0">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="ok">Importáveis ({importable.length})</TabsTrigger>
                  <TabsTrigger value="warnings">Com Avisos ({withWarnings.length})</TabsTrigger>
                  <TabsTrigger value="errors">Com Erros ({withErrors.length})</TabsTrigger>
                </TabsList>
                <ScrollArea className="flex-1 mt-4">
                  <TabsContent value="ok" className="mt-0">
                    {renderRowPreview(importable, 'ok')}
                  </TabsContent>
                  <TabsContent value="warnings" className="mt-0">
                    {renderRowPreview(withWarnings, 'warning')}
                  </TabsContent>
                  <TabsContent value="errors" className="mt-0">
                    {renderRowPreview(withErrors, 'error')}
                  </TabsContent>
                </ScrollArea>
              </Tabs>
            </>
          )}

          {/* Import complete */}
          {importComplete && (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto text-primary mb-4" />
              <p className="text-lg font-medium">Importação concluída!</p>
              <p className="text-muted-foreground">
                Os produtos foram importados com sucesso.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Fechar
          </Button>
          {parsedRows.length > 0 && !importComplete && (
            <Button
              onClick={doImport}
              disabled={isImporting || (importable.length === 0 && withWarnings.length === 0)}
              className="bg-gradient-ocean"
            >
              {isImporting ? 'Importando...' : `Importar ${importable.length + withWarnings.length} Linhas`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProductImportExport;
