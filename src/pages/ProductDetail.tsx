import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { Star, ShoppingCart, Heart, Truck, Shield, ArrowLeft, Minus, Plus, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
const ProductDetail = () => {
  const {
    id
  } = useParams();
  const {
    addItem
  } = useCart();
  const {
    user
  } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const {
    data: product,
    isLoading,
    error
  } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      if (!id) throw new Error('Product ID is required');
      const {
        data,
        error
      } = await supabase.from('products').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  // Fetch variant stock
  const {
    data: variants = []
  } = useQuery({
    queryKey: ['product-variants', id],
    queryFn: async () => {
      if (!id) return [];
      const {
        data,
        error
      } = await supabase.from('product_variants').select('*').eq('product_id', id);
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  // Fetch reviews
  const {
    data: reviews = [],
    refetch: refetchReviews
  } = useQuery({
    queryKey: ['product-reviews', id],
    queryFn: async () => {
      if (!id) return [];
      const {
        data,
        error
      } = await supabase.from('product_reviews').select('*').eq('product_id', id).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  // Check if user can review (has purchased and received the product)
  const {
    data: canReview = false
  } = useQuery({
    queryKey: ['can-review', id, user?.id],
    queryFn: async () => {
      if (!id || !user?.id) return false;

      // Check if user already reviewed this product
      const {
        data: existingReview
      } = await supabase.from('product_reviews').select('id').eq('product_id', id).eq('user_id', user.id).maybeSingle();
      if (existingReview) return false;

      // Check if user has a delivered order with this product
      const {
        data: orders
      } = await supabase.from('orders').select('id').eq('user_id', user.id).eq('status', 'delivered');
      if (!orders || orders.length === 0) return false;
      const orderIds = orders.map(o => o.id);
      const {
        data: orderItems
      } = await supabase.from('order_items').select('id').eq('product_id', id).in('order_id', orderIds);
      return (orderItems?.length ?? 0) > 0;
    },
    enabled: !!id && !!user?.id
  });
  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  // Parse arrays from database
  const colors: string[] = Array.isArray(product?.color) ? product.color : [];
  const colorCodes: Record<string, string> = product?.color_codes as Record<string, string> || {};
  const models: string[] = Array.isArray(product?.model) ? product.model : [];
  const sizes: string[] = product?.sizes || [];

  // Get stock for selected variant - only show after required selections are made
  const getSelectedVariantStock = (): number | null => {
    if (variants.length === 0) return null;
    
    // Don't show stock until required options are selected
    if (colors.length > 0 && !selectedColor) return null;
    if (models.length > 0 && !selectedModel) return null;
    
    const variant = variants.find(v => (v.color === selectedColor || !v.color && !selectedColor) && (v.model === selectedModel || !v.model && !selectedModel));
    return variant?.stock_quantity ?? 0;
  };
  
  const variantStock = getSelectedVariantStock();
  const isOutOfStock = variantStock !== null && variantStock <= 0;

  // Calculate average rating
  const averageRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : product?.rating || 0;
  const handleSubmitReview = async () => {
    if (!user?.id || !id) return;
    setIsSubmittingReview(true);
    try {
      const {
        error
      } = await supabase.from('product_reviews').insert({
        product_id: id,
        user_id: user.id,
        rating: reviewRating,
        comment: reviewComment.trim() || null
      });
      if (error) throw error;
      toast.success('Avaliação enviada! Valeu! 🌴');
      setReviewComment('');
      setReviewRating(5);
      refetchReviews();
    } catch (error) {
      console.error('Review error:', error);
      toast.error('Erro ao enviar avaliação');
    } finally {
      setIsSubmittingReview(false);
    }
  };
  if (isLoading) {
    return <MainLayout>
        <div className="container py-8">
          <Skeleton className="h-6 w-32 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="space-y-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-12 w-48" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </MainLayout>;
  }
  if (error || !product) {
    return <MainLayout>
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Ops! Produto não encontrado</h1>
          <Link to="/shop">
            <Button>Voltar pra Loja</Button>
          </Link>
        </div>
      </MainLayout>;
  }
  const discount = product.original_price ? Math.round((product.original_price - product.price) / product.original_price * 100) : 0;
  const handleAddToCart = () => {
    // Validate required selections
    if (colors.length > 0 && !selectedColor) {
      toast.error('Selecione uma cor');
      return;
    }
    if (models.length > 0 && !selectedModel) {
      toast.error('Selecione um modelo de celular');
      return;
    }
    if (sizes.length > 0 && !selectedSize) {
      toast.error('Selecione um tamanho');
      return;
    }

    // Check stock
    if (isOutOfStock) {
      toast.error('Esta variação está esgotada');
      return;
    }
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image || '/placeholder.svg',
        size: selectedSize || undefined,
        color: selectedColor || undefined,
        model: selectedModel || undefined
      });
    }
    toast.success(`${quantity}x ${product.name} adicionado à sacola! 🛍️`);
  };
  return <MainLayout>
      <div className="container py-8">
        {/* Breadcrumb */}
        <Link to="/shop" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar pra Loja
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image */}
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
            <img src={product.image || '/placeholder.svg'} alt={product.name} className="h-full w-full object-cover" />
            {discount > 0 && <Badge className="absolute top-4 left-4 bg-accent text-accent-foreground text-lg px-4 py-2">
                -{discount}% OFF
              </Badge>}
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <p className="text-sm text-accent uppercase tracking-widest mb-2">
                {product.category}
              </p>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                {product.name}
              </h1>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => <Star key={i} className={`h-5 w-5 ${i < Math.floor(averageRating) ? 'fill-accent text-accent' : 'text-muted'}`} />)}
                </div>
                <span className="font-medium">{averageRating.toFixed(1)}</span>
                <span className="text-muted-foreground">({reviews.length} avaliações)</span>
              </div>
            </div>

            <div className="flex items-baseline gap-4">
              <span className="text-4xl font-bold text-primary">
                {formatPrice(product.price)}
              </span>
              {product.original_price && <span className="text-xl text-muted-foreground line-through">
                  {formatPrice(product.original_price)}
                </span>}
            </div>

            <p className="text-muted-foreground leading-relaxed">
              {product.description}
            </p>

            {/* Colors with Visual Swatches */}
            {colors.length > 0 && <div>
                <p className="font-medium mb-3">
                  Cor: <span className="text-primary">{selectedColor || 'Selecione'}</span>
                </p>
                <div className="flex gap-3 flex-wrap">
                  {colors.map(color => <button key={color} onClick={() => setSelectedColor(color)} className={`group relative flex flex-col items-center gap-1.5`} title={color}>
                      <span className={`w-10 h-10 rounded-full border-2 transition-all ${selectedColor === color ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-background' : 'border-border hover:border-primary/50'}`} style={{
                  backgroundColor: colorCodes[color] || '#888888'
                }} />
                      <span className="text-xs text-muted-foreground">{color}</span>
                    </button>)}
                </div>
              </div>}

            {/* Phone Models */}
            {models.length > 0 && <div>
                <p className="font-medium mb-3">
                  Modelo: <span className="text-primary">{selectedModel || 'Selecione'}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {models.map(model => <button key={model} onClick={() => setSelectedModel(model)} className={`px-4 py-2 rounded-lg border text-sm transition-all ${selectedModel === model ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'}`}>
                      {model}
                    </button>)}
                </div>
              </div>}

            {/* Sizes */}
            {sizes.length > 0 && <div>
                <p className="font-medium mb-3">
                  Tamanho: <span className="text-primary">{selectedSize || 'Selecione'}</span>
                </p>
                <div className="flex gap-2">
                  {sizes.map(size => <button key={size} onClick={() => setSelectedSize(size)} className={`px-4 py-2 rounded-lg border transition-all ${selectedSize === size ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'}`}>
                      {size}
                    </button>)}
                </div>
              </div>}

            {/* Stock Info */}
            {variantStock !== null && <div>
                {isOutOfStock ? <Badge variant="destructive">Esgotado</Badge> : <p className="text-sm text-muted-foreground">
                    {variantStock} unidades disponíveis
                  </p>}
              </div>}

            {/* Quantity */}
            <div>
              <p className="font-medium mb-3">Quantidade</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-border rounded-lg">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-3 hover:bg-muted transition-colors">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="px-6 font-medium">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="p-3 hover:bg-muted transition-colors">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Button size="lg" className="flex-1 bg-gradient-ocean text-primary-foreground hover:opacity-90" onClick={handleAddToCart} disabled={!product.in_stock || isOutOfStock}>
                <ShoppingCart className="mr-2 h-5 w-5" />
                {!product.in_stock || isOutOfStock ? 'Esgotado' : 'Joga na Sacola'}
              </Button>
              <Button size="lg" variant="outline">
                <Heart className="h-5 w-5" />
              </Button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-border">
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-primary" />
                <span className="text-sm">Frete grátis acima de R$250</span>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-sm">6 meses de garantia  </span>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-16 pt-8 border-t border-border">
          <h2 className="text-2xl font-bold mb-6">Avaliações ({reviews.length})</h2>

          {/* Review Form (only for eligible users) */}
          {canReview && <div className="bg-muted/30 rounded-xl p-6 mb-8">
              <h3 className="font-semibold mb-4">Curtiu o produto? Deixa sua avaliação! 🌴</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Sua nota:</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(star => <button key={star} type="button" onClick={() => setReviewRating(star)} className="p-1">
                        <Star className={`h-6 w-6 transition-colors ${star <= reviewRating ? 'fill-accent text-accent' : 'text-muted hover:text-accent'}`} />
                      </button>)}
                  </div>
                </div>
                <div>
                  <Textarea placeholder="Conta pra gente o que você achou..." value={reviewComment} onChange={e => setReviewComment(e.target.value)} rows={3} />
                </div>
                <Button onClick={handleSubmitReview} disabled={isSubmittingReview}>
                  {isSubmittingReview ? <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </> : 'Enviar Avaliação'}
                </Button>
              </div>
            </div>}

          {/* Reviews List */}
          {reviews.length === 0 ? <p className="text-muted-foreground text-center py-8">
              Ainda não tem avaliações. Seja o primeiro! 🏄
            </p> : <div className="space-y-4">
              {reviews.map(review => <div key={review.id} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map(star => <Star key={star} className={`h-4 w-4 ${star <= review.rating ? 'fill-accent text-accent' : 'text-muted'}`} />)}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  {review.comment && <p className="text-sm text-foreground">{review.comment}</p>}
                </div>)}
            </div>}
        </div>
      </div>
    </MainLayout>;
};
export default ProductDetail;