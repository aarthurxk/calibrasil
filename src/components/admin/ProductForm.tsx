import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Upload, Loader2, Plus, GripVertical } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const MAX_IMAGES = 6;

interface ProductFormData {
  id?: string;
  codigo_produto: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  category: string;
  colors: string[];
  color_codes: Record<string, string>;
  models: string[];
  sizes: string[];
  image?: string;
  images: string[];
  in_stock: boolean;
  featured: boolean;
}

interface VariantStock {
  model: string | null;
  color: string | null;
  variant_id?: string;
  stocks: Record<string, number>; // { store_id: quantidade }
}

interface Store {
  id: string;
  name: string;
  code: string;
  display_order: number | null;
}

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: {
    id?: string;
    codigo_produto?: string | null;
    name?: string;
    description?: string;
    price?: number;
    original_price?: number;
    category?: string;
    color?: string[] | string | null;
    color_codes?: Record<string, string> | null;
    model?: string[] | string | null;
    sizes?: string[];
    image?: string;
    images?: string[];
    in_stock?: boolean;
    featured?: boolean;
  } | null;
}

const CATEGORIES = ['Tech', 'Acessórios', 'Vestuário', 'Esporte'];
const SIZE_OPTIONS = ['PP', 'P', 'M', 'G', 'GG', 'XGG', 'Único'];

const PREDEFINED_COLORS: { name: string; hex: string }[] = [
  { name: 'Preto', hex: '#1a1a1a' },
  { name: 'Branco', hex: '#ffffff' },
  { name: 'Azul', hex: '#3b82f6' },
  { name: 'Azul Marinho', hex: '#1e3a5f' },
  { name: 'Verde', hex: '#22c55e' },
  { name: 'Verde-água', hex: '#14b8a6' },
  { name: 'Rosa', hex: '#ec4899' },
  { name: 'Vermelho', hex: '#ef4444' },
  { name: 'Amarelo', hex: '#eab308' },
  { name: 'Laranja', hex: '#f97316' },
  { name: 'Roxo', hex: '#a855f7' },
  { name: 'Cinza', hex: '#6b7280' },
  { name: 'Bege', hex: '#d4a574' },
  { name: 'Coral', hex: '#ff7f50' },
];

const PHONE_MODELS = [
  'iPhone 16 Pro Max',
  'iPhone 16 Pro',
  'iPhone 16',
  'iPhone 15 Pro Max',
  'iPhone 15 Pro',
  'iPhone 15',
  'iPhone 14 Pro Max',
  'iPhone 14 Pro',
  'iPhone 14',
  'iPhone 13',
  'iPhone 12',
  'Samsung Galaxy S24 Ultra',
  'Samsung Galaxy S24+',
  'Samsung Galaxy S24',
  'Samsung Galaxy S23',
  'Samsung Galaxy A54',
  'Xiaomi 14',
  'Xiaomi 13',
];

