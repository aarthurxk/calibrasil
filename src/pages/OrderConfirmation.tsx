import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, Loader2, Package, ArrowRight, Truck, Mail } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { useStoreSettings } from '@/hooks/useStoreSettings';

type OrderStatus = 'loading' | 'success' | 'pending' | 'failed' | 'not_found';

interface OrderData {
  id: string;
  status: string;
  payment_status: string;
  total: number;
  created_at: string;
  payment_method: string;
  masked_email?: string | null;
}

const OrderConfirmation = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const [status, setStatus] = useState<OrderStatus>('loading');
  const [order, setOrder] = useState<OrderData | null>(null);
  const { clearCart } = useCart();
  const { settings } = useStoreSettings();

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setStatus('not_found');
        return;
      }

      try {
        // Use Edge Function to bypass RLS and fetch order securely
        const { data, error } = await supabase.functions.invoke('get-order-confirmation', {
          body: { order_id: orderId }
        });

        if (error || !data?.order) {
          console.error('Error fetching order:', error);
          setStatus('not_found');
          return;
        }

        const orderData = data.order as OrderData;
        setOrder(orderData);

        if (orderData.payment_status === 'paid' || orderData.status === 'confirmed') {
          setStatus('success');
          clearCart();
        } else if (orderData.payment_status === 'failed') {
          setStatus('failed');
        } else if (orderData.payment_status === 'awaiting_payment' || orderData.status === 'awaiting_payment') {
          setStatus('pending');
          clearCart();
        } else {
          // For newly created orders that haven't been processed by webhook yet
          setStatus('pending');
          clearCart();
        }
      } catch (err) {
        console.error('Error fetching order:', err);
        setStatus('not_found');
      }
    };

    fetchOrder();
  }, [orderId, clearCart]);

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'pix': return 'Pix';
      case 'boleto': return 'Boleto Bancário';
      case 'card': return 'Cartão de Crédito';
      default: return method;
    }
  };

  const calculateDeliveryDate = (orderDate: string, daysToAdd: number) => {
    const date = new Date(orderDate);
    let businessDays = 0;
    
    while (businessDays < daysToAdd) {
      date.setDate(date.getDate() + 1);
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDays++;
      }
    }
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <MainLayout>
      <div className="container py-20">
        <div className="max-w-lg mx-auto text-center">
          {status === 'loading' && (
            <div className="space-y-4">
              <Loader2 className="h-16 w-16 animate-spin mx-auto text-primary" />
              <h1 className="text-2xl font-bold">Verificando seu pedido...</h1>
            </div>
          )}

          {status === 'success' && order && (
            <div className="space-y-6">
              <div className="bg-green-500/10 rounded-full p-6 w-fit mx-auto">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-green-500 mb-2">Pagamento Confirmado! 🎉</h1>
                <p className="text-muted-foreground">
                  Seu pedido foi recebido e está sendo preparado.
                </p>
              </div>

              {/* Email notification message */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary flex-shrink-0" />
                <p className="text-sm text-left">
                  Enviamos um email com todos os detalhes do seu pedido
                  {order.masked_email && <span className="font-medium"> para {order.masked_email}</span>}
                </p>
              </div>
              
              <div className="bg-card border border-border rounded-xl p-6 text-left space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Número do Pedido</span>
                  <span className="font-mono font-medium">{order.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold text-primary">{formatPrice(order.total)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Pagamento</span>
                  <span>{getPaymentMethodLabel(order.payment_method)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Data</span>
                  <span>{formatDate(order.created_at)}</span>
                </div>
              </div>

              {/* Prazo de Entrega */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 text-left space-y-3">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <Truck className="h-5 w-5" />
                  <span>Prazo de Entrega</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Estimativa</span>
                    <span className="font-medium">{settings.delivery_min_days} a {settings.delivery_max_days} dias úteis</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Entrega prevista até</span>
                    <span className="font-medium">{calculateDeliveryDate(order.created_at, settings.delivery_max_days)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/shop" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Continuar Comprando
                  </Button>
                </Link>
                <Link to="/" className="flex-1">
                  <Button className="w-full bg-gradient-ocean">
                    Ir para Home
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {status === 'pending' && order && (
            <div className="space-y-6">
              <div className="bg-yellow-500/10 rounded-full p-6 w-fit mx-auto">
                <Clock className="h-16 w-16 text-yellow-500" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-yellow-500 mb-2">Aguardando Pagamento</h1>
                <p className="text-muted-foreground">
                  {order.payment_method === 'boleto' 
                    ? 'Seu boleto foi gerado. O pagamento será confirmado em até 3 dias úteis.'
                    : order.payment_method === 'pix'
                    ? 'Complete o pagamento via Pix para confirmar seu pedido.'
                    : 'Complete o pagamento para confirmar seu pedido.'}
                </p>
              </div>

              {/* Email notification message */}
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-center gap-3">
                <Mail className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <p className="text-sm text-left">
                  Após a confirmação do pagamento, você receberá um email com todos os detalhes
                  {order.masked_email && <span className="font-medium"> em {order.masked_email}</span>}
                </p>
              </div>

              <div className="bg-card border border-border rounded-xl p-6 text-left space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Número do Pedido</span>
                  <span className="font-mono font-medium">{order.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold text-primary">{formatPrice(order.total)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Pagamento</span>
                  <span>{getPaymentMethodLabel(order.payment_method)}</span>
                </div>
              </div>

              {/* Prazo de Entrega após confirmação */}
              <div className="bg-muted/50 border border-border rounded-xl p-4 text-left">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Truck className="h-4 w-4" />
                  <span>Após confirmação do pagamento, a entrega será em {settings.delivery_min_days} a {settings.delivery_max_days} dias úteis</span>
                </div>
              </div>

              <Link to="/shop">
                <Button variant="outline">
                  Continuar Comprando
                </Button>
              </Link>
            </div>
          )}

          {status === 'failed' && (
            <div className="space-y-6">
              <div className="bg-destructive/10 rounded-full p-6 w-fit mx-auto">
                <XCircle className="h-16 w-16 text-destructive" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-destructive mb-2">Pagamento Falhou</h1>
                <p className="text-muted-foreground">
                  Infelizmente não conseguimos processar seu pagamento. Por favor, tente novamente.
                </p>
              </div>
              <Link to="/checkout">
                <Button className="bg-gradient-ocean">
                  Tentar Novamente
                </Button>
              </Link>
            </div>
          )}

          {status === 'not_found' && (
            <div className="space-y-6">
              <div className="bg-muted rounded-full p-6 w-fit mx-auto">
                <Package className="h-16 w-16 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2">Pedido Não Encontrado</h1>
                <p className="text-muted-foreground">
                  Não encontramos informações sobre este pedido.
                </p>
              </div>
              <Link to="/shop">
                <Button className="bg-gradient-ocean">
                  Ir para a Loja
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default OrderConfirmation;
