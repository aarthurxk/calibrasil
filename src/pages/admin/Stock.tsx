import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Package, ArrowLeftRight, Search, RefreshCw, ChevronRight, ChevronDown } from 'lucide-react';
import { StockTransferModal } from '@/components/admin/StockTransferModal';
import { StockTransferList } from '@/components/admin/StockTransferList';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Store {
  id: string;
  name: string;
  code: string;
  display_order: number;
}

interface StoreStock {
  id: string;
  store_id: string;
  quantity: number;
  reserved_quantity: number;
}

interface StockItem {
  variant_id: string;
  product_id: string;
  product_name: string;
  color: string | null;
  model: string | null;
  codigo_variacao: string | null;
  stocks: StoreStock[];
}

interface ProductGroup {
  product_id: string;
  product_name: string;
  variants: StockItem[];
  totalStock: number;
}

const Stock = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<StockItem | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  // Fetch stores
  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data as Store[];
    },
  });

  // Fetch stock data
  const { data: stockItems = [], isLoading, refetch } = useQuery({
    queryKey: ['store-stock'],
    queryFn: async () => {
      // Get all variants with product info
      const { data: variants, error: variantsError } = await supabase
        .from('product_variants')
        .select(`
          id,
          color,
          model,
          codigo_variacao,
          product_id,
          products (name)
        `)
        .order('created_at', { ascending: false });

      if (variantsError) throw variantsError;

      // Get all store stocks
      const { data: stocks, error: stocksError } = await supabase
        .from('store_stock')
        .select('*');

      if (stocksError) throw stocksError;

      // Map variants to stock items
      const items: StockItem[] = (variants || []).map((variant: any) => ({
        variant_id: variant.id,
        product_id: variant.product_id,
        product_name: variant.products?.name || 'Produto sem nome',
        color: variant.color,
        model: variant.model,
        codigo_variacao: variant.codigo_variacao,
        stocks: stocks?.filter((s: any) => s.product_variant_id === variant.id) || [],
      }));

      return items;
    },
  });

  // Update stock mutation
  const updateStockMutation = useMutation({
    mutationFn: async ({ 
      variantId, 
      storeId, 
      quantity 
    }: { 
      variantId: string; 
      storeId: string; 
      quantity: number;
    }) => {
      const { error } = await supabase
        .from('store_stock')
        .upsert({
          product_variant_id: variantId,
          store_id: storeId,
          quantity,
        }, {
          onConflict: 'product_variant_id,store_id',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-stock'] });
      toast.success('Estoque atualizado');
    },
    onError: () => {
      toast.error('Erro ao atualizar estoque');
    },
  });

  // Filter items by search
  const filteredItems = stockItems.filter((item) => {
    const searchLower = search.toLowerCase();
    return (
      item.product_name.toLowerCase().includes(searchLower) ||
      item.color?.toLowerCase().includes(searchLower) ||
      item.model?.toLowerCase().includes(searchLower) ||
      item.codigo_variacao?.toLowerCase().includes(searchLower)
    );
  });

  const getStockForStore = (item: StockItem, storeId: string) => {
    const stock = item.stocks.find((s) => s.store_id === storeId);
    return stock?.quantity || 0;
  };

  const getReservedForStore = (item: StockItem, storeId: string) => {
    const stock = item.stocks.find((s) => s.store_id === storeId);
    return stock?.reserved_quantity || 0;
  };

  const getTotalStock = (item: StockItem) => {
    return item.stocks.reduce((sum, s) => sum + (s.quantity - s.reserved_quantity), 0);
  };

  // Group items by product
  const groupedProducts = useMemo(() => {
    const groups: Record<string, ProductGroup> = {};
    
    filteredItems.forEach(item => {
      if (!groups[item.product_id]) {
        groups[item.product_id] = {
          product_id: item.product_id,
          product_name: item.product_name,
          variants: [],
          totalStock: 0,
        };
      }
      groups[item.product_id].variants.push(item);
      groups[item.product_id].totalStock += getTotalStock(item);
    });
    
    return Object.values(groups);
  }, [filteredItems]);

  const toggleProduct = (productId: string) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleStockChange = (variantId: string, storeId: string, value: string) => {
    const quantity = parseInt(value, 10);
    if (isNaN(quantity) || quantity < 0) return;
    updateStockMutation.mutate({ variantId, storeId, quantity });
  };

  const openTransferModal = (item: StockItem) => {
    setSelectedVariant(item);
    setTransferModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Estoque</h1>
          <p className="text-muted-foreground">Gerencie o estoque por loja</p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Estoque por Loja
          </TabsTrigger>
          <TabsTrigger value="transfers" className="flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            Transferências
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por produto, cor, modelo..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : groupedProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Nenhum produto encontrado</div>
              ) : (
                <div className="divide-y">
                  {groupedProducts.map((group) => {
                    const isExpanded = expandedProducts.has(group.product_id);
                    return (
                      <Collapsible
                        key={group.product_id}
                        open={isExpanded}
                        onOpenChange={() => toggleProduct(group.product_id)}
                      >
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                              {isExpanded ? (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              )}
                              <span className="font-medium text-left">{group.product_name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {group.variants.length} {group.variants.length === 1 ? 'variante' : 'variantes'}
                              </Badge>
                            </div>
                            <Badge variant={group.totalStock > 0 ? 'default' : 'destructive'}>
                              {group.totalStock} un.
                            </Badge>
                          </div>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <div className="bg-muted/30 px-4 pb-4">
                            <div className="overflow-x-auto rounded-md border bg-background">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Cor</TableHead>
                                    <TableHead>Modelo</TableHead>
                                    {stores.map((store) => (
                                      <TableHead key={store.id} className="text-center min-w-[100px]">
                                        {store.name}
                                      </TableHead>
                                    ))}
                                    <TableHead className="text-center">Total</TableHead>
                                    <TableHead className="text-center">Ações</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {group.variants.map((item) => {
                                    const total = getTotalStock(item);
                                    return (
                                      <TableRow key={item.variant_id}>
                                        <TableCell>
                                          <div>
                                            <p>{item.color || '-'}</p>
                                            {item.codigo_variacao && (
                                              <p className="text-xs text-muted-foreground">{item.codigo_variacao}</p>
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell>{item.model || '-'}</TableCell>
                                        {stores.map((store) => {
                                          const qty = getStockForStore(item, store.id);
                                          const reserved = getReservedForStore(item, store.id);
                                          return (
                                            <TableCell key={store.id} className="text-center">
                                              <div className="flex flex-col items-center gap-1">
                                                <Input
                                                  type="number"
                                                  min="0"
                                                  value={qty}
                                                  onChange={(e) => handleStockChange(item.variant_id, store.id, e.target.value)}
                                                  className="w-20 text-center"
                                                />
                                                {reserved > 0 && (
                                                  <Badge variant="secondary" className="text-xs">
                                                    {reserved} reserv.
                                                  </Badge>
                                                )}
                                              </div>
                                            </TableCell>
                                          );
                                        })}
                                        <TableCell className="text-center">
                                          <Badge variant={total > 0 ? 'default' : 'destructive'}>
                                            {total}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openTransferModal(item)}
                                            disabled={total === 0}
                                          >
                                            <ArrowLeftRight className="h-4 w-4" />
                                          </Button>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transfers">
          <StockTransferList stores={stores} />
        </TabsContent>
      </Tabs>

      <StockTransferModal
        open={transferModalOpen}
        onOpenChange={setTransferModalOpen}
        variant={selectedVariant}
        stores={stores}
      />
    </div>
  );
};

export default Stock;
