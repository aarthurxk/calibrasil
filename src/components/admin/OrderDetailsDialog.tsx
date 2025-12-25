import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Phone, Mail, Package, CreditCard, Calendar, Truck, Loader2, User, Send, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface OrderItem {
  id: string;
  product_name: string;
  price: number;
  quantity: number;
  color?: string;
  model?: string;
}

interface ShippingAddress {
  name?: string;
  firstName?: string;
  lastName?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
}

interface Order {
  id: string;
  total: number;
  status: string;
  payment_method?: string;
  payment_status?: string;
  guest_email?: string;
  phone?: string;
  shipping_address?: ShippingAddress;
  created_at: string;
  order_items?: OrderItem[];
  tracking_code?: string;
  user_id?: string;
}

interface OrderDetailsDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTrackingCodeSaved?: () => void;
  onOrderDeleted?: () => void;
}

const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    delivered: 'bg-green-100 text-green-800',
    completed: 'bg-green-100 text-green-800',
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
    processing: 'Processando',
    shipped: 'Enviado',
    pending: 'Pendente',
    awaiting_payment: 'Aguardando Pagamento',
    cancelled: 'Cancelado',
  };
  return labels[status] || status;
};

const getPaymentMethodLabel = (method?: string) => {
  if (!method) return 'Não informado';
  const labels: Record<string, string> = {
    card: 'Cartão de Crédito/Débito',
    pix: 'Pix',
    boleto: 'Boleto',
  };
  return labels[method] || method;
};

