import { useSearchParams, Link } from 'react-router-dom';
import { Star, ArrowRight, Package, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface OrderItem {
  id: string;
  product_id: string | null;
  product_name: string;
  price: number;
  quantity: number;
}

interface Product {
  id: string;
  name: string;
  image: string | null;
  category: string;
}

const Avaliar = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const token = searchParams.get('token');

  // Fetch order items
  const { data: orderItems, isLoading: itemsLoading, error: itemsError } = useQuery({
    queryKey: ['order-items-review', orderId],
    queryFn: async () => {
      if (!orderId) throw new Error('Order ID is required');
      
      const { data, error } = await supabase
        .from('order_items')
        .select('id, product_id, product_name, price, quantity')
        .eq('order_id', orderId);
      
      if (error) throw error;
      return data as OrderItem[];
    },
    enabled: !!orderId
  });

  // Fetch product details for each item
  const productIds = orderItems?.map(item => item.product_id).filter(Boolean) as string[] || [];
  
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products-for-review', productIds],
    queryFn: async () => {
      if (productIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('id, name, image, category')
        .in('id', productIds);
      
      if (error) throw error;
      return data as Product[];
    },
    enabled: productIds.length > 0
  });

  const getProductImage = (productId: string | null) => {
    if (!productId || !products) return '/placeholder.svg';
    const product = products.find(p => p.id === productId);
    return product?.image || '/placeholder.svg';
  };

  const getProductCategory = (productId: string | null) => {
    if (!productId || !products) return '';
    const product = products.find(p => p.id === productId);
    return product?.category || '';
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const isLoading = itemsLoading || productsLoading;

  // No orderId provided
  if (!orderId) {
    return (
      <MainLayout>
        <div className="container py-20 text-center">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Link inválido</h1>
          <p className="text-muted-foreground mb-6">
            Esse link de avaliação não é válido. Verifique seu email.
          </p>
          <Link to="/shop">
            <Button>Voltar para Loja</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <MainLayout>
        <div className="container py-8 max-w-2xl mx-auto">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-5 w-96 mb-8" />
          <div className="space-y-4">
            {[1, 2].map(i => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  // Error or no items
  if (itemsError || !orderItems || orderItems.length === 0) {
    return (
      <MainLayout>
        <div className="container py-20 text-center">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4">Pedido não encontrado</h1>
          <p className="text-muted-foreground mb-6">
            Não conseguimos encontrar os produtos desse pedido.
          </p>
          <Link to="/shop">
            <Button>Voltar para Loja</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-8 max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-accent/10 mb-4">
            <Star className="h-8 w-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Avalie seus Produtos</h1>
          <p className="text-muted-foreground">
            Conta pra gente o que você achou! Sua avaliação ajuda outros clientes. 🌴
          </p>
        </div>

        {/* Product List */}
        <div className="space-y-4">
          {orderItems.map((item) => (
            <div 
              key={item.id}
              className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <img 
                  src={getProductImage(item.product_id)} 
                  alt={item.product_name}
                  className="h-20 w-20 object-cover rounded-lg flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-accent uppercase tracking-widest mb-1">
                    {getProductCategory(item.product_id)}
                  </p>
                  <h3 className="font-semibold truncate">{item.product_name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.quantity}x {formatPrice(item.price)}
                  </p>
                </div>
                {item.product_id ? (
                  <Link to={`/review/${item.product_id}`}>
                    <Button size="sm" className="flex-shrink-0">
                      Avaliar
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <Button size="sm" disabled className="flex-shrink-0">
                    Indisponível
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Clique em "Avaliar" para dar sua nota e comentário para cada produto.
          </p>
          <Link to="/shop">
            <Button variant="outline">Continuar Comprando</Button>
          </Link>
        </div>
      </div>
    </MainLayout>
  );
};

export default Avaliar;
