import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X, Upload, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ProductFormData {
  id?: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  category: string;
  color?: string;
  model?: string;
  sizes: string[];
  image?: string;
  images: string[];
  in_stock: boolean;
  featured: boolean;
}

interface ProductFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: ProductFormData | null;
}

const CATEGORIES = ['Tech', 'Acessórios', 'Vestuário', 'Esporte'];
const SIZE_OPTIONS = ['PP', 'P', 'M', 'G', 'GG', 'XGG', 'Único'];

const ProductForm = ({ open, onOpenChange, initialData }: ProductFormProps) => {
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    price: initialData?.price || 0,
    original_price: initialData?.original_price || undefined,
    category: initialData?.category || '',
    color: initialData?.color || '',
    model: initialData?.model || '',
    sizes: initialData?.sizes || [],
    image: initialData?.image || '',
    images: initialData?.images || [],
    in_stock: initialData?.in_stock ?? true,
    featured: initialData?.featured ?? false,
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);
    const newImages: string[] = [];

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, file);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.category || formData.price <= 0) {
      toast.error('Preencha os campos obrigatórios: nome, categoria e preço');
      return;
    }

    setIsSubmitting(true);

    try {
      const productData = {
        name: formData.name,
        description: formData.description,
        price: formData.price,
        original_price: formData.original_price || null,
        category: formData.category,
        color: formData.color || null,
        model: formData.model || null,
        sizes: formData.sizes.length > 0 ? formData.sizes : null,
        image: formData.image || formData.images[0] || null,
        images: formData.images.length > 0 ? formData.images : null,
        in_stock: formData.in_stock,
        featured: formData.featured,
      };

      if (initialData?.id) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', initialData.id);
        
        if (error) throw error;
        toast.success('Produto atualizado! 🎉');
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);
        
        if (error) throw error;
        toast.success('Produto cadastrado! 🎉');
      }

      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['shop-products'] });
      onOpenChange(false);
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        price: 0,
        original_price: undefined,
        category: '',
        color: '',
        model: '',
        sizes: [],
        image: '',
        images: [],
        in_stock: true,
        featured: false,
      });
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Erro ao salvar produto');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <Label>Fotos do Produto</Label>
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
                  disabled={uploadingImages}
                />
              </label>
            </div>
          </div>

          {/* Name and Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Produto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Smartwatch Onda Perfeita"
                required
              />
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

          {/* Color and Model */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="color">Cor</Label>
              <Input
                id="color"
                value={formData.color}
                onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                placeholder="Ex: Verde-água, Coral"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Modelo</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                placeholder="Ex: Sport, Classic"
              />
            </div>
          </div>

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
