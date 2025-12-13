import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Product {
  id: string;
  name: string;
  price: number;
  image: string | null;
  category: string;
}

const SearchModal = ({ open, onOpenChange }: SearchModalProps) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setDebouncedQuery('');
    }
  }, [open]);

  // Search products
  const { data: results = [], isLoading } = useQuery({
    queryKey: ['product-search', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, image, category')
        .ilike('name', `%${debouncedQuery}%`)
        .limit(8);
      
      if (error) throw error;
      return data as Product[];
    },
    enabled: debouncedQuery.length >= 2,
  });

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleSelect = (productId: string) => {
    onOpenChange(false);
    navigate(`/product/${productId}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && results.length > 0) {
      handleSelect(results[0].id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar produtos..."
            className="border-0 focus-visible:ring-0 px-0 text-base"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={() => setQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          )}

          {!isLoading && debouncedQuery.length >= 2 && results.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              <p>Nenhum produto encontrado para "{debouncedQuery}"</p>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <div className="py-2">
              {results.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleSelect(product.id)}
                  className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted transition-colors text-left"
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <Search className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.category}</p>
                  </div>
                  <p className="font-semibold text-sm text-primary">{formatPrice(product.price)}</p>
                </button>
              ))}
            </div>
          )}

          {!debouncedQuery && (
            <div className="py-8 text-center text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Digite para buscar produtos...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SearchModal;
