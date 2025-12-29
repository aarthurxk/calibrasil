import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle2, AlertCircle, Loader2, ShoppingBag, Star } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * MAGIC LOGIN PAGE
 * 
 * Route: /magic-login
 * 
 * This page is accessed via magic link from email.
 * It verifies the JWT token and confirms the order receipt,
 * then allows the user to review products.
 */

type Status = "loading" | "confirming" | "confirmed" | "already" | "invalid" | "expired" | "error";

interface ConfirmResponse {
  status: Status;
  message_pt: string;
  orderId?: string;
}

const MagicLogin = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("Verificando seu link...");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [hasAttempted, setHasAttempted] = useState(false);

  const token = searchParams.get("token");

  const verifyAndConfirm = useCallback(async () => {
    if (hasAttempted) return;
    setHasAttempted(true);

    // Validate token
    if (!token) {
      setStatus("invalid");
      setMessage("Link inválido. Parâmetros ausentes.");
      return;
    }

    try {
      console.log("[MagicLogin] Verifying token...");
      setStatus("confirming");
      setMessage("Confirmando recebimento do pedido...");

      // Call confirm-order-magic directly (includes verification + confirmation)
      const { data, error } = await supabase.functions.invoke<ConfirmResponse>(
        "confirm-order-magic",
        {
          body: { token },
        }
      );

      console.log("[MagicLogin] Response:", { data, error });

      if (error) {
        console.error("[MagicLogin] Error:", error);
        setStatus("error");
        setMessage("Erro ao confirmar recebimento. Tente novamente.");
        return;
      }

      if (data) {
        setStatus(data.status);
        setMessage(data.message_pt);
        if (data.orderId) {
          setOrderId(data.orderId);
        }

        // Show toast for success states
        if (data.status === "confirmed") {
          toast.success("Recebimento confirmado! Agora você pode avaliar seus produtos.");
        } else if (data.status === "already") {
          toast.info("Este pedido já foi confirmado anteriormente.");
        }
      } else {
        setStatus("error");
        setMessage("Resposta inválida do servidor.");
      }
    } catch (err) {
      console.error("[MagicLogin] Unexpected error:", err);
      setStatus("error");
      setMessage("Erro inesperado. Tente novamente mais tarde.");
    }
  }, [token, hasAttempted]);

  useEffect(() => {
    verifyAndConfirm();
  }, [verifyAndConfirm]);

  // Visual config by status
  const getContent = () => {
    switch (status) {
      case "loading":
      case "confirming":
        return {
          icon: <Loader2 className="h-16 w-16 text-primary animate-spin" />,
          title: status === "loading" ? "Verificando link..." : "Confirmando recebimento...",
        };
      case "confirmed":
        return {
          icon: <CheckCircle2 className="h-16 w-16 text-green-500" />,
          title: "Recebimento confirmado!",
        };
      case "already":
        return {
          icon: <CheckCircle2 className="h-16 w-16 text-blue-500" />,
          title: "Pedido já confirmado",
        };
      case "expired":
        return {
          icon: <AlertCircle className="h-16 w-16 text-amber-500" />,
          title: "Link expirado",
        };
      case "invalid":
      case "error":
      default:
        return {
          icon: <AlertCircle className="h-16 w-16 text-destructive" />,
          title: "Erro na confirmação",
        };
    }
  };

  const content = getContent();
  const isLoading = status === "loading" || status === "confirming";
  const canReview = (status === "confirmed" || status === "already") && orderId && token;

  return (
    <MainLayout>
      <div className="container py-12 animate-fade-in">
        <div className="max-w-lg mx-auto">
          <Card className="text-center">
            <CardContent className="pt-8 pb-8">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                {content.icon}
              </div>

              {/* Title */}
              <h1 className="text-2xl font-bold mb-3">{content.title}</h1>

              {/* Detailed message */}
              <p className="text-muted-foreground mb-8">{message}</p>

              {/* Action buttons - only show after loading */}
              {!isLoading && (
                <div className="flex flex-col gap-3">
                  {/* Review button - appears after successful confirmation */}
                  {canReview && (
                    <Button asChild size="lg" className="w-full">
                      <Link to={`/avaliar?orderId=${encodeURIComponent(orderId)}&token=${encodeURIComponent(token)}`}>
                        <Star className="h-4 w-4 mr-2" />
                        Avaliar Produtos
                      </Link>
                    </Button>
                  )}

                  <Button asChild variant="outline">
                    <Link to="/shop">
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Continuar Comprando
                    </Link>
                  </Button>
                </div>
              )}

              {/* Support for errors */}
              {(status === "error" || status === "expired") && (
                <div className="mt-6 pt-6 border-t text-sm text-muted-foreground">
                  <p>Precisa de ajuda?</p>
                  <a href="mailto:oi@calibrasil.com" className="text-primary hover:underline">
                    oi@calibrasil.com
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default MagicLogin;
