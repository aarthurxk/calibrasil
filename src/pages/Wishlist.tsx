import { useQuery } from '@tanstack/react-query';
import { Heart, Loader2, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import ProductCard from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useWishlist } from '@/hooks/useWishlist';
import { supabase } from '@/integrations/supabase/client';
import type { Product } from '@/types/product';

const Wishlist = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { wishlistIds, isLoading: wishlistLoading } = useWishlist();

  // Fetch full product details for wishlist items
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['wishlist-products', wishlistIds],
    queryFn: async () => {
      if (wishlistIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .in('id', wishlistIds);
      
      if (error) throw error;
      return data as Product[];
    },
    enabled: wishlistIds.length > 0,
  });

  const isLoading = authLoading || wishlistLoading || productsLoading;

  // Not logged in
  if (!authLoading && !user) {
    return (
      <MainLayout>
        <div className="container py-20">
          <div className="text-center max-w-md mx-auto">
            <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-2xl font-bold mb-2">Faça login para ver sua wishlist</h1>
            <p className="text-muted-foreground mb-6">
              Crie uma conta ou faça login para salvar seus produtos favoritos.
            </p>
            <Link to="/auth">
              <Button>Entrar / Cadastrar</Button>
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="bg-muted py-12">
        <div className="container">
          <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Heart className="h-8 w-8 text-primary" />
            Minha Wishlist
          </h1>
          <p className="text-muted-foreground">
            Seus produtos favoritos salvos pra quando bater aquela vontade!
          </p>
        </div>
      </div>

      <div className="container py-8">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sua wishlist tá vazia!</h2>
            <p className="text-muted-foreground mb-6">
              Explore nossa loja e salve seus produtos favoritos aqui.
            </p>
            <Link to="/shop">
              <Button>
                <ShoppingBag className="h-4 w-4 mr-2" />
                Explorar Loja
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-6">
              {products.length} {products.length === 1 ? 'produto salvo' : 'produtos salvos'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product, index) => (
                <div
                  key={product.id}
                  className="animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Wishlist;
