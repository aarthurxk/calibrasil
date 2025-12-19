import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Star, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const Review = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Fetch product details
  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      if (!productId) throw new Error('Product ID is required');
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!productId
  });

  // Check if user can review
  const { data: canReview, isLoading: canReviewLoading } = useQuery({
    queryKey: ['can-review', productId, user?.id],
    queryFn: async () => {
      if (!productId || !user?.id) return false;

      // Check if user already reviewed this product
      const { data: existingReview } = await supabase
        .from('product_reviews')
        .select('id')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (existingReview) return false;

      // Check if user has a delivered order with this product
      const { data: orders } = await supabase
        .from('orders')
        .select('id')
        .eq('user_id', user.id)
        .or('status.eq.delivered,received_at.not.is.null');
      
      if (!orders || orders.length === 0) return false;
      
      const orderIds = orders.map(o => o.id);
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('id')
        .eq('product_id', productId)
        .in('order_id', orderIds);
      
      return (orderItems?.length ?? 0) > 0;
    },
    enabled: !!productId && !!user?.id
  });

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const handleSubmitReview = async () => {
    if (!user?.id || !productId) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('product_reviews').insert({
        product_id: productId,
        user_id: user.id,
        rating: rating,
        comment: comment.trim() || null
      });
      
      if (error) throw error;
      
      setSubmitted(true);
      toast.success('Avaliação enviada! Valeu! 🌴');
    } catch (error) {
      console.error('Review error:', error);
      toast.error('Erro ao enviar avaliação');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = productLoading || canReviewLoading;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container py-8 max-w-2xl mx-auto">
          <Skeleton className="h-6 w-32 mb-8" />
          <Skeleton className="h-24 w-full mb-6" />
          <Skeleton className="h-48 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!product) {
    return (
      <MainLayout>
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Produto não encontrado</h1>
          <Link to="/shop">
            <Button>Voltar pra Loja</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  // Success state after submission
  if (submitted) {
    return (
      <MainLayout>
        <div className="container py-16 max-w-2xl mx-auto text-center">
          <div className="bg-muted/30 rounded-2xl p-8 space-y-6">
            <CheckCircle className="h-16 w-16 text-primary mx-auto" />
            <h1 className="text-2xl font-bold">Avaliação Enviada!</h1>
            <p className="text-muted-foreground">
              Valeu por compartilhar sua experiência com a gente! 🌴
            </p>
            <div className="flex justify-center gap-4 pt-4">
              <Link to={`/product/${productId}`}>
                <Button variant="outline">Ver Produto</Button>
              </Link>
              <Link to="/shop">
                <Button>Continuar Comprando</Button>
              </Link>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <MainLayout>
        <div className="container py-16 max-w-2xl mx-auto text-center">
          <div className="bg-muted/30 rounded-2xl p-8 space-y-6">
            <h1 className="text-2xl font-bold">Faça login para avaliar</h1>
            <p className="text-muted-foreground">
              Você precisa estar logado para avaliar produtos.
            </p>
            <Link to={`/auth?redirect=/review/${productId}`}>
              <Button size="lg">Entrar na Conta</Button>
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Can't review (didn't buy or already reviewed)
  if (!canReview) {
    return (
      <MainLayout>
        <div className="container py-16 max-w-2xl mx-auto text-center">
          <div className="bg-muted/30 rounded-2xl p-8 space-y-6">
            <h1 className="text-2xl font-bold">Avaliação não disponível</h1>
            <p className="text-muted-foreground">
              Para avaliar este produto, você precisa ter comprado e recebido ele primeiro, 
              ou você já pode ter enviado uma avaliação anteriormente.
            </p>
            <div className="flex justify-center gap-4 pt-4">
              <Link to={`/product/${productId}`}>
                <Button variant="outline">Ver Produto</Button>
              </Link>
              <Link to="/my-orders">
                <Button>Meus Pedidos</Button>
              </Link>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8 max-w-2xl mx-auto">
        {/* Back link */}
        <Link 
          to={`/product/${productId}`} 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Produto
        </Link>

        {/* Product Summary */}
        <div className="flex items-center gap-4 bg-muted/30 rounded-xl p-4 mb-8">
          <img 
            src={product.image || '/placeholder.svg'} 
            alt={product.name}
            className="h-20 w-20 object-cover rounded-lg"
          />
          <div>
            <p className="text-sm text-accent uppercase tracking-widest">
              {product.category}
            </p>
            <h2 className="font-semibold text-lg">{product.name}</h2>
            <p className="text-primary font-medium">{formatPrice(product.price)}</p>
          </div>
        </div>

        {/* Review Form */}
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8">
          <h1 className="text-2xl font-bold mb-2">Avalie o Produto</h1>
          <p className="text-muted-foreground mb-8">
            Conta pra gente o que você achou! Sua avaliação ajuda outros clientes. 🌴
          </p>

          <div className="space-y-6">
            {/* Rating */}
            <div>
              <label className="block font-medium mb-3">Sua nota</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button 
                    key={star} 
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-2 hover:scale-110 transition-transform"
                  >
                    <Star 
                      className={`h-8 w-8 transition-colors ${
                        star <= rating 
                          ? 'fill-accent text-accent' 
                          : 'text-muted hover:text-accent'
                      }`} 
                    />
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {rating === 1 && 'Péssimo'}
                {rating === 2 && 'Ruim'}
                {rating === 3 && 'Regular'}
                {rating === 4 && 'Bom'}
                {rating === 5 && 'Excelente!'}
              </p>
            </div>

            {/* Comment */}
            <div>
              <label className="block font-medium mb-3">Seu comentário (opcional)</label>
              <Textarea 
                placeholder="O que você achou do produto? Qualidade, embalagem, se chegou bem..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Submit */}
            <Button 
              onClick={handleSubmitReview} 
              disabled={isSubmitting}
              size="lg"
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Avaliação'
              )}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Review;