const formatPrice = (price: number) => {
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function OrderDetailsDialog({ order, open, onOpenChange, onTrackingCodeSaved, onOrderDeleted }: OrderDetailsDialogProps) {
  const [trackingCode, setTrackingCode] = useState(order?.tracking_code || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Buscar dados do perfil quando há user_id
  const { data: profile } = useQuery({
    queryKey: ['order-profile', order?.user_id],
    queryFn: async () => {
      if (!order?.user_id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('user_id', order.user_id)
        .single();
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data;
    },
    enabled: !!order?.user_id && open,
  });

  // Buscar email do usuário quando há user_id
  const { data: userEmailData } = useQuery({
    queryKey: ['order-user-email', order?.user_id],
    queryFn: async () => {
      if (!order?.user_id) return null;
      const { data, error } = await supabase.functions.invoke('get-user-email', {
        body: { userId: order.user_id }
      });
      if (error) {
        console.error('Error fetching user email:', error);
        return null;
      }
      return data?.email;
    },
    enabled: !!order?.user_id && open,
  });

  useEffect(() => {
    if (order?.tracking_code) {
      setTrackingCode(order.tracking_code);
    }
  }, [order?.tracking_code]);

  if (!order) return null;

  const address = order.shipping_address;
  
  // Priorizar dados do perfil sobre dados guest
  const customerName = profile?.full_name || 
    address?.name || 
    `${address?.firstName || ''} ${address?.lastName || ''}`.trim() || 
    'Cliente';
  
  const customerEmail = userEmailData || order.guest_email || '';
  const customerPhone = profile?.phone || order.phone || '';
  const isRegisteredUser = !!order.user_id;

  const subtotal = order.order_items?.reduce(
    (acc, item) => acc + item.price * item.quantity, 
    0
  ) || 0;
  const shipping = Number(order.total) - subtotal;

  const handleSaveTrackingCode = async () => {
    if (!trackingCode.trim()) {
      toast({
        title: 'Código obrigatório',
        description: 'Digite o código de rastreamento.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Update order with tracking code
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          tracking_code: trackingCode.trim(),
          status: 'shipped'
        })
        .eq('id', order.id);

      if (updateError) throw updateError;

      // Send email notification with tracking code
      if (customerEmail) {
        const { error: emailError } = await supabase.functions.invoke('send-order-status-email', {
          body: {
            orderId: order.id,
            customerEmail: customerEmail,
            customerName: customerName,
            oldStatus: order.status,
            newStatus: 'shipped',
            trackingCode: trackingCode.trim(),
          },
        });

        if (emailError) {
          console.error('Error sending email:', emailError);
          toast({
            title: 'Rastreio salvo',
            description: 'Código salvo, mas houve erro ao enviar email.',
            variant: 'default',
          });
        } else {
          toast({
            title: 'Sucesso!',
            description: 'Código de rastreamento salvo e email enviado ao cliente.',
          });
        }
      } else {
        toast({
          title: 'Rastreio salvo',
          description: 'Código de rastreamento salvo (cliente sem email).',
        });
      }

      onTrackingCodeSaved?.();
    } catch (error) {
      console.error('Error saving tracking code:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o código de rastreamento.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResendEmail = async () => {
    setIsResending(true);
    try {
      let emailToUse = customerEmail;
      
      // Se não tem email e tem user_id, buscar via edge function
      if (!emailToUse && order.user_id) {
        const { data, error } = await supabase.functions.invoke('get-user-email', {
          body: { userId: order.user_id }
        });
        if (!error && data?.email) {
          emailToUse = data.email;
        }
      }
      
      if (!emailToUse) {
        toast({
          title: 'Sem email',
          description: 'Não foi possível encontrar o email do cliente.',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase.functions.invoke('test-order-email', {
        body: { orderId: order.id }
      });

      if (error) throw error;

      toast({
        title: 'Email enviado!',
        description: `Email de confirmação reenviado para ${emailToUse}`,
      });
    } catch (error) {
      console.error('Error resending email:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível reenviar o email.',
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleDeleteOrder = async () => {
    setIsDeleting(true);
    try {
      // Primeiro deletar os order_items
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', order.id);

      if (itemsError) throw itemsError;

      // Depois deletar o pedido
      const { error: orderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', order.id);

      if (orderError) throw orderError;

      toast({
        title: 'Pedido excluído',
        description: 'O pedido foi removido permanentemente.',
      });

      onOpenChange(false);
      onOrderDeleted?.();
    } catch (error) {
      console.error('Error deleting order:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o pedido.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Pedido #{order.id.slice(0, 8)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status e Data */}
          <div className="flex items-center justify-between">
            <Badge className={getStatusBadge(order.status)}>
              {getStatusLabel(order.status)}
            </Badge>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {formatDate(order.created_at)}
            </div>
          </div>

          <Separator />

          {/* Código de Rastreamento */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="h-4 w-4 text-primary" />
              <Label className="font-semibold">Código de Rastreamento</Label>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Ex: AA123456789BR"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value.toUpperCase())}
                className="flex-1 font-mono"
              />
              <Button 
                onClick={handleSaveTrackingCode} 
                disabled={isSaving}
                size="default"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : order.tracking_code ? (
                  'Atualizar'
                ) : (
                  'Salvar e Enviar'
                )}
              </Button>
            </div>
            {order.tracking_code && (
              <p className="text-xs text-muted-foreground mt-2">
                ✅ Código atual: {order.tracking_code}
              </p>
            )}
          </div>

          <Separator />

          {/* Informações do Cliente */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Informações do Cliente
              {isRegisteredUser && (
                <Badge variant="outline" className="text-xs">
                  Cadastrado
                </Badge>
              )}
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{customerName}</span>
              </div>
              {customerEmail && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {customerEmail}
                </div>
              )}
              {customerPhone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {customerPhone}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Endereço de Entrega */}
          {address && (
            <>
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Endereço de Entrega
                </h3>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    {address.street}, {address.number}
                    {address.complement && ` - ${address.complement}`}
                  </p>
                  <p>{address.neighborhood}</p>
                  <p>
                    {address.city} - {address.state}
                  </p>
                  <p>CEP: {address.cep}</p>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Itens do Pedido */}
          <div>
            <h3 className="font-semibold mb-3">Itens do Pedido</h3>
            <div className="space-y-3">
              {order.order_items?.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-start p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{item.product_name}</p>
                    <div className="text-sm text-muted-foreground">
                      {item.color && <span>Cor: {item.color}</span>}
                      {item.color && item.model && <span> • </span>}
                      {item.model && <span>Modelo: {item.model}</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Qtd: {item.quantity} × {formatPrice(item.price)}
                    </p>
                  </div>
                  <p className="font-medium">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Resumo Financeiro */}
          <div>
            <h3 className="font-semibold mb-3">Resumo</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frete</span>
                <span>{shipping > 0 ? formatPrice(shipping) : 'Grátis'}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold text-base">
                <span>Total</span>
                <span>{formatPrice(Number(order.total))}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Pagamento */}
          <div className="flex items-center gap-2 text-sm">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Método de pagamento:</span>
            <span className="font-medium">
              {getPaymentMethodLabel(order.payment_method || undefined)}
            </span>
          </div>

          <Separator />

          {/* Ações */}
          <div>
            <h3 className="font-semibold mb-3">Ações</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResendEmail}
                disabled={isResending || (!customerEmail && !order.user_id)}
              >
                {isResending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Reenviar Email
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Pedido
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir pedido?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. O pedido #{order.id.slice(0, 8)} e todos os seus itens serão removidos permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteOrder}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : null}
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
