import { useSearchParams, Link } from "react-router-dom";
import { Star, ArrowRight, Package, Loader2, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface OrderItem {
  id: string;
  product_id: string | null;
  product_name: string;
  price: number;
  quantity: number;
}

interface Product {
  id: string;
  name: string;
  image: string | null;
  category: string;
}

const Avaliar = () => {
  const [searchParams] = useSearchParams();
  const rawOrderId = searchParams.get("orderId");
  const rawToken = searchParams.get("token");
  const orderId = rawOrderId ? decodeURIComponent(rawOrderId) : null;
  const token = rawToken ? decodeURIComponent(rawToken) : null;

  // Fetch order items
  const { data: orderItems, isLoading: itemsLoading, error: itemsError } = useQuery({
    queryKey: ["order-items-review", orderId],
    queryFn: async () => {
      if (!orderId) return [];
      const { data, error } = await supabase
        .from("order_items")
        .select("id, product_id, product_name, price, quantity")
        .eq("order_id", orderId);
      if (error) throw error;
      return data as OrderItem[];
    },
    enabled: !!orderId && !!token,
  });

  // Fetch product details for images
  const productIds = orderItems?.map((item) => item.product_id).filter(Boolean) as string[] || [];
  const { data: products } = useQuery({
    queryKey: ["products-for-review", productIds],
    queryFn: async () => {
      if (productIds.length === 0) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, name, image, category")
        .in("id", productIds);
      if (error) throw error;
      return data as Product[];
    },
    enabled: productIds.length > 0,
  });

  const getProductImage = (productId: string | null) => {
    if (!productId || !products) return null;
    return products.find((p) => p.id === productId)?.image || null;
  };

  // Invalid link state
  if (!orderId || !token) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <AlertCircle className="h-12 w-12 text-destructive mb-3" />
          <h1 className="text-xl font-semibold mb-2">Link inválido</h1>
          <p className="text-muted-foreground">
            Este link está incompleto ou expirou. Tente novamente pelo seu e-mail mais recente.
          </p>
          <Button asChild className="mt-4">
            <Link to="/">Voltar à loja</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  // Loading state
  if (itemsLoading) {
    return (
      <MainLayout>
        <div className="container max-w-2xl mx-auto py-12 px-4">
          <div className="text-center mb-8">
            <Skeleton className="h-8 w-64 mx-auto mb-2" />
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </MainLayout>
    );
  }

  // Error state
  if (itemsError) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <AlertCircle className="h-12 w-12 text-destructive mb-3" />
          <h1 className="text-xl font-semibold mb-2">Erro ao carregar pedido</h1>
          <p className="text-muted-foreground">
            Não foi possível encontrar este pedido. Verifique o link do e-mail.
          </p>
          <Button asChild className="mt-4">
            <Link to="/">Voltar à loja</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  // No items found
  if (!orderItems || orderItems.length === 0) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <Package className="h-12 w-12 text-muted-foreground mb-3" />
          <h1 className="text-xl font-semibold mb-2">Nenhum produto encontrado</h1>
          <p className="text-muted-foreground">
            Este pedido não possui produtos para avaliar.
          </p>
          <Button asChild className="mt-4">
            <Link to="/">Voltar à loja</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-2xl mx-auto py-12 px-4">
        <div className="text-center mb-8">
          <Star className="h-10 w-10 text-primary mx-auto mb-3" />
          <h1 className="text-2xl font-bold mb-2">Avalie seus produtos</h1>
          <p className="text-muted-foreground">
            Sua opinião nos ajuda a melhorar! Clique em um produto para avaliá-lo.
          </p>
        </div>

        <div className="space-y-4">
          {orderItems.map((item) => {
            const image = getProductImage(item.product_id);
            return (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      {image ? (
                        <img
                          src={image}
                          alt={item.product_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{item.product_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Qtd: {item.quantity}
                      </p>
                    </div>
                    {item.product_id && (
                      <Button asChild size="sm" className="flex-shrink-0">
                        <Link to={`/review/${item.product_id}`}>
                          Avaliar
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
};

export default Avaliar;
