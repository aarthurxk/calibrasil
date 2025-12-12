import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { MapPin, Phone, Mail, Package, CreditCard, Calendar } from 'lucide-react';

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
}

interface OrderDetailsDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function OrderDetailsDialog({ order, open, onOpenChange }: OrderDetailsDialogProps) {
  if (!order) return null;

  const address = order.shipping_address;
  const customerName = address?.name || 
    `${address?.firstName || ''} ${address?.lastName || ''}`.trim() || 
    'Cliente';

  const subtotal = order.order_items?.reduce(
    (acc, item) => acc + item.price * item.quantity, 
    0
  ) || 0;
  const shipping = Number(order.total) - subtotal;

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

          {/* Informações do Cliente */}
          <div>
            <h3 className="font-semibold mb-3">Informações do Cliente</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{customerName}</span>
              </div>
              {order.guest_email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {order.guest_email}
                </div>
              )}
              {order.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {order.phone}
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
