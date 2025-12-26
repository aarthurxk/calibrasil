import { useEffect, useState, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, AlertCircle, Info, ShoppingBag, Package, Loader2 } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * PÁGINA PÚBLICA DE CONFIRMAÇÃO DE RECEBIMENTO
 * 
 * Rota: /confirmar-recebimento
 * 
 * Esta página é acessada via link do e-mail.
 * Ela chama a Edge Function via POST e exibe o resultado.
 * NUNCA fica em branco - sempre mostra um estado.
 */

type ConfirmStatus = "loading" | "confirmed" | "already" | "invalid" | "expired" | "error";

interface ApiResponse {
  status: ConfirmStatus;
  message_pt: string;
}

const ConfirmarRecebimento = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [status, setStatus] = useState<ConfirmStatus>("loading");
  const [message, setMessage] = useState("Confirmando recebimento...");
  const [hasAttempted, setHasAttempted] = useState(false);

  const rawOrderId = searchParams.get("orderId");
  const rawToken = searchParams.get("token");
  const orderId = rawOrderId ? decodeURIComponent(rawOrderId) : null;
  const token = rawToken ? decodeURIComponent(rawToken) : null;

  const confirmReceipt = useCallback(async () => {
    // Evitar chamadas duplicadas
    if (hasAttempted) return;
    setHasAttempted(true);

    // Validar parâmetros antes de chamar API
    if (!orderId || !token) {
      setStatus("invalid");
      setMessage("Link inválido. Parâmetros ausentes.");
      return;
    }

    try {
      console.log("[ConfirmarRecebimento] Calling edge function...");
      
      const { data, error } = await supabase.functions.invoke<ApiResponse>(
        "confirm-order-received",
        {
          body: { orderId, token },
        }
      );

      console.log("[ConfirmarRecebimento] Response:", { data, error });

      if (error) {
        console.error("[ConfirmarRecebimento] Error:", error);
        setStatus("error");
        setMessage("Erro ao confirmar recebimento. Tente novamente.");
        return;
      }

      if (data) {
        setStatus(data.status as ConfirmStatus);
        setMessage(data.message_pt);
      } else {
        setStatus("error");
        setMessage("Resposta inválida do servidor.");
      }
    } catch (err) {
      console.error("[ConfirmarRecebimento] Unexpected error:", err);
      setStatus("error");
      setMessage("Erro inesperado. Tente novamente mais tarde.");
    }
  }, [orderId, token, hasAttempted]);

  useEffect(() => {
    confirmReceipt();
  }, [confirmReceipt]);

  // Configuração visual por status
  const getContent = () => {
    switch (status) {
      case "loading":
        return {
          icon: <Loader2 className="h-16 w-16 text-primary animate-spin" />,
          title: "Confirmando recebimento...",
        };
      case "confirmed":
        return {
          icon: <CheckCircle2 className="h-16 w-16 text-green-500" />,
          title: "Recebimento confirmado!",
        };
      case "already":
        return {
          icon: <Info className="h-16 w-16 text-blue-500" />,
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
  const isLoading = status === "loading";

  return (
    <MainLayout>
      <div className="container py-12 animate-fade-in">
        <div className="max-w-lg mx-auto">
          <Card className="text-center">
            <CardContent className="pt-8 pb-8">
              {/* Ícone */}
              <div className="flex justify-center mb-6">
                {content.icon}
              </div>

              {/* Título */}
              <h1 className="text-2xl font-bold mb-3">{content.title}</h1>

              {/* Mensagem detalhada */}
              <p className="text-muted-foreground mb-8">{message}</p>

              {/* Botões de ação - só mostrar após loading */}
              {!isLoading && (
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button asChild variant="outline">
                    <Link to="/shop">
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Ir para a Loja
                    </Link>
                  </Button>

                  {user && (
                    <Button asChild>
                      <Link to="/orders">
                        <Package className="h-4 w-4 mr-2" />
                        Meus Pedidos
                      </Link>
                    </Button>
                  )}
                </div>
              )}

              {/* Suporte para erros */}
              {status === "error" && (
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

export default ConfirmarRecebimento;
