import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Eye, Loader2, X, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { OrderDetailsDialog } from '@/components/admin/OrderDetailsDialog';

// Helper to send order status email
const sendOrderStatusEmail = async (
  orderId: string,
  customerEmail: string,
  customerName: string,
  oldStatus: string,
  newStatus: string
) => {
  try {
    const response = await supabase.functions.invoke('send-order-status-email', {
      body: {
        orderId,
        customerEmail,
        customerName,
        oldStatus,
        newStatus,
      },
    });
    
    if (response.error) {
      console.error('Error sending status email:', response.error);
    } else {
      console.log('Status email sent successfully');
    }
  } catch (error) {
    console.error('Failed to send status email:', error);
  }
};

const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    delivered: 'bg-green-100 text-green-800',
    completed: 'bg-green-100 text-green-800',
    confirmed: 'bg-green-100 text-green-800',
    processing: 'bg-blue-100 text-blue-800',
    shipped: 'bg-purple-100 text-purple-800',
    pending: 'bg-yellow-100 text-yellow-800',
    awaiting_payment: 'bg-orange-100 text-orange-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return styles[status] || 'bg-muted text-muted-foreground';
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    delivered: 'Entregue',
    completed: 'Concluído',
    confirmed: 'Confirmado',
    processing: 'Processando',
    shipped: 'Enviado',
    pending: 'Pendente',
    awaiting_payment: 'Aguardando Pagamento',
    cancelled: 'Cancelado',
  };
  return labels[status] || status;
};

const getPaymentStatusBadge = (paymentStatus: string | null) => {
  const styles: Record<string, string> = {
    paid: 'bg-green-100 text-green-800',
    approved: 'bg-green-100 text-green-800',
    awaiting_payment: 'bg-orange-100 text-orange-800',
    pending: 'bg-yellow-100 text-yellow-800',
    failed: 'bg-red-100 text-red-800',
    expired: 'bg-gray-100 text-gray-800',
    refunded: 'bg-purple-100 text-purple-800',
  };
  return styles[paymentStatus || 'pending'] || 'bg-muted text-muted-foreground';
};

const getPaymentStatusLabel = (paymentStatus: string | null) => {
  const labels: Record<string, string> = {
    paid: 'Pago',
    approved: 'Aprovado',
    awaiting_payment: 'Aguardando Pagamento',
    pending: 'Pendente',
    failed: 'Falhou',
    expired: 'Expirado',
    refunded: 'Reembolsado',
  };
  return labels[paymentStatus || 'pending'] || paymentStatus || 'Pendente';
};

