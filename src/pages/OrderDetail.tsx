import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Package, MapPin, CreditCard, Truck, Loader2 } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format, addBusinessDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrderItem {
  id: string;
  product_name: string;
  price: number;
  quantity: number;
  product_id: string | null;
}

interface Order {
  id: string;
  total: number;
  status: string;
  payment_status: string | null;
  payment_method: string | null;
  created_at: string;
  shipping_address: Record<string, any> | null;
}

interface Product {
  id: string;
  image: string | null;
}

const OrderDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useStoreSettings();
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && id) {
      fetchOrderDetails();
    }
  }, [user, id]);

  const fetchOrderDetails = async () => {
    if (!user || !id) return;
    setIsLoading(true);

    try {
      // Fetch order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (orderError || !orderData) {
        console.error("Error fetching order:", orderError);
        navigate("/profile");
        return;
      }

      setOrder(orderData as Order);

      // Fetch order items
      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", id);

      if (itemsError) {
        console.error("Error fetching order items:", itemsError);
      } else {
        setOrderItems(itemsData || []);

        // Fetch product images
        const productIds = itemsData
          ?.map((item) => item.product_id)
          .filter((pid): pid is string => pid !== null);

        if (productIds && productIds.length > 0) {
          const { data: productsData } = await supabase
            .from("products")
            .select("id, image")
            .in("id", productIds);

          if (productsData) {
            const productsMap: Record<string, Product> = {};
            productsData.forEach((p) => {
              productsMap[p.id] = p;
            });
            setProducts(productsMap);
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: "Pendente",
      awaiting_payment: "Aguardando Pagamento",
      processing: "Processando",
      shipped: "Enviado",
      delivered: "Entregue",
      cancelled: "Cancelado",
      confirmed: "Confirmado",
    };
    return statusMap[status] || status;
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "delivered":
      case "confirmed":
        return "default";
      case "shipped":
      case "processing":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return "—";
    const methodMap: Record<string, string> = {
      card: "Cartão de Crédito",
      pix: "Pix",
      boleto: "Boleto Bancário",
    };
    return methodMap[method] || method;
  };

  const getPaymentStatusLabel = (status: string | null) => {
    if (!status) return "—";
    const statusMap: Record<string, string> = {
      pending: "Pendente",
      paid: "Pago",
      failed: "Falhou",
    };
    return statusMap[status] || status;
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const formatAddress = (address: Order["shipping_address"]) => {
    if (!address) return "Endereço não informado";
    
    const parts = [
      address.street,
      address.number,
      address.complement,
      address.neighborhood,
      `${address.city} - ${address.state}`,
      address.zip,
    ].filter(Boolean);
    
    return parts.join(", ");
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container py-20 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!order) {
    return (
      <MainLayout>
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Pedido não encontrado</h1>
          <Button onClick={() => navigate("/profile")}>Voltar ao Perfil</Button>
        </div>
      </MainLayout>
    );
  }

  const orderDate = new Date(order.created_at);
  const estimatedDeliveryMin = addBusinessDays(orderDate, settings.delivery_min_days);
  const estimatedDeliveryMax = addBusinessDays(orderDate, settings.delivery_max_days);

  // Calculate subtotal from items
  const subtotal = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = order.total - subtotal;

  return (
    <MainLayout>
      <div className="container py-12 animate-fade-in">
        <Link 
          to="/orders" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8 transition-all duration-200 hover:-translate-x-1 group"
        >
          <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Voltar aos Meus Pedidos
        </Link>

        <div 
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-in"
          style={{ animationDelay: '100ms' }}
        >
          <div>
            <h1 className="text-3xl font-bold">Pedido #{order.id.slice(0, 8).toUpperCase()}</h1>
            <p className="text-muted-foreground">
              {format(orderDate, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
          <Badge variant={getStatusVariant(order.status)} className="self-start sm:self-center text-sm px-4 py-1">
            {getStatusLabel(order.status)}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Items */}
          <div className="lg:col-span-2 animate-fade-in" style={{ animationDelay: '200ms' }}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Itens do Pedido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {orderItems.map((item, index) => (
                    <div 
                      key={item.id} 
                      className="flex gap-4 p-4 border border-border rounded-lg transition-all duration-200 hover:border-primary/30 hover:shadow-sm animate-fade-in"
                      style={{ animationDelay: `${300 + index * 50}ms` }}
                    >
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {item.product_id && products[item.product_id]?.image ? (
                          <img
                            src={products[item.product_id].image!}
                            alt={item.product_name}
                            className="h-full w-full object-cover transition-transform duration-200 hover:scale-110"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          Qtd: {item.quantity} × {formatPrice(item.price)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary & Details */}
          <div className="space-y-6">
            {/* Delivery Address */}
            <Card className="animate-fade-in" style={{ animationDelay: '400ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-5 w-5" />
                  Endereço de Entrega
                </CardTitle>
              </CardHeader>
              <CardContent>
                {order.shipping_address ? (
                  <div className="text-sm space-y-1">
                    <p className="font-medium">
                      {order.shipping_address.firstName} {order.shipping_address.lastName}
                    </p>
                    <p>{order.shipping_address.street}, {order.shipping_address.number}</p>
                    {order.shipping_address.complement && <p>{order.shipping_address.complement}</p>}
                    <p>{order.shipping_address.neighborhood}</p>
                    <p>{order.shipping_address.city} - {order.shipping_address.state}</p>
                    <p>{order.shipping_address.zip}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Endereço não informado</p>
                )}
              </CardContent>
            </Card>

            {/* Payment */}
            <Card className="animate-fade-in" style={{ animationDelay: '500ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-5 w-5" />
                  Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Método</span>
                  <span>{getPaymentMethodLabel(order.payment_method)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span>{getPaymentStatusLabel(order.payment_status)}</span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frete</span>
                  <span>{shipping > 0 ? formatPrice(shipping) : "Grátis"}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(order.total)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Delivery Estimate */}
            <Card className="animate-fade-in" style={{ animationDelay: '600ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="h-5 w-5" />
                  Prazo de Entrega
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  Previsão: {format(estimatedDeliveryMin, "dd/MM", { locale: ptBR })} a{" "}
                  {format(estimatedDeliveryMax, "dd/MM/yyyy", { locale: ptBR })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {settings.delivery_min_days} a {settings.delivery_max_days} dias úteis
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default OrderDetail;