// Normalizar nome do modelo (capitalização consistente)
// Ex: "iphone 12 pro max" -> "iPhone 12 Pro Max"
const normalizeModelName = (model: string): string => {
  if (!model) return '';
  const trimmed = model.trim();
  if (!trimmed) return '';
  
  const specialWords: Record<string, string> = {
    'iphone': 'iPhone',
    'ipad': 'iPad',
    'macbook': 'MacBook',
    'airpods': 'AirPods',
    'pro': 'Pro',
    'max': 'Max',
    'mini': 'Mini',
    'plus': 'Plus',
    'ultra': 'Ultra',
    'se': 'SE',
    'galaxy': 'Galaxy',
    'samsung': 'Samsung',
    'xiaomi': 'Xiaomi',
  };
  
  return trimmed.split(' ').map(word => {
    const lower = word.toLowerCase();
    if (specialWords[lower]) return specialWords[lower];
    if (/^\d+$/.test(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
};

// Sortable Image Component
interface SortableImageItemProps {
  id: string;
  src: string;
  index: number;
  color?: string;
  colorHex?: string;
  onRemove: () => void;
}

const SortableImageItem = ({ id, src, index, color, colorHex, onRemove }: SortableImageItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative w-24 h-24 rounded-lg overflow-hidden border ${
        isDragging ? 'border-primary shadow-lg' : 'border-border'
      } group`}
    >
      {/* Position and Color Indicator */}
      <div className="absolute top-1 left-1 z-10 flex items-center gap-1">
        <span className="bg-background/90 text-foreground text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center shadow-sm border border-border">
          {index + 1}
        </span>
        {color && (
          <span
            className="w-4 h-4 rounded-full border-2 border-background shadow-sm"
            style={{ backgroundColor: colorHex || '#ccc' }}
            title={color}
          />
        )}
      </div>
      
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
      >
        <img src={src} alt={`Produto ${index + 1}`} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <GripVertical className="h-6 w-6 text-white opacity-0 group-hover:opacity-70 transition-opacity drop-shadow-md" />
        </div>
      </div>
      
      {/* Remove Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 z-20 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
};

const ProductForm = ({ open, onOpenChange, initialData }: ProductFormProps) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [customColor, setCustomColor] = useState('');
  const [customColorHex, setCustomColorHex] = useState('#000000');
  const [customModel, setCustomModel] = useState('');
  const [variantStocks, setVariantStocks] = useState<VariantStock[]>([]);
  
  // Refs para controle de estado
  const isVariantsInitialized = useRef(false);
  const prevInitialDataId = useRef<string | undefined>(undefined);
  const prevOpen = useRef(false);

  const parseColors = useCallback((color: string[] | string | null | undefined): string[] => {
    if (!color) return [];
    if (Array.isArray(color)) return color;
    return [color];
  }, []);

  const parseModels = useCallback((model: string[] | string | null | undefined): string[] => {
    if (!model) return [];
    if (Array.isArray(model)) return model;
    return [model];
  }, []);

  // Memoizar dados iniciais baseado no ID
  const initialFormData = useMemo((): ProductFormData => ({
    codigo_produto: initialData?.codigo_produto || '',
    name: initialData?.name || '',
    description: initialData?.description || '',
    price: initialData?.price || 0,
    original_price: initialData?.original_price || undefined,
    category: initialData?.category || '',
    colors: parseColors(initialData?.color),
    color_codes: initialData?.color_codes || {},
    models: parseModels(initialData?.model),
    sizes: initialData?.sizes || [],
    image: initialData?.image || '',
    images: initialData?.images || [],
    in_stock: initialData?.in_stock ?? true,
    featured: initialData?.featured ?? false,
  }), [initialData?.id, parseColors, parseModels]);

  const [formData, setFormData] = useState<ProductFormData>(initialFormData);

  // Fetch stores
  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, code, display_order')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data as Store[];
    },
  });

  // Fetch existing variants when editing
  const { data: existingVariants = [] } = useQuery({
    queryKey: ['product-variants-with-stock', initialData?.id],
    queryFn: async () => {
      if (!initialData?.id) return [];
      
      const { data: variants, error: variantError } = await supabase
        .from('product_variants')
        .select('id, model, color, stock_quantity')
        .eq('product_id', initialData.id);
      
      if (variantError) throw variantError;
      if (!variants || variants.length === 0) return [];
      
      const { data: stockData, error: stockError } = await supabase
        .from('store_stock')
        .select('product_variant_id, store_id, quantity')
        .in('product_variant_id', variants.map(v => v.id));
      
      if (stockError) throw stockError;
      
      return variants.map(v => ({
        variant_id: v.id,
        model: v.model,
        color: v.color,
        stocks: Object.fromEntries(
          (stockData || [])
            .filter(s => s.product_variant_id === v.id)
            .map(s => [s.store_id, s.quantity])
        ),
      }));
    },
    enabled: !!initialData?.id && open,
  });

  // Reset form quando dialog abre/fecha ou produto muda
  useEffect(() => {
    const justOpened = open && !prevOpen.current;
    const productChanged = initialData?.id !== prevInitialDataId.current;
    
    if (open && (justOpened || productChanged)) {
      // Dialog abriu ou produto mudou - resetar tudo
      setFormData(initialFormData);
      setVariantStocks([]);
      isVariantsInitialized.current = false;
      prevInitialDataId.current = initialData?.id;
    }
    
    if (!open && prevOpen.current) {
      // Dialog fechou - limpar flags
      isVariantsInitialized.current = false;
      prevInitialDataId.current = undefined;
    }
    
    prevOpen.current = open;
  }, [open, initialData?.id, initialFormData]);

  // Inicializar variantes de produto existente
  useEffect(() => {
    if (!open || isVariantsInitialized.current) return;
    if (!initialData?.id) return;
    
    if (existingVariants.length > 0) {
      setVariantStocks(existingVariants.map(v => ({
        variant_id: v.variant_id,
        model: v.model,
        color: v.color,
        stocks: v.stocks || {},
      })));
      isVariantsInitialized.current = true;
    }
  }, [existingVariants, open, initialData?.id]);

  // Gerar combinações de variantes quando cores/modelos mudam
  const generateVariants = useCallback((colors: string[], models: string[]) => {
    const colorList = colors.length > 0 ? colors : [null];
    const modelList = models.length > 0 ? models : [null];
    
    const emptyStocks = Object.fromEntries(stores.map(s => [s.id, 0]));
    
    const newVariants: VariantStock[] = [];
    for (const color of colorList) {
      for (const model of modelList) {
        if (color === null && model === null) continue;
        newVariants.push({ model, color, stocks: { ...emptyStocks } });
      }
    }
    return newVariants;
  }, [stores]);

  // Atualizar variantes quando cores/modelos mudam (apenas para novos produtos ou após inicialização)
  useEffect(() => {
    // Não gerar se dialog fechado
    if (!open) return;
    // Não gerar se lojas ainda não carregaram
    if (stores.length === 0) return;
    // Não gerar se estamos em modo edição e ainda não inicializamos as variantes existentes
    if (initialData?.id && !isVariantsInitialized.current) return;

    const newVariants = generateVariants(formData.colors, formData.models);
    
    setVariantStocks(prev => {
      // Se não há variantes para gerar, manter vazio
      if (newVariants.length === 0) {
        return prev.length === 0 ? prev : [];
      }
      
      // Preservar quantidades existentes
      const updated = newVariants.map(newV => {
        const existing = prev.find(p => p.color === newV.color && p.model === newV.model);
        if (existing) {
          // Merge: manter stocks existentes, adicionar novas lojas com 0
          const mergedStocks = { ...newV.stocks };
          Object.entries(existing.stocks).forEach(([storeId, qty]) => {
            mergedStocks[storeId] = qty;
          });
          return { ...newV, variant_id: existing.variant_id, stocks: mergedStocks };
        }
        return newV;
      });
      
      // Verificar se algo realmente mudou
      if (prev.length === updated.length) {
        const same = prev.every((p, i) => 
          p.color === updated[i].color && 
          p.model === updated[i].model &&
          JSON.stringify(p.stocks) === JSON.stringify(updated[i].stocks)
        );
        if (same) return prev;
      }
      
      return updated;
    });
  }, [formData.colors, formData.models, open, initialData?.id, generateVariants, stores]);

  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const validateImageFile = (file: File): { valid: boolean; error?: string } => {
    // Validate MIME type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return { 
        valid: false, 
        error: `Tipo de arquivo não permitido: ${file.type}. Use JPEG, PNG, WebP ou GIF.` 
      };
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return { 
        valid: false, 
        error: `Arquivo muito grande (${sizeMB}MB). Máximo permitido: 5MB.` 
      };
    }
    
    // Validate file extension matches MIME type
    const ext = file.name.split('.').pop()?.toLowerCase();
    const validExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
    if (!ext || !validExtensions.includes(ext)) {
      return { 
        valid: false, 
        error: `Extensão de arquivo inválida. Use .jpg, .jpeg, .png, .webp ou .gif.` 
      };
    }
    
    return { valid: true };
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentCount = formData.images.length;
    const remainingSlots = MAX_IMAGES - currentCount;

    if (remainingSlots <= 0) {
      toast.error(`Limite de ${MAX_IMAGES} fotos atingido`);
      return;
    }

    // Validate all files before upload
    const validFiles: File[] = [];
    for (const file of Array.from(files)) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        toast.error(validation.error);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) {
      return;
    }

    const filesToUpload = validFiles.slice(0, remainingSlots);
    
    if (validFiles.length > remainingSlots) {
      toast.warning(`Apenas ${remainingSlots} foto(s) serão adicionadas (limite de ${MAX_IMAGES})`);
    }

    setUploadingImages(true);
    const newImages: string[] = [];

    try {
      for (const file of filesToUpload) {
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, file, {
            contentType: file.type,
            cacheControl: '3600',
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        newImages.push(publicUrl);
      }

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...newImages],
        image: prev.image || newImages[0] || '',
      }));
      
      toast.success('Imagens enviadas com sucesso!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar imagens');
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => {
      const newImages = prev.images.filter((_, i) => i !== index);
      return {
        ...prev,
        images: newImages,
        image: newImages[0] || '',
      };
    });
  };

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFormData(prev => {
        const oldIndex = prev.images.findIndex(img => img === active.id);
        const newIndex = prev.images.findIndex(img => img === over.id);
        const newImages = arrayMove(prev.images, oldIndex, newIndex);
        return {
          ...prev,
          images: newImages,
          image: newImages[0] || '',
        };
      });
    }
  };

  const handleSizeToggle = (size: string) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size],
    }));
  };

  const handleColorToggle = (colorName: string, hexCode: string) => {
    setFormData(prev => {
      const isSelected = prev.colors.includes(colorName);
      if (isSelected) {
        const { [colorName]: _, ...restCodes } = prev.color_codes;
        return {
          ...prev,
          colors: prev.colors.filter(c => c !== colorName),
          color_codes: restCodes,
        };
      } else {
        return {
          ...prev,
          colors: [...prev.colors, colorName],
          color_codes: { ...prev.color_codes, [colorName]: hexCode },
        };
      }
    });
  };

  const handleAddCustomColor = () => {
    if (!customColor.trim()) return;
    handleColorToggle(customColor.trim(), customColorHex);
    setCustomColor('');
    setCustomColorHex('#000000');
  };

  const handleModelToggle = (model: string) => {
    const normalizedModel = normalizeModelName(model);
    setFormData(prev => ({
      ...prev,
      models: prev.models.includes(normalizedModel)
        ? prev.models.filter(m => m !== normalizedModel)
        : [...prev.models, normalizedModel],
    }));
  };

  const handleAddCustomModel = () => {
    if (!customModel.trim()) return;
    const normalizedModel = normalizeModelName(customModel.trim());
    if (!formData.models.includes(normalizedModel)) {
      setFormData(prev => ({
        ...prev,
        models: [...prev.models, normalizedModel],
      }));
    }
    setCustomModel('');
  };

  const updateVariantStock = (model: string | null, color: string | null, storeId: string, quantity: number) => {
    setVariantStocks(prev => prev.map(v => 
      v.model === model && v.color === color
        ? { ...v, stocks: { ...v.stocks, [storeId]: quantity } }
        : v
    ));
  };

  const getVariantTotal = (variant: VariantStock) => {
    return Object.values(variant.stocks).reduce((sum, qty) => sum + qty, 0);
  };

  // Validar formato do código do produto
  const validateCodigoProduto = (code: string): { valid: boolean; error?: string } => {
    if (!code || code.trim() === '') {
      return { valid: true }; // Vazio é válido (será gerado automaticamente)
    }
    const trimmed = code.trim().toUpperCase();
    // Aceita C-XXX ou apenas XXX (1-5 dígitos)
    if (!/^(C-)?[0-9]{1,5}$/.test(trimmed)) {
      return { valid: false, error: 'Código inválido. Use o formato C-001 ou 001.' };
    }
    return { valid: true };
  };

  // Normalizar código do produto (adiciona prefixo C- se necessário)
  const normalizeCodigoProduto = (code: string): string => {
    if (!code || code.trim() === '') return '';
    const trimmed = code.trim().toUpperCase();
    if (/^[0-9]{1,5}$/.test(trimmed)) {
      return 'C-' + trimmed.padStart(3, '0');
    }
    return trimmed;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.category || formData.price <= 0) {
      toast.error('Preencha os campos obrigatórios: nome, categoria e preço');
      return;
    }

    // Validar código do produto
    const codeValidation = validateCodigoProduto(formData.codigo_produto);
    if (!codeValidation.valid) {
      toast.error(codeValidation.error);
      return;
    }

    setIsSubmitting(true);

    try {
      // Gerar ou normalizar código do produto
      let codigoProduto = normalizeCodigoProduto(formData.codigo_produto);
      
      if (!codigoProduto && !initialData?.id) {
        // Gerar próximo código automaticamente
        const { data: nextCode, error: codeError } = await supabase
          .rpc('generate_next_product_code');
        
        if (codeError) {
          console.error('Erro ao gerar código:', codeError);
          toast.error('Erro ao gerar código do produto');
          setIsSubmitting(false);
          return;
        }
        codigoProduto = nextCode;
      }

      // Verificar unicidade do código (exceto para o próprio produto)
      if (codigoProduto) {
        const { data: existing, error: checkError } = await supabase
          .from('products')
          .select('id, codigo_produto')
          .eq('codigo_produto', codigoProduto)
          .maybeSingle();

        if (checkError) throw checkError;

        if (existing && existing.id !== initialData?.id) {
          toast.error(`Código do produto já existe: ${codigoProduto}`);
          setIsSubmitting(false);
          return;
        }
      }

      const productData = {
        codigo_produto: codigoProduto || null,
        name: formData.name,
        description: formData.description,
        price: formData.price,
        original_price: formData.original_price || null,
        category: formData.category,
        color: formData.colors.length > 0 ? formData.colors : null,
        color_codes: Object.keys(formData.color_codes).length > 0 ? formData.color_codes : null,
        model: formData.models.length > 0 ? formData.models : null,
        sizes: formData.sizes.length > 0 ? formData.sizes : null,
        image: formData.image || formData.images[0] || null,
        images: formData.images.length > 0 ? formData.images : null,
        in_stock: formData.in_stock,
        featured: formData.featured,
      };

      let productId = initialData?.id;

      if (initialData?.id) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', initialData.id);
        
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert(productData)
          .select('id')
          .single();
        
        if (error) throw error;
        productId = data.id;
      }

      // Save variant stocks
      if (productId && variantStocks.length > 0) {
        // Delete existing store_stock for this product's variants
        const { data: existingVars } = await supabase
          .from('product_variants')
          .select('id')
          .eq('product_id', productId);
        
        if (existingVars && existingVars.length > 0) {
          await supabase
            .from('store_stock')
            .delete()
            .in('product_variant_id', existingVars.map(v => v.id));
        }
        
        // Delete existing variants
        await supabase.from('product_variants').delete().eq('product_id', productId);
        
        // Insert new variants with normalized model names
        const variantsToInsert = variantStocks.map(v => ({
          product_id: productId,
          model: v.model ? normalizeModelName(v.model) : null,
          color: v.color,
          stock_quantity: getVariantTotal(v), // Total for backwards compatibility
        }));
        
        const { data: savedVariants, error: variantError } = await supabase
          .from('product_variants')
          .insert(variantsToInsert)
          .select('id, model, color');
        
        if (variantError) {
          console.error('Variant save error:', variantError);
          toast.error('Produto salvo, mas erro ao salvar estoque por variação');
        } else if (savedVariants) {
          // Insert store_stock records
          const storeStockData = savedVariants.flatMap(savedV => {
            const variantStock = variantStocks.find(
              vs => vs.model === savedV.model && vs.color === savedV.color
            );
            return stores.map(store => ({
              product_variant_id: savedV.id,
              store_id: store.id,
              quantity: variantStock?.stocks[store.id] || 0,
              reserved_quantity: 0,
            }));
          });
          
          if (storeStockData.length > 0) {
            const { error: stockError } = await supabase
              .from('store_stock')
              .insert(storeStockData);
            
            if (stockError) {
              console.error('Store stock save error:', stockError);
              toast.error('Erro ao salvar estoque por loja');
            }
          }
        }
      }

      toast.success(initialData?.id ? 'Produto atualizado! 🎉' : 'Produto cadastrado! 🎉');

      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['shop-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['product-variants'] });
      onOpenChange(false);
      
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Erro ao salvar produto');
    } finally {
      setIsSubmitting(false);
    }
  };

  const imageCount = formData.images.length;
  const canAddMoreImages = imageCount < MAX_IMAGES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData?.id ? 'Editar Produto' : 'Novo Produto'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Image Upload with Drag and Drop */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Fotos do Produto</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Arraste para reordenar • A ordem das fotos segue a ordem das cores</p>
              </div>
              <span className={`text-sm ${imageCount >= MAX_IMAGES ? 'text-destructive' : 'text-muted-foreground'}`}>
                {imageCount}/{MAX_IMAGES} fotos
              </span>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={formData.images} strategy={rectSortingStrategy}>
                <div className="flex flex-wrap gap-3">
                  {formData.images.map((img, index) => (
                    <SortableImageItem
                      key={img}
                      id={img}
                      src={img}
                      index={index}
                      color={formData.colors[index]}
                      colorHex={formData.color_codes[formData.colors[index]]}
                      onRemove={() => removeImage(index)}
                    />
                  ))}
                  {canAddMoreImages && (
                    <label className="w-24 h-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                      {uploadingImages ? (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Upload className="h-6 w-6 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground mt-1">Adicionar</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImages || !canAddMoreImages}
                      />
                    </label>
                  )}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* Name, Category and Code */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Nome do Produto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Capa iPhone Beach Vibes"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codigo_produto">Código</Label>
              <Input
                id="codigo_produto"
                value={formData.codigo_produto}
                onChange={(e) => setFormData(prev => ({ ...prev, codigo_produto: e.target.value.toUpperCase() }))}
                placeholder="C-001 (auto)"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">
                Deixe vazio para gerar automaticamente
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="category">Categoria *</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva o produto de forma atrativa..."
              rows={3}
            />
          </div>

          {/* Prices */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="original_price">Preço Original (R$)</Label>
              <Input
                id="original_price"
                type="number"
                step="0.01"
                min="0"
                value={formData.original_price || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, original_price: parseFloat(e.target.value) || undefined }))}
                placeholder="Deixe vazio se não houver desconto"
              />
            </div>
          </div>

          {/* Colors */}
          <div className="space-y-3">
            <Label>Cores Disponíveis</Label>
            <div className="flex flex-wrap gap-2">
              {PREDEFINED_COLORS.map(({ name, hex }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => handleColorToggle(name, hex)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
                    formData.colors.includes(name)
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-border"
                    style={{ backgroundColor: hex }}
                  />
                  <span className="text-sm">{name}</span>
                </button>
              ))}
            </div>
            
            {/* Custom Color */}
            <div className="flex gap-2 items-end">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">Cor personalizada</Label>
                <div className="flex gap-2">
                  <Input
                    value={customColor}
                    onChange={(e) => setCustomColor(e.target.value)}
                    placeholder="Nome da cor"
                    className="flex-1"
                  />
                  <Input
                    type="color"
                    value={customColorHex}
                    onChange={(e) => setCustomColorHex(e.target.value)}
                    className="w-12 p-1 h-10"
                  />
                </div>
              </div>
              <Button type="button" variant="outline" size="icon" onClick={handleAddCustomColor}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Selected Colors Preview */}
            {formData.colors.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {formData.colors.map(color => (
                  <Badge
                    key={color}
                    variant="secondary"
                    className="flex items-center gap-1.5 pr-1"
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-border"
                      style={{ backgroundColor: formData.color_codes[color] || '#888' }}
                    />
                    {color}
                    <button
                      type="button"
                      onClick={() => handleColorToggle(color, formData.color_codes[color] || '')}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Phone Models */}
          <div className="space-y-3">
            <Label>Modelos de Celular Compatíveis</Label>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
              {PHONE_MODELS.map(model => (
                <button
                  key={model}
                  type="button"
                  onClick={() => handleModelToggle(model)}
                  className={`px-3 py-1.5 rounded-full border text-sm transition-all ${
                    formData.models.includes(model)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {model}
                </button>
              ))}
            </div>

            {/* Custom Model */}
            <div className="flex gap-2">
              <Input
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="Adicionar modelo personalizado"
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomModel())}
              />
              <Button type="button" variant="outline" size="icon" onClick={handleAddCustomModel}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Selected Models Preview */}
            {formData.models.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {formData.models.map(model => (
                  <Badge key={model} variant="secondary" className="pr-1">
                    {model}
                    <button
                      type="button"
                      onClick={() => handleModelToggle(model)}
                      className="ml-1 hover:bg-muted rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Stock per Variant */}
          {variantStocks.length > 0 && stores.length > 0 && (
            <div className="space-y-3">
              <Label>Estoque por Variação e Loja</Label>
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="max-h-80 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        {formData.colors.length > 0 && (
                          <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Cor</th>
                        )}
                        {formData.models.length > 0 && (
                          <th className="text-left px-3 py-2 font-medium whitespace-nowrap">Modelo</th>
                        )}
                        {stores.map(store => (
                          <th key={store.id} className="text-center px-2 py-2 font-medium whitespace-nowrap">
                            {store.name}
                          </th>
                        ))}
                        <th className="text-center px-3 py-2 font-medium whitespace-nowrap">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variantStocks.map((variant, index) => (
                        <tr key={index} className="border-t border-border">
                          {formData.colors.length > 0 && (
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                                  style={{ backgroundColor: formData.color_codes[variant.color || ''] || '#888' }}
                                />
                                <span className="whitespace-nowrap">{variant.color}</span>
                              </div>
                            </td>
                          )}
                          {formData.models.length > 0 && (
                            <td className="px-3 py-2 whitespace-nowrap">{variant.model}</td>
                          )}
                          {stores.map(store => (
                            <td key={store.id} className="px-2 py-2">
                              <Input
                                type="number"
                                min="0"
                                value={variant.stocks[store.id] || 0}
                                onChange={(e) => updateVariantStock(
                                  variant.model,
                                  variant.color,
                                  store.id,
                                  parseInt(e.target.value) || 0
                                )}
                                className="w-16 h-8 text-center"
                              />
                            </td>
                          ))}
                          <td className="px-3 py-2 text-center font-medium">
                            {getVariantTotal(variant)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Sizes */}
          <div className="space-y-2">
            <Label>Tamanhos Disponíveis</Label>
            <div className="flex flex-wrap gap-3">
              {SIZE_OPTIONS.map(size => (
                <div key={size} className="flex items-center space-x-2">
                  <Checkbox
                    id={`size-${size}`}
                    checked={formData.sizes.includes(size)}
                    onCheckedChange={() => handleSizeToggle(size)}
                  />
                  <label
                    htmlFor={`size-${size}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {size}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Switches */}
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="in_stock"
                checked={formData.in_stock}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, in_stock: checked }))}
              />
              <Label htmlFor="in_stock">Em Estoque</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="featured"
                checked={formData.featured}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: checked }))}
              />
              <Label htmlFor="featured">Produto Destaque</Label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                initialData?.id ? 'Atualizar Produto' : 'Cadastrar Produto'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProductForm;
