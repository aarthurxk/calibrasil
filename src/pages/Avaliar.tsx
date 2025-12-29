import { useSearchParams, Link } from "react-router-dom";
import { Star, ArrowRight, Package, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

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
  const { user } = useAuth();
  const rawOrderId = searchParams.get("orderId");
  const rawToken = searchParams.get("token");
  const orderId = rawOrderId ? decodeURIComponent(rawOrderId) : null;
  const token = rawToken ? decodeURIComponent(rawToken) : null;

  // Fetch order items using magic token (bypasses RLS)
  const { data: magicData, isLoading: magicLoading, error: magicError } = useQuery({
    queryKey: ["order-items-magic", orderId, token],
    queryFn: async () => {
      if (!orderId || !token) return null;
      
      console.log("[Avaliar] Fetching order items with magic token...");
      
      const { data, error } = await supabase.functions.invoke("get-order-items-magic", {
        body: { token, orderId },
      });

      if (error) {
        console.error("[Avaliar] Magic token fetch error:", error);
        throw error;
      }

      console.log("[Avaliar] Magic token fetch success:", data);
      return data as { orderItems: OrderItem[]; products: Product[]; email: string };
    },
    enabled: !!orderId && !!token,
    retry: 1,
  });

  const orderItems = magicData?.orderItems || [];
  const products = magicData?.products || [];

  // Fetch existing reviews by current user (if authenticated)
  const productIds = orderItems?.map((item) => item.product_id).filter(Boolean) as string[] || [];
  const { data: existingReviews } = useQuery({
    queryKey: ["existing-reviews", productIds, user?.id],
    queryFn: async () => {
      if (productIds.length === 0 || !user?.id) return [];
      const { data, error } = await supabase
        .from("product_reviews")
        .select("product_id")
        .eq("user_id", user.id)
        .in("product_id", productIds);
      if (error) throw error;
      return data?.map((r) => r.product_id) || [];
    },
    enabled: productIds.length > 0 && !!user?.id,
  });

  const getProductImage = (productId: string | null) => {
    if (!productId || !products) return null;
    return products.find((p) => p.id === productId)?.image || null;
  };

  const isProductReviewed = (productId: string | null) => {
    if (!productId || !existingReviews) return false;
    return existingReviews.includes(productId);
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
  if (magicLoading) {
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
  if (magicError) {
    console.error("[Avaliar] Error loading items:", magicError);
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
          <AlertCircle className="h-12 w-12 text-destructive mb-3" />
          <h1 className="text-xl font-semibold mb-2">Erro ao carregar pedido</h1>
          <p className="text-muted-foreground">
            Não foi possível encontrar este pedido. O link pode ter expirado.
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
                      isProductReviewed(item.product_id) ? (
                        <div className="flex items-center gap-1.5 text-green-600">
                          <CheckCircle className="h-5 w-5" />
                          <span className="text-sm font-medium">Avaliado</span>
                        </div>
                      ) : (
                        <Button asChild size="sm" className="flex-shrink-0">
                          <Link to={`/review/${item.product_id}?orderId=${encodeURIComponent(orderId)}&token=${encodeURIComponent(token)}`}>
                            Avaliar
                            <ArrowRight className="h-4 w-4 ml-1" />
                          </Link>
                        </Button>
                      )
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