const formatPrice = (price: number) => {
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Helper to filter by date
const filterByDate = (orderDate: string, period: string): boolean => {
  if (period === 'all') return true;
  
  const date = new Date(orderDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (period) {
    case 'today':
      return date >= today;
    case 'week': {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo;
    }
    case 'month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return date >= monthStart;
    }
    case '30days': {
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return date >= thirtyDaysAgo;
    }
    case '90days': {
      const ninetyDaysAgo = new Date(today);
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      return date >= ninetyDaysAgo;
    }
    default:
      return true;
  }
};

const Orders = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const { canEditOrders } = useAuth();
  const queryClient = useQueryClient();

  // Read URL params on mount
  useEffect(() => {
    const status = searchParams.get('status');
    const payment = searchParams.get('payment');
    const period = searchParams.get('period');
    
    if (status) setStatusFilter(status);
    if (payment) setPaymentStatusFilter(payment);
    if (period) setDateFilter(period);
  }, [searchParams]);

  // Update URL when filters change
  const updateFilters = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === 'all') {
      newParams.delete(key);
    } else {
      newParams.set(key, value);
    }
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setPaymentStatusFilter('all');
    setDateFilter('all');
    setSearchParams(new URLSearchParams());
  };

  const hasActiveFilters = statusFilter !== 'all' || paymentStatusFilter !== 'all' || dateFilter !== 'all' || searchTerm !== '';

  // Fetch orders with items
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ 
      orderId, 
      status, 
      oldStatus,
      customerEmail,
      customerName 
    }: { 
      orderId: string; 
      status: string;
      oldStatus: string;
      customerEmail: string;
      customerName: string;
    }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);
      if (error) throw error;
      
      // Send status update email to customer
      await sendOrderStatusEmail(orderId, customerEmail, customerName, oldStatus, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Status atualizado e email enviado!');
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    },
  });

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesPayment = paymentStatusFilter === 'all' || order.payment_status === paymentStatusFilter;
    const matchesDate = filterByDate(order.created_at, dateFilter);
    
    return matchesSearch && matchesStatus && matchesPayment && matchesDate;
  });

  // Calculate stats
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const processingOrders = orders.filter(o => o.status === 'processing').length;
  const shippedOrders = orders.filter(o => o.status === 'shipped').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pedidos</h1>
        <p className="text-muted-foreground">
          Gerencie e acompanhe os pedidos dos clientes
          {!canEditOrders && <span className="text-yellow-600 ml-2">(Modo visualização)</span>}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Processando
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{processingOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Enviados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{shippedOrders}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar pedidos por ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>Filtros:</span>
            </div>
            
            {/* Order Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                updateFilters('status', value);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status do Pedido" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="awaiting_payment">Aguardando Pagamento</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="processing">Processando</SelectItem>
                <SelectItem value="shipped">Enviado</SelectItem>
                <SelectItem value="delivered">Entregue</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            {/* Payment Status Filter */}
            <Select
              value={paymentStatusFilter}
              onValueChange={(value) => {
                setPaymentStatusFilter(value);
                updateFilters('payment', value);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status Pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Pagamentos</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="awaiting_payment">Aguardando</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
                <SelectItem value="expired">Expirado</SelectItem>
                <SelectItem value="refunded">Reembolsado</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Filter */}
            <Select
              value={dateFilter}
              onValueChange={(value) => {
                setDateFilter(value);
                updateFilters('period', value);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo Período</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Esta Semana</SelectItem>
                <SelectItem value="month">Este Mês</SelectItem>
                <SelectItem value="30days">Últimos 30 dias</SelectItem>
                <SelectItem value="90days">Últimos 90 dias</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          {/* Results Counter */}
          <div className="text-sm text-muted-foreground">
            Mostrando {filteredOrders.length} de {orders.length} pedidos
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pedidos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">ID</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Itens</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Total</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Gateway</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Pagamento</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Data</th>
                  {canEditOrders && (
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b border-border last:border-0">
                      <td className="py-3 px-4 font-medium">#{order.id.slice(0, 8)}</td>
                      <td className="py-3 px-4">{order.order_items?.length || 0} itens</td>
                      <td className="py-3 px-4 font-medium">{formatPrice(Number(order.total))}</td>
                      <td className="py-3 px-4">
                        <Badge className={
                          order.payment_gateway === 'stripe' 
                            ? 'bg-purple-100 text-purple-800' 
                            : order.payment_gateway === 'pagseguro'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-muted text-muted-foreground'
                        }>
                          {order.payment_gateway === 'stripe' ? 'Stripe' : order.payment_gateway === 'pagseguro' ? 'PagSeguro' : 'N/A'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getPaymentStatusBadge(order.payment_status)}>
                          {getPaymentStatusLabel(order.payment_status)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        {canEditOrders ? (
                          <Select
                            value={order.status}
                            onValueChange={(value) => {
                              // Get customer info from order
                              const shippingAddress = order.shipping_address as any;
                              const customerName = shippingAddress?.name || 
                                `${shippingAddress?.firstName || ''} ${shippingAddress?.lastName || ''}`.trim() || 
                                'Cliente';
                              const customerEmail = order.guest_email || '';
                              
                              updateStatusMutation.mutate({ 
                                orderId: order.id, 
                                status: value,
                                oldStatus: order.status,
                                customerEmail,
                                customerName
                              });
                            }}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pendente</SelectItem>
                              <SelectItem value="processing">Processando</SelectItem>
                              <SelectItem value="shipped">Enviado</SelectItem>
                              <SelectItem value="delivered">Entregue</SelectItem>
                              <SelectItem value="cancelled">Cancelado</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge className={getStatusBadge(order.status)}>
                            {getStatusLabel(order.status)}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      {canEditOrders && (
                        <td className="py-3 px-4">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            aria-label="Ver detalhes do pedido"
                            onClick={() => {
                              setSelectedOrder(order);
                              setIsDetailsOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={canEditOrders ? 8 : 7} className="py-8 text-center text-muted-foreground">
                      {searchTerm ? 'Nenhum pedido encontrado' : 'Nenhum pedido ainda'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <OrderDetailsDialog 
        order={selectedOrder}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onTrackingCodeSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
          setIsDetailsOpen(false);
        }}
      />
    </div>
  );
};

export default Orders;
