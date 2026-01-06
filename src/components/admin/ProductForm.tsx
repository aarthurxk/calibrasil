import { useState, useEffect, useRef } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { X, Upload, Loader2, Plus } from 'lucide-react';
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
  stock_quantity: number;
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

const ProductForm = ({ open, onOpenChange, initialData }: ProductFormProps) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [customColor, setCustomColor] = useState('');
  const [customColorHex, setCustomColorHex] = useState('#000000');
  const [customModel, setCustomModel] = useState('');
  const [variantStocks, setVariantStocks] = useState<VariantStock[]>([]);
  const isVariantsInitialized = useRef(false);

  const parseColors = (color: string[] | string | null | undefined): string[] => {
    if (!color) return [];
    if (Array.isArray(color)) return color;
    return [color];
  };

  const parseModels = (model: string[] | string | null | undefined): string[] => {
    if (!model) return [];
    if (Array.isArray(model)) return model;
    return [model];
  };

  const getInitialFormData = (): ProductFormData => ({
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
  });

  const [formData, setFormData] = useState<ProductFormData>(getInitialFormData());

  // Fetch existing variants when editing
  const { data: existingVariants = [] } = useQuery({
    queryKey: ['product-variants', initialData?.id],
    queryFn: async () => {
      if (!initialData?.id) return [];
      const { data, error } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', initialData.id);
      if (error) throw error;
      return data;
    },
    enabled: !!initialData?.id,
  });

  useEffect(() => {
    setFormData(getInitialFormData());
  }, [initialData, open]);

  // Reset initialization flag when dialog closes
  useEffect(() => {
    if (!open) {
      isVariantsInitialized.current = false;
    }
  }, [open]);

  useEffect(() => {
    // Initialize variant stocks from existing data
    if (existingVariants.length > 0) {
      setVariantStocks(existingVariants.map(v => ({
        model: v.model,
        color: v.color,
        stock_quantity: v.stock_quantity,
      })));
      isVariantsInitialized.current = true;
    } else if (!initialData?.id) {
      setVariantStocks([]);
    }
  }, [existingVariants, initialData?.id]);

  // Generate variant combinations when colors/models change
  useEffect(() => {
    // Don't generate if we're in edit mode and haven't initialized yet
    if (initialData?.id && !isVariantsInitialized.current) {
      return;
    }

    const colors = formData.colors.length > 0 ? formData.colors : [null];
    const models = formData.models.length > 0 ? formData.models : [null];
    
    const newVariants: VariantStock[] = [];
    for (const color of colors) {
      for (const model of models) {
        // Skip if both are null (no variants needed)
        if (color === null && model === null) continue;
        
        newVariants.push({
          model,
          color,
          stock_quantity: 0,
        });
      }
    }
    
    // Use callback to preserve existing quantities and avoid unnecessary updates
    setVariantStocks(prev => {
      if (newVariants.length === 0 && formData.colors.length === 0 && formData.models.length === 0) {
        return prev.length === 0 ? prev : [];
      }
      
      // Preserve existing quantities
      const updated = newVariants.map(newV => {
        const existing = prev.find(p => p.color === newV.color && p.model === newV.model);
        return existing ? { ...newV, stock_quantity: existing.stock_quantity } : newV;
      });
      
      // Check if anything actually changed
      if (prev.length === updated.length && 
          prev.every((p, i) => p.color === updated[i].color && p.model === updated[i].model)) {
        return prev;
      }
      
      return updated;
    });
  }, [formData.colors, formData.models, initialData?.id]);

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

  const updateVariantStock = (model: string | null, color: string | null, quantity: number) => {
    setVariantStocks(prev => prev.map(v => 
      v.model === model && v.color === color
        ? { ...v, stock_quantity: quantity }
        : v
    ));
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
        // Delete existing variants
        await supabase.from('product_variants').delete().eq('product_id', productId);
        
        // Insert new variants with normalized model names
        const variantsToInsert = variantStocks.map(v => ({
          product_id: productId,
          model: v.model ? normalizeModelName(v.model) : null,
          color: v.color,
          stock_quantity: v.stock_quantity,
        }));
        
        const { error: variantError } = await supabase
          .from('product_variants')
          .insert(variantsToInsert);
        
        if (variantError) {
          console.error('Variant save error:', variantError);
          toast.error('Produto salvo, mas erro ao salvar estoque por variação');
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
          {/* Image Upload */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Fotos do Produto</Label>
              <span className={`text-sm ${imageCount >= MAX_IMAGES ? 'text-destructive' : 'text-muted-foreground'}`}>
                {imageCount}/{MAX_IMAGES} fotos
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {formData.images.map((img, index) => (
                <div key={index} className="relative w-24 h-24 rounded-lg overflow-hidden border border-border">
                  <img src={img} alt={`Produto ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
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
          {variantStocks.length > 0 && (
            <div className="space-y-3">
              <Label>Estoque por Variação</Label>
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        {formData.colors.length > 0 && (
                          <th className="text-left px-3 py-2 font-medium">Cor</th>
                        )}
                        {formData.models.length > 0 && (
                          <th className="text-left px-3 py-2 font-medium">Modelo</th>
                        )}
                        <th className="text-left px-3 py-2 font-medium">Quantidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variantStocks.map((variant, index) => (
                        <tr key={index} className="border-t border-border">
                          {formData.colors.length > 0 && (
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-4 h-4 rounded-full border border-border"
                                  style={{ backgroundColor: formData.color_codes[variant.color || ''] || '#888' }}
                                />
                                {variant.color}
                              </div>
                            </td>
                          )}
                          {formData.models.length > 0 && (
                            <td className="px-3 py-2">{variant.model}</td>
                          )}
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              min="0"
                              value={variant.stock_quantity}
                              onChange={(e) => updateVariantStock(
                                variant.model,
                                variant.color,
                                parseInt(e.target.value) || 0
                              )}
                              className="w-24 h-8"
                            />
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
