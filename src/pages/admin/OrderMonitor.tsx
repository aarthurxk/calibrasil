import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertCircle, Search, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OrderMonitorCard } from '@/components/admin/OrderMonitorCard';
import { OrderDiagnosticPanel } from '@/components/admin/OrderDiagnosticPanel';
import { useOrderFlowChecker } from '@/hooks/useOrderFlowChecker';

const OrderMonitor = () => {
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ok' | 'pending' | 'error'>('all');

  // Fetch orders with items
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['monitor-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const selectedOrder = orders.find(o => o.id === selectedOrderId) || null;
  const flowResult = useOrderFlowChecker(selectedOrder);

  // Calculate order flow status for each order
  const getOrderFlowStatus = (order: any) => {
    const isPaid = order.payment_status === 'paid' || order.payment_status === 'approved';
    const hasEmail = !!order.guest_email;
    
    // Error conditions
    if (isPaid && order.status === 'pending') return 'error';
    if (isPaid && !hasEmail) return 'error';
    if (order.payment_status === 'failed') return 'error';
    
    // Pending conditions
    if (!isPaid && order.payment_status !== 'failed') return 'pending';
    if (isPaid && order.status === 'processing') return 'pending';
    
    // OK
    if (isPaid && (order.status === 'shipped' || order.status === 'delivered' || order.status === 'confirmed')) {
      return 'ok';
    }
    
    return 'pending';
  };

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    
    const orderStatus = getOrderFlowStatus(order);
    return matchesSearch && orderStatus === statusFilter;
  });

  // Stats
  const errorCount = orders.filter(o => getOrderFlowStatus(o) === 'error').length;
  const pendingCount = orders.filter(o => getOrderFlowStatus(o) === 'pending').length;
  const okCount = orders.filter(o => getOrderFlowStatus(o) === 'ok').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Monitor de Pedidos</h1>
        <p className="text-muted-foreground">
          Diagnóstico visual do fluxo completo de cada pedido
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Monitorados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'ok' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'ok' ? 'all' : 'ok')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              Fluxo OK
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{okCount}</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'pending' ? 'ring-2 ring-yellow-500' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card 
          className={`cursor-pointer transition-all ${statusFilter === 'error' ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => setStatusFilter(statusFilter === 'error' ? 'all' : 'error')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600">
              Com Erro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{errorCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Orders List - Left Column */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">Pedidos</CardTitle>
                <Badge variant="outline">{filteredOrders.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={statusFilter}
                  onValueChange={(value: any) => setStatusFilter(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="ok">✓ Fluxo OK</SelectItem>
                    <SelectItem value="pending">⏳ Pendentes</SelectItem>
                    <SelectItem value="error">⚠ Com Erro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Orders List */}
          <ScrollArea className="h-[calc(100vh-400px)]">
            <div className="space-y-2 pr-4">
              {filteredOrders.length === 0 ? (
                <Card className="p-8 text-center">
                  <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Nenhum pedido encontrado</p>
                </Card>
              ) : (
                filteredOrders.map(order => (
                  <OrderMonitorCard
                    key={order.id}
                    order={order}
                    isSelected={selectedOrderId === order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Diagnostic Panel - Right Column */}
        <div className="lg:col-span-7">
          {selectedOrder && flowResult ? (
            <OrderDiagnosticPanel order={selectedOrder} flowResult={flowResult} />
          ) : (
            <Card className="h-[calc(100vh-280px)] flex items-center justify-center">
              <div className="text-center p-8">
                <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg">Selecione um pedido</h3>
                <p className="text-muted-foreground mt-1">
                  Clique em um pedido na lista à esquerda para ver o diagnóstico completo
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderMonitor;
