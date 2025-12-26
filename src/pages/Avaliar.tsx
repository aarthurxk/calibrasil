import { useSearchParams, Link } from "react-router-dom";
import { Star, ArrowRight, Package, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import MainLayout from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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

  if (!orderId || !token) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-3" />
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

  // 🔽 o resto do código original continua igual (fetches, UI de avaliação etc.)
};

export default Avaliar;
