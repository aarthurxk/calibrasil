import { useState, useCallback, useEffect } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Upload, Download, FileSpreadsheet, AlertCircle, AlertTriangle, CheckCircle, X, History, RotateCcw, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type FileFormat = 'xlsx' | 'csv';

// Tipos de template
type TemplateType = 'simples' | 'variacoes' | 'completo';

// Colunas por tipo de template
const TEMPLATE_COLUMNS: Record<TemplateType, string[]> = {
  simples: ['nome_produto', 'categoria', 'status', 'preco', 'destaque'],
  variacoes: ['nome_produto', 'categoria', 'status', 'preco', 'destaque', 'modelo_variacao', 'cor_variacao', 'sku_variacao', 'preco_variacao', 'estoque_variacao'],
  completo: ['id_produto', 'nome_produto', 'categoria', 'status', 'preco', 'destaque', 'url_imagem', 'modelo_variacao', 'cor_variacao', 'sku_variacao', 'preco_variacao', 'estoque_variacao'],
};

// Mapeamento PT-BR para colunas internas
const COLUMN_MAP: Record<string, string> = {
  'id_produto': 'product_id',
  'nome_produto': 'product_name',
  'categoria': 'category',
  'status': 'status',
  'preco': 'price',
  'destaque': 'featured',
  'url_imagem': 'image_url',
  'modelo_variacao': 'variant_model',
  'cor_variacao': 'variant_color',
  'sku_variacao': 'variant_sku',
  'preco_variacao': 'variant_price',
  'estoque_variacao': 'variant_stock',
  // Also support english columns
  'product_id': 'product_id',
  'product_name': 'product_name',
  'category': 'category',
  'price': 'price',
  'featured': 'featured',
  'image_url': 'image_url',
  'variant_model': 'variant_model',
  'variant_color': 'variant_color',
  'variant_sku': 'variant_sku',
  'variant_price': 'variant_price',
  'variant_stock': 'variant_stock',
};

// Linhas de exemplo para templates
const EXAMPLE_ROWS: Record<TemplateType, Record<string, string>> = {
  simples: {
    nome_produto: 'Camiseta Básica',
    categoria: 'camisetas',
    status: 'em_estoque',
    preco: '79.90',
    destaque: 'false',
  },
  variacoes: {
    nome_produto: 'Camiseta Colorida',
    categoria: 'camisetas',
    status: 'em_estoque',
    preco: '89.90',
    destaque: 'true',
    modelo_variacao: 'M',
    cor_variacao: 'Azul',
    sku_variacao: 'CAM-M-AZL',
    preco_variacao: '89.90',
    estoque_variacao: '10',
  },
  completo: {
    id_produto: '',
    nome_produto: 'Camiseta Premium',
    categoria: 'camisetas',
    status: 'em_estoque',
    preco: '129.90',
    destaque: 'true',
    url_imagem: 'https://exemplo.com/imagem.jpg',
    modelo_variacao: 'G',
    cor_variacao: 'Preta',
    sku_variacao: 'CAM-G-PRT',
    preco_variacao: '129.90',
    estoque_variacao: '15',
  },
};

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

interface ImportJob {
  id: string;
  created_at: string;
  file_name: string;
  file_type: string;
  template_type: string;
  total_rows: number;
  created_count: number;
  updated_count: number;
  ignored_count: number;
  error_count: number;
  warning_count: number;
  status: string;
  rolled_back_at?: string;
}

interface ImportJobItem {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  previous_state: any;
  new_state: any;
}

interface RollbackReport {
  removed: number;
  restored: number;
  notFound: number;
  modifiedWarnings: string[];
}

interface ProductImportExportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Gerar SKU determinístico
const generateSku = (productName: string, model?: string, color?: string): string => {
  const parts = [productName, model, color].filter(Boolean);
  const base = parts.join('-').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);
  return base.toUpperCase();
};

