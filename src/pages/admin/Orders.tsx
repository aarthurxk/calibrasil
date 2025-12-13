import { useState } from 'react';
import { Search, Eye, Loader2 } from 'lucide-react';
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

const Orders = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const { canEditOrders } = useAuth();
  const queryClient = useQueryClient();

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

  const filteredOrders = orders.filter((order) =>
    order.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar pedidos por ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
                    <td colSpan={canEditOrders ? 7 : 6} className="py-8 text-center text-muted-foreground">
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
