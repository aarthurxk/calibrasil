import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/products/ProductCard';
import { Button } from '@/components/ui/button';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import type { Product } from '@/types/product';

const FeaturedProducts = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 });

  const { data: featuredProducts = [], isLoading } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('featured', true)
        .limit(4);
      
      if (error) throw error;
      return data as Product[];
    },
  });

  return (
    <section className="py-20 bg-background" ref={ref as React.RefObject<HTMLElement>}>
      <div className="container">
        <div
          className={`flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-12 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div>
            <p className="text-sm font-medium text-accent uppercase tracking-widest mb-2">
              Seleção Especial
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Os Queridinhos 🔥
            </h2>
          </div>
          <Link to="/shop">
            <Button
              variant="ghost"
              className="text-primary hover:text-primary/80 group transition-all hover:translate-x-1"
            >
              Ver Tudo
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : featuredProducts.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            Nenhum produto em destaque ainda.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product, index) => (
              <div
                key={product.id}
                className={`transition-all duration-700 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                }`}
                style={{
                  transitionDelay: isVisible ? `${300 + index * 100}ms` : '0ms',
                }}
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedProducts;