// Normalizar colunas do CSV para formato interno
const normalizeRow = (row: Record<string, string>): Record<string, string> => {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = key.toLowerCase().trim();
    const internalKey = COLUMN_MAP[normalizedKey] || normalizedKey;
    normalized[internalKey] = value;
  }
  return normalized;
};

const ProductImportExport = ({ open, onOpenChange }: ProductImportExportProps) => {
  const [activeTab, setActiveTab] = useState<'importar' | 'exportar' | 'historico'>('importar');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('completo');
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [templateFormat, setTemplateFormat] = useState<FileFormat>('xlsx');
  const [exportFormat, setExportFormat] = useState<FileFormat>('xlsx');
  const [uploadedFileType, setUploadedFileType] = useState<FileFormat>('csv');
  
  // Histórico
  const [importJobs, setImportJobs] = useState<ImportJob[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedJobDetails, setSelectedJobDetails] = useState<ImportJobItem[] | null>(null);
  const [selectedJobForDetails, setSelectedJobForDetails] = useState<ImportJob | null>(null);
  
  // Rollback
  const [jobToRollback, setJobToRollback] = useState<ImportJob | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [rollbackReport, setRollbackReport] = useState<RollbackReport | null>(null);
  
  const queryClient = useQueryClient();

  const importable = parsedRows.filter(r => r.errors.length === 0 && r.warnings.length === 0);
  const withWarnings = parsedRows.filter(r => r.errors.length === 0 && r.warnings.length > 0);
  const withErrors = parsedRows.filter(r => r.errors.length > 0);

  // Carregar histórico
  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('import_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setImportJobs((data || []) as ImportJob[]);
    } catch (error: any) {
      toast.error(`Erro ao carregar histórico: ${error.message}`);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // Carregar detalhes de um job
  const loadJobDetails = async (job: ImportJob) => {
    try {
      const { data, error } = await supabase
        .from('import_job_items')
        .select('*')
        .eq('import_job_id', job.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      setSelectedJobDetails((data || []) as ImportJobItem[]);
      setSelectedJobForDetails(job);
    } catch (error: any) {
      toast.error(`Erro ao carregar detalhes: ${error.message}`);
    }
  };

  useEffect(() => {
    if (activeTab === 'historico' && open) {
      loadHistory();
    }
  }, [activeTab, open, loadHistory]);

  const processRowsData = useCallback((data: Record<string, string>[]) => {
    const rows: ParsedRow[] = data.map((rawRow: any, index: number) => {
      const row = normalizeRow(rawRow);
      const warnings: string[] = [];
      const errors: string[] = [];

      // Campos obrigatórios
      const productName = (row.product_name || '').trim();
      const category = (row.category || '').trim();

      if (!productName) errors.push('Coluna obrigatória ausente: nome_produto');
      if (!category) errors.push('Coluna obrigatória ausente: categoria');

      // Status com fallback
      let status = (row.status || '').trim().toLowerCase();
      if (!status) {
        status = 'em_estoque';
        warnings.push('Status vazio: usando "em_estoque"');
      }
      const inStock = status === 'em_estoque' || status === 'true' || status === '1';

      // Destaque com fallback
      let featured = false;
      const featuredRaw = (row.featured || '').trim().toLowerCase();
      if (featuredRaw === 'true' || featuredRaw === '1' || featuredRaw === 'sim') {
        featured = true;
      }

      // Validação de preço
      let price = 0;
      const priceRaw = (row.price || '').trim();
      if (priceRaw) {
        const parsedPrice = parseFloat(priceRaw.replace(',', '.'));
        if (isNaN(parsedPrice)) {
          errors.push(`Preço inválido na linha ${index + 2}: "${priceRaw}"`);
        } else {
          price = parsedPrice;
        }
      }

      // Campos de variação
      const variantModel = (row.variant_model || '').trim() || undefined;
      const variantColor = (row.variant_color || '').trim() || undefined;
      let variantSku = (row.variant_sku || '').trim() || undefined;
      const variantStockRaw = (row.variant_stock || '').trim();
      const variantPriceRaw = (row.variant_price || '').trim();

      // Determinar se tem variação
      const hasVariant = Boolean(variantModel || variantColor || variantSku);

      // Preço da variação com fallback
      let variantPrice = price;
      if (variantPriceRaw) {
        const parsedVP = parseFloat(variantPriceRaw.replace(',', '.'));
        if (isNaN(parsedVP)) {
          errors.push(`Preço da variação inválido na linha ${index + 2}: "${variantPriceRaw}"`);
        } else {
          variantPrice = parsedVP;
        }
      } else if (hasVariant) {
        warnings.push(`Preço da variação vazio: usando preço do produto (R$ ${price.toFixed(2)})`);
      }

      // Estoque da variação
      let variantStock = 0;
      if (variantStockRaw) {
        const parsedVS = parseInt(variantStockRaw, 10);
        if (isNaN(parsedVS)) {
          errors.push(`Estoque da variação inválido na linha ${index + 2}: "${variantStockRaw}"`);
        } else {
          variantStock = parsedVS;
        }
      }

      // Gerar SKU se variação existe mas SKU está vazio
      if (hasVariant && !variantSku && productName && (variantModel || variantColor)) {
        variantSku = generateSku(productName, variantModel, variantColor);
        warnings.push(`SKU gerado automaticamente: "${variantSku}"`);
      }

      // Aviso de preço ausente
      if (!priceRaw && !variantPriceRaw) {
        warnings.push('Preço ausente: definido como R$ 0,00');
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
        rowIndex: index + 2,
      };
    });

    setParsedRows(rows);
  }, []);

  const parseFile = useCallback((file: File) => {
    setParsedRows([]);
    setImportComplete(false);
    setUploadedFileName(file.name);

    const ext = file.name.split('.').pop()?.toLowerCase();
    
    if (ext === 'xlsx' || ext === 'xls') {
      setUploadedFileType('xlsx');
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: '' });
          processRowsData(jsonData);
        } catch (error: any) {
          toast.error(`Erro ao ler arquivo Excel: ${error.message}`);
        }
      };
      reader.onerror = () => {
        toast.error('Erro ao ler arquivo. Verifique se o arquivo está correto.');
      };
      reader.readAsArrayBuffer(file);
    } else if (ext === 'csv') {
      setUploadedFileType('csv');
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processRowsData(results.data as Record<string, string>[]);
        },
        error: (error) => {
          toast.error(`Erro ao ler arquivo CSV: ${error.message}`);
        },
      });
    } else {
      toast.error('Arquivo inválido. Envie um arquivo CSV ou XLSX.');
    }
  }, [processRowsData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
        toast.error('Arquivo inválido. Envie um arquivo CSV ou XLSX.');
        return;
      }
      parseFile(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
        toast.error('Arquivo inválido. Envie um arquivo CSV ou XLSX.');
        return;
      }
      parseFile(file);
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
      // Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser();

      // Agrupar linhas por produto
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
      let variantsUpdated = 0;
      const jobItems: Omit<ImportJobItem, 'id'>[] = [];

      for (const [key, rows] of productMap) {
        const firstRow = rows[0];
        let productId = firstRow.productId;

        if (productId) {
          // Buscar estado anterior para rollback
          const { data: existingProduct } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

          // Atualizar produto existente
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

          // Registrar para rollback
          if (existingProduct) {
            jobItems.push({
              entity_type: 'product',
              entity_id: productId,
              action: 'updated',
              previous_state: existingProduct,
              new_state: {
                name: firstRow.productName,
                category: firstRow.category,
                price: firstRow.price,
                in_stock: firstRow.status === 'em_estoque',
                featured: firstRow.featured,
                image: firstRow.imageUrl,
              },
            });
          }
        } else {
          // Criar novo produto
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
            .select('*')
            .single();

          if (error) throw error;
          productId = data.id;
          productsCreated++;

          // Registrar para rollback
          jobItems.push({
            entity_type: 'product',
            entity_id: productId,
            action: 'created',
            previous_state: null,
            new_state: data,
          });
        }

        // Processar variações
        for (const row of rows) {
          if (row.hasVariant && row.variantSku) {
            // Verificar se variação existe
            const { data: existingVariant } = await supabase
              .from('product_variants')
              .select('*')
              .eq('product_id', productId)
              .eq('model', row.variantModel || '')
              .eq('color', row.variantColor || '')
              .maybeSingle();

            if (existingVariant) {
              // Atualizar variação
              await supabase
                .from('product_variants')
                .update({
                  stock_quantity: row.variantStock,
                })
                .eq('id', existingVariant.id);
              
              variantsUpdated++;

              jobItems.push({
                entity_type: 'product_variant',
                entity_id: existingVariant.id,
                action: 'updated',
                previous_state: existingVariant,
                new_state: { ...existingVariant, stock_quantity: row.variantStock },
              });
            } else {
              // Criar variação
              const { data: newVariant, error } = await supabase
                .from('product_variants')
                .insert({
                  product_id: productId,
                  model: row.variantModel || null,
                  color: row.variantColor || null,
                  stock_quantity: row.variantStock,
                })
                .select('*')
                .single();

              if (error) throw error;
              variantsCreated++;

              jobItems.push({
                entity_type: 'product_variant',
                entity_id: newVariant.id,
                action: 'created',
                previous_state: null,
                new_state: newVariant,
              });
            }
          }
        }
      }

      // Salvar job de importação
      const { data: importJob, error: jobError } = await supabase
        .from('import_jobs')
        .insert({
          created_by: user?.id,
          file_name: uploadedFileName,
          file_type: uploadedFileType,
          template_type: selectedTemplate,
          total_rows: rowsToImport.length,
          created_count: productsCreated + variantsCreated,
          updated_count: productsUpdated + variantsUpdated,
          ignored_count: withErrors.length,
          error_count: withErrors.length,
          warning_count: withWarnings.length,
          status: 'concluida',
        })
        .select('id')
        .single();

      if (jobError) {
        console.error('Erro ao salvar histórico:', jobError);
      } else if (importJob && jobItems.length > 0) {
        // Salvar itens do job
        const { error: itemsError } = await supabase
          .from('import_job_items')
          .insert(jobItems.map(item => ({
            ...item,
            import_job_id: importJob.id,
          })));
        
        if (itemsError) {
          console.error('Erro ao salvar itens do histórico:', itemsError);
        }
      }

      toast.success(
        `Importação concluída: ${productsCreated} produtos criados, ${productsUpdated} atualizados, ${variantsCreated} variações criadas`
      );
      setImportComplete(true);
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (error: any) {
      toast.error(`Falha na importação: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleExport = async () => {
    try {
      // Buscar produtos com variações
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (productsError) throw productsError;

      const { data: variants, error: variantsError } = await supabase
        .from('product_variants')
        .select('*');

      if (variantsError) throw variantsError;

      // Construir linhas de exportação
      const exportRows: Record<string, string>[] = [];
      const columns = TEMPLATE_COLUMNS.completo;

      for (const product of products || []) {
        const productVariants = (variants || []).filter(v => v.product_id === product.id);

        if (productVariants.length === 0) {
          // Produto simples
          exportRows.push({
            id_produto: product.id,
            nome_produto: product.name,
            categoria: product.category,
            status: product.in_stock ? 'em_estoque' : 'esgotado',
            preco: String(product.price),
            destaque: product.featured ? 'true' : 'false',
            url_imagem: product.image || '',
            modelo_variacao: '',
            cor_variacao: '',
            sku_variacao: '',
            preco_variacao: '',
            estoque_variacao: '',
          });
        } else {
          // Produto com variações
          for (const variant of productVariants) {
            exportRows.push({
              id_produto: product.id,
              nome_produto: product.name,
              categoria: product.category,
              status: product.in_stock ? 'em_estoque' : 'esgotado',
              preco: String(product.price),
              destaque: product.featured ? 'true' : 'false',
              url_imagem: product.image || '',
              modelo_variacao: variant.model || '',
              cor_variacao: variant.color || '',
              sku_variacao: generateSku(product.name, variant.model || '', variant.color || ''),
              preco_variacao: String(product.price),
              estoque_variacao: String(variant.stock_quantity),
            });
          }
        }
      }

      const dateStr = new Date().toISOString().split('T')[0];

      if (exportFormat === 'xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(exportRows, { header: columns });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtos');
        XLSX.writeFile(workbook, `produtos_${dateStr}.xlsx`);
      } else {
        const csv = Papa.unparse(exportRows, { columns });
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `produtos_${dateStr}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast.success('Exportação concluída!');
    } catch (error: any) {
      toast.error(`Falha na exportação: ${error.message}`);
    }
  };

  const downloadTemplate = () => {
    const columns = TEMPLATE_COLUMNS[selectedTemplate];
    const exampleRow = EXAMPLE_ROWS[selectedTemplate];
    
    if (templateFormat === 'xlsx') {
      const worksheet = XLSX.utils.json_to_sheet([exampleRow], { header: columns });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
      XLSX.writeFile(workbook, `template_${selectedTemplate}_produtos.xlsx`);
    } else {
      const csv = Papa.unparse([exampleRow], { columns });
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template_${selectedTemplate}_produtos.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    toast.success('Template baixado com sucesso!');
  };

  // Rollback de importação
  const executeRollback = async (job: ImportJob) => {
    setIsRollingBack(true);
    const report: RollbackReport = {
      removed: 0,
      restored: 0,
      notFound: 0,
      modifiedWarnings: [],
    };

    try {
      // Buscar itens do job
      const { data: items, error } = await supabase
        .from('import_job_items')
        .select('*')
        .eq('import_job_id', job.id)
        .order('created_at', { ascending: false }); // Reverter na ordem inversa

      if (error) throw error;

      for (const item of (items || []) as ImportJobItem[]) {
        try {
          if (item.action === 'created') {
            // Deletar entidade criada
            const table = item.entity_type === 'product' ? 'products' : 'product_variants';
            
            // Verificar se ainda existe
            const { data: existing } = await supabase
              .from(table)
              .select('id')
              .eq('id', item.entity_id)
              .maybeSingle();

            if (!existing) {
              report.notFound++;
              continue;
            }

            // Se for produto, deletar variações associadas primeiro
            if (item.entity_type === 'product') {
              await supabase
                .from('product_variants')
                .delete()
                .eq('product_id', item.entity_id);
            }

            const { error: deleteError } = await supabase
              .from(table)
              .delete()
              .eq('id', item.entity_id);

            if (deleteError) throw deleteError;
            report.removed++;
          } else if (item.action === 'updated' && item.previous_state) {
            // Restaurar estado anterior
            const table = item.entity_type === 'product' ? 'products' : 'product_variants';
            
            // Verificar se ainda existe
            const { data: existing } = await supabase
              .from(table)
              .select('*')
              .eq('id', item.entity_id)
              .maybeSingle();

            if (!existing) {
              report.notFound++;
              continue;
            }

            // Verificar se foi modificado após a importação
            const currentState = JSON.stringify(existing);
            const importedState = JSON.stringify(item.new_state);
            if (currentState !== importedState) {
              report.modifiedWarnings.push(
                `${item.entity_type === 'product' ? 'Produto' : 'Variação'} alterado após importação: ${item.entity_id.slice(0, 8)}...`
              );
            }

            // Preparar dados para restauração (excluir campos que não devem ser atualizados)
            const { id, created_at, ...restoreData } = item.previous_state;

            const { error: updateError } = await supabase
              .from(table)
              .update(restoreData)
              .eq('id', item.entity_id);

            if (updateError) throw updateError;
            report.restored++;
          }
        } catch (itemError: any) {
          console.error(`Erro ao reverter item ${item.id}:`, itemError);
        }
      }

      // Marcar job como desfeito
      const { data: { user } } = await supabase.auth.getUser();
      await supabase
        .from('import_jobs')
        .update({
          status: 'desfeita',
          rolled_back_at: new Date().toISOString(),
          rolled_back_by: user?.id,
        })
        .eq('id', job.id);

      setRollbackReport(report);
      toast.success('Importação desfeita com sucesso!');
      loadHistory();
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    } catch (error: any) {
      toast.error(`Falha ao desfazer importação: ${error.message}`);
    } finally {
      setIsRollingBack(false);
      setJobToRollback(null);
    }
  };

  const resetState = () => {
    setParsedRows([]);
    setImportComplete(false);
    setUploadedFileName('');
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      resetState();
      setSelectedJobDetails(null);
      setSelectedJobForDetails(null);
      setRollbackReport(null);
    }
    onOpenChange(isOpen);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'concluida':
        return <Badge variant="default" className="bg-primary/20 text-primary">Concluída</Badge>;
      case 'desfeita':
        return <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700">Desfeita</Badge>;
      case 'falhou':
        return <Badge variant="destructive">Falhou</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importar / Exportar Produtos
            </DialogTitle>
            <DialogDescription>
              Importe produtos via CSV, exporte sua base ou gerencie o histórico de importações
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="importar" className="gap-2">
                <Upload className="h-4 w-4" />
                Importar
              </TabsTrigger>
              <TabsTrigger value="exportar" className="gap-2">
                <Download className="h-4 w-4" />
                Exportar
              </TabsTrigger>
              <TabsTrigger value="historico" className="gap-2">
                <History className="h-4 w-4" />
                Histórico
              </TabsTrigger>
            </TabsList>

            {/* Aba Importar */}
            <TabsContent value="importar" className="flex-1 flex flex-col gap-4 mt-4 overflow-hidden">
              {/* Seletor de template e download */}
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <Label>Modelo de planilha</Label>
                  <Select value={selectedTemplate} onValueChange={(v) => setSelectedTemplate(v as TemplateType)}>
                    <SelectTrigger className="w-[280px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simples">Produto simples (sem variações)</SelectItem>
                      <SelectItem value="variacoes">Produto com variações (modelo/cor/sku)</SelectItem>
                      <SelectItem value="completo">Completo (com extras)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Formato</Label>
                  <Select value={templateFormat} onValueChange={(v) => setTemplateFormat(v as FileFormat)}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="xlsx">XLSX (Excel)</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Modelo
                </Button>
              </div>

              {/* Área de upload */}
              {parsedRows.length === 0 && (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors"
                >
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">
                    Arraste um arquivo CSV ou XLSX aqui, ou clique para selecionar
                  </p>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
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
                        {importable.length} Importáveis
                      </Badge>
                      <Badge variant="secondary" className="gap-1 bg-yellow-500/20 text-yellow-700">
                        <AlertTriangle className="h-3 w-3" />
                        {withWarnings.length} Com Avisos
                      </Badge>
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {withErrors.length} Com Erros
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
                    Os produtos foram importados com sucesso. Você pode desfazer esta importação na aba Histórico.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Aba Exportar */}
            <TabsContent value="exportar" className="flex-1 flex flex-col gap-4 mt-4">
              <div className="text-center py-12">
                <Download className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Exportar Produtos</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Exporte todos os produtos cadastrados. Produtos com variações terão uma linha por variação.
                </p>
                <div className="flex items-center justify-center gap-4">
                  <div className="space-y-2">
                    <Label>Formato</Label>
                    <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as FileFormat)}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="xlsx">XLSX (Excel)</SelectItem>
                        <SelectItem value="csv">CSV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleExport} className="bg-gradient-ocean self-end">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Produtos
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Aba Histórico */}
            <TabsContent value="historico" className="flex-1 flex flex-col gap-4 mt-4 overflow-hidden">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : importJobs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma importação registrada</p>
                </div>
              ) : (
                <ScrollArea className="flex-1">
                  <div className="space-y-3">
                    {importJobs.map((job) => (
                      <div
                        key={job.id}
                        className="p-4 rounded-lg border bg-card"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium truncate">{job.file_name}</span>
                              {getStatusBadge(job.status)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(job.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              {' • '}
                              <Badge variant="outline" className="text-xs">{job.template_type}</Badge>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2 text-sm">
                              <span className="text-primary">{job.created_count} criados</span>
                              <span className="text-muted-foreground">•</span>
                              <span className="text-blue-600">{job.updated_count} atualizados</span>
                              {job.error_count > 0 && (
                                <>
                                  <span className="text-muted-foreground">•</span>
                                  <span className="text-destructive">{job.error_count} erros</span>
                                </>
                              )}
                              {job.warning_count > 0 && (
                                <>
                                  <span className="text-muted-foreground">•</span>
                                  <span className="text-yellow-600">{job.warning_count} avisos</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => loadJobDetails(job)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Detalhes
                            </Button>
                            {job.status === 'concluida' && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setJobToRollback(job)}
                              >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Desfazer
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleClose(false)}>
              Fechar
            </Button>
            {activeTab === 'importar' && parsedRows.length > 0 && !importComplete && (
              <Button
                onClick={doImport}
                disabled={isImporting || (importable.length === 0 && withWarnings.length === 0)}
                className="bg-gradient-ocean"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  `Importar ${importable.length + withWarnings.length} Linhas`
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de detalhes do job */}
      <Dialog open={!!selectedJobForDetails} onOpenChange={() => { setSelectedJobDetails(null); setSelectedJobForDetails(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Detalhes da Importação</DialogTitle>
            <DialogDescription>
              {selectedJobForDetails?.file_name} - {selectedJobForDetails && format(new Date(selectedJobForDetails.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-2">
              {selectedJobDetails?.map((item) => (
                <div key={item.id} className="p-3 rounded-lg border bg-muted/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={item.action === 'created' ? 'default' : 'secondary'}>
                      {item.action === 'created' ? 'Criado' : 'Atualizado'}
                    </Badge>
                    <Badge variant="outline">
                      {item.entity_type === 'product' ? 'Produto' : 'Variação'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    ID: {item.entity_id}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de rollback */}
      <AlertDialog open={!!jobToRollback} onOpenChange={() => setJobToRollback(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desfazer Importação</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está prestes a desfazer a importação do arquivo <strong>{jobToRollback?.file_name}</strong>.
              </p>
              <p>Esta ação irá:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Remover produtos e variações criados nesta importação</li>
                <li>Restaurar o estado anterior dos itens que foram atualizados</li>
              </ul>
              <p className="text-yellow-600">
                ⚠️ Esta ação não pode ser desfeita.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRollingBack}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => jobToRollback && executeRollback(jobToRollback)}
              disabled={isRollingBack}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRollingBack ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Desfazendo...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Confirmar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de relatório de rollback */}
      <Dialog open={!!rollbackReport} onOpenChange={() => setRollbackReport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Relatório de Rollback</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-destructive/10 text-center">
                <p className="text-2xl font-bold text-destructive">{rollbackReport?.removed}</p>
                <p className="text-sm text-muted-foreground">Removidos</p>
              </div>
              <div className="p-4 rounded-lg bg-primary/10 text-center">
                <p className="text-2xl font-bold text-primary">{rollbackReport?.restored}</p>
                <p className="text-sm text-muted-foreground">Restaurados</p>
              </div>
              <div className="p-4 rounded-lg bg-muted text-center">
                <p className="text-2xl font-bold">{rollbackReport?.notFound}</p>
                <p className="text-sm text-muted-foreground">Não encontrados</p>
              </div>
            </div>
            {rollbackReport?.modifiedWarnings && rollbackReport.modifiedWarnings.length > 0 && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <p className="font-medium text-yellow-700 mb-2">Avisos:</p>
                <ul className="text-sm text-yellow-600 space-y-1">
                  {rollbackReport.modifiedWarnings.map((w, i) => (
                    <li key={i}>• {w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setRollbackReport(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProductImportExport;
