import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Package, ChevronRight, ShoppingBag, Star, CheckCircle } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Order {
  id: string;
  total: number;
  status: string;
  created_at: string;
  item_count?: number;
  review_email_sent?: boolean;
  has_review?: boolean;
}

const MyOrders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  useEffect(() => {
    if (statusFilter === "all") {
      setFilteredOrders(orders);
    } else {
      setFilteredOrders(orders.filter((order) => order.status === statusFilter));
    }
  }, [statusFilter, orders]);

  const fetchOrders = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Fetch orders with review_email_sent
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("id, total, status, created_at, review_email_sent")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (ordersError) {
        console.error("Error fetching orders:", ordersError);
        return;
      }

      // Fetch item counts and check for existing reviews
      const ordersWithDetails = await Promise.all(
        (ordersData || []).map(async (order) => {
          const { count: itemCount } = await supabase
            .from("order_items")
            .select("*", { count: "exact", head: true })
            .eq("order_id", order.id);

          // Check if user has any reviews for this order
          const { count: reviewCount } = await supabase
            .from("product_reviews")
            .select("*", { count: "exact", head: true })
            .eq("order_id", order.id)
            .eq("user_id", user.id);

          return {
            ...order,
            item_count: itemCount || 0,
            has_review: (reviewCount || 0) > 0,
          };
        })
      );

      setOrders(ordersWithDetails);
      setFilteredOrders(ordersWithDetails);
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

  const formatPrice = (price: number) => {
    return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container py-12 animate-fade-in">
          <div className="h-6 w-32 bg-muted rounded animate-shimmer mb-8" />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <div className="h-8 w-48 bg-muted rounded animate-shimmer" />
              <div className="h-4 w-24 bg-muted rounded mt-2 animate-shimmer" style={{ animationDelay: '100ms' }} />
            </div>
            <div className="h-10 w-48 bg-muted rounded animate-shimmer" style={{ animationDelay: '200ms' }} />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-6 border border-border rounded-lg animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-muted animate-shimmer" />
                  <div className="flex-1">
                    <div className="h-5 w-32 bg-muted rounded animate-shimmer" />
                    <div className="h-4 w-48 bg-muted rounded mt-2 animate-shimmer" style={{ animationDelay: '100ms' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-12 animate-fade-in">
        <Link 
          to="/profile" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8 transition-all duration-200 hover:-translate-x-1 group"
        >
          <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Voltar ao Perfil
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="animate-fade-in">
            <h1 className="text-3xl font-bold">Meus Pedidos</h1>
            <p className="text-muted-foreground">
              {orders.length} {orders.length === 1 ? "pedido" : "pedidos"} no total
            </p>
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px] transition-all duration-200 hover:border-primary">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="awaiting_payment">Aguardando Pagamento</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="processing">Processando</SelectItem>
              <SelectItem value="shipped">Enviado</SelectItem>
              <SelectItem value="delivered">Entregue</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredOrders.length === 0 ? (
          <Card className="py-16 animate-fade-in">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <div className="animate-float">
                <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
              </div>
              <h2 className="text-xl font-semibold mb-2">
                {statusFilter === "all" ? "Nenhum pedido ainda" : "Nenhum pedido encontrado"}
              </h2>
              <p className="text-muted-foreground mb-6">
                {statusFilter === "all" 
                  ? "Quando você fizer seu primeiro pedido, ele aparecerá aqui."
                  : "Não há pedidos com esse status."}
              </p>
              {statusFilter === "all" && (
                <Button onClick={() => navigate("/shop")} className="hover:scale-105 transition-transform">
                  Ir para a Loja
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order, index) => (
              <Link 
                key={order.id} 
                to={`/order/${order.id}`}
                className="block animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Card className="transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/50 group">
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:bg-primary/10">
                        <Package className="h-6 w-6 text-muted-foreground transition-colors group-hover:text-primary" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <p className="font-semibold">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(order.created_at), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
                          </p>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2">
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">
                              {order.item_count} {order.item_count === 1 ? "item" : "itens"}
                            </span>
                                          <Badge variant={getStatusVariant(order.status)}>
                              {getStatusLabel(order.status)}
                            </Badge>
                            {/* Review badge/button for delivered orders */}
                            {order.status === "delivered" && (
                              order.has_review ? (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Avaliado
                                </Badge>
                              ) : (
                                <Link 
                                  to={`/avaliar?orderId=${order.id}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                >
                                  <Star className="h-3 w-3 mr-1" />
                                  Avaliar
                                </Link>
                              )
                            )}
                          </div>
                          <p className="font-semibold text-lg">
                            {formatPrice(order.total)}
                          </p>
                        </div>
                      </div>
                      
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 hidden sm:block transition-transform group-hover:translate-x-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default MyOrders;
