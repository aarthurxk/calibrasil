import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Filter, Grid3X3, List, Plus, Loader2, X } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import ProductCard from '@/components/products/ProductCard';
import ProductForm from '@/components/admin/ProductForm';
import PriceRangeFilter from '@/components/shop/PriceRangeFilter';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Product } from '@/types/product';

type Category = {
  id: string;
  name: string;
  slug: string;
};

const Shop = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState('featured');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showProductForm, setShowProductForm] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [isPriceFilterActive, setIsPriceFilterActive] = useState(false);
  
  const { isAdmin, isManager } = useAuth();
  const canManageProducts = isAdmin || isManager;
  const selectedCategory = searchParams.get('category') || 'todos';

  // Fetch categories from database
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as Category[];
    },
  });

  // Fetch products from database
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['shop-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  // Calculate min/max prices from products
  const { minProductPrice, maxProductPrice } = useMemo(() => {
    if (products.length === 0) return { minProductPrice: 0, maxProductPrice: 1000 };
    const prices = products.map((p) => p.price);
    return {
      minProductPrice: Math.floor(Math.min(...prices)),
      maxProductPrice: Math.ceil(Math.max(...prices)),
    };
  }, [products]);

  // Initialize price range when products load
  useEffect(() => {
    if (!isPriceFilterActive && products.length > 0) {
      setPriceRange([minProductPrice, maxProductPrice]);
    }
  }, [minProductPrice, maxProductPrice, products.length, isPriceFilterActive]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Filter by category
    if (selectedCategory && selectedCategory !== 'todos') {
      result = result.filter((p) => p.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Filter by price range
    if (isPriceFilterActive) {
      result = result.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1]);
    }

    // Sort
    switch (sortBy) {
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'featured':
      default:
        result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }
    return result;
  }, [products, selectedCategory, sortBy, priceRange, isPriceFilterActive]);
  const handleCategoryChange = (slug: string) => {
    if (slug === 'todos') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', slug);
    }
    setSearchParams(searchParams);
  };
  const handlePriceRangeChange = (value: [number, number]) => {
    setPriceRange(value);
    setIsPriceFilterActive(true);
  };

  const clearFilters = () => {
    setSearchParams({});
    setPriceRange([minProductPrice, maxProductPrice]);
    setIsPriceFilterActive(false);
    setSortBy('featured');
  };

  const hasActiveFilters = selectedCategory !== 'todos' || isPriceFilterActive;

  return (
    <MainLayout>
      <div className="bg-muted py-12">
        <div className="container">
          <h1 className="text-4xl font-bold text-foreground mb-2">Loja</h1>
          <p className="text-muted-foreground">
            Descubra nossa coleção de essenciais. É só escolher e partir pro abraço!
          </p>
        </div>
      </div>

      <div className="container py-8">
        {/* Filters Bar */}
        <div className="flex flex-col gap-4 mb-8 p-4 bg-card rounded-xl border border-border">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Filtrar:</span>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedCategory === 'todos' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleCategoryChange('todos')}
                >
                  Todos
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.slug ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleCategoryChange(category.slug)}
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              {canManageProducts && (
                <Button onClick={() => setShowProductForm(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Produto
                </Button>
              )}

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="featured">Destaques</SelectItem>
                  <SelectItem value="price-low">Menor Preço</SelectItem>
                  <SelectItem value="price-high">Maior Preço</SelectItem>
                  <SelectItem value="rating">Mais Avaliados</SelectItem>
                </SelectContent>
              </Select>

              <div className="hidden md:flex gap-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="flex flex-col md:flex-row md:items-end gap-4 pt-4 border-t border-border">
            <div className="flex-1 max-w-xs">
              <PriceRangeFilter
                minPrice={minProductPrice}
                maxPrice={maxProductPrice}
                value={priceRange}
                onChange={handlePriceRangeChange}
              />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-1" />
                Limpar filtros
              </Button>
            )}
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-muted-foreground mb-6">
          {isLoading ? 'Carregando...' : `Mostrando ${filteredProducts.length} produtos`}
        </p>

        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Products Grid */}
        {!isLoading && (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                : 'flex flex-col gap-4'
            }
          >
            {filteredProducts.map((product, index) => (
              <div
                key={product.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}

        {!isLoading && filteredProducts.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground">Ops! Nenhum produto encontrado. Tenta outro filtro aí!</p>
            {hasActiveFilters && (
              <Button className="mt-4" variant="outline" onClick={clearFilters}>
                Limpar Filtros
              </Button>
            )}
            {canManageProducts && !hasActiveFilters && (
              <Button className="mt-4" onClick={() => setShowProductForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Primeiro Produto
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      <ProductForm open={showProductForm} onOpenChange={setShowProductForm} />
    </MainLayout>
  );
};

export default Shop;