import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Package, ArrowLeftRight, Search, RefreshCw } from 'lucide-react';
import { StockTransferModal } from '@/components/admin/StockTransferModal';
import { StockTransferList } from '@/components/admin/StockTransferList';
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

const Stock = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<StockItem | null>(null);

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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Produto</TableHead>
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
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={stores.length + 5} className="text-center py-8">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : filteredItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={stores.length + 5} className="text-center py-8">
                          Nenhum produto encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredItems.map((item) => {
                        const total = getTotalStock(item);
                        return (
                          <TableRow key={item.variant_id}>
                            <TableCell className="font-medium">
                              <div>
                                <p className="truncate max-w-[200px]">{item.product_name}</p>
                                {item.codigo_variacao && (
                                  <p className="text-xs text-muted-foreground">{item.codigo_variacao}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{item.color || '-'}</TableCell>
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
                                disabled={getTotalStock(item) === 0}
                              >
                                <ArrowLeftRight className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
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
