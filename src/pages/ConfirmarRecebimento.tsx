import { useEffect, useState, useCallback } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { CheckCircle2, AlertCircle, Info, ShoppingBag, Loader2, Star } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

/**
 * PÁGINA PÚBLICA DE CONFIRMAÇÃO DE RECEBIMENTO
 * 
 * Rota: /confirmar-recebimento
 * 
 * Esta página é acessada via link do e-mail.
 * Ela chama a Edge Function via POST e exibe o resultado.
 * Após confirmação bem-sucedida, redireciona para a página de avaliação.
 */

type ConfirmStatus = "loading" | "confirmed" | "already" | "invalid" | "expired" | "error";

interface ApiResponse {
  status: ConfirmStatus;
  message_pt: string;
}

const ConfirmarRecebimento = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<ConfirmStatus>("loading");
  const [message, setMessage] = useState("Confirmando recebimento...");
  const [hasAttempted, setHasAttempted] = useState(false);
  const [countdown, setCountdown] = useState(3);

  const rawOrderId = searchParams.get("orderId");
  const rawToken = searchParams.get("token");
  const orderId = rawOrderId ? decodeURIComponent(rawOrderId) : null;
  const token = rawToken ? decodeURIComponent(rawToken) : null;

  // Auto-redirect countdown for successful confirmations
  useEffect(() => {
    if ((status === "confirmed" || status === "already") && orderId && token) {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate(`/avaliar?orderId=${encodeURIComponent(orderId)}&token=${encodeURIComponent(token)}`);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [status, orderId, token, navigate]);

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
          subtitle: "Aguarde um momento",
        };
      case "confirmed":
        return {
          icon: <CheckCircle2 className="h-16 w-16 text-green-500" />,
          title: "Recebimento confirmado!",
          subtitle: "Obrigado por confiar na Calibrasil 💛",
        };
      case "already":
        return {
          icon: <Info className="h-16 w-16 text-blue-500" />,
          title: "Pedido já confirmado",
          subtitle: "Você já confirmou este pedido anteriormente.",
        };
      case "expired":
        return {
          icon: <AlertCircle className="h-16 w-16 text-amber-500" />,
          title: "Link expirado",
          subtitle: "Este link não é mais válido. Solicite um novo.",
        };
      case "invalid":
      case "error":
      default:
        return {
          icon: <AlertCircle className="h-16 w-16 text-destructive" />,
          title: "Erro na confirmação",
          subtitle: "Não foi possível processar sua solicitação.",
        };
    }
  };

  const content = getContent();
  const isLoading = status === "loading";
  const isSuccess = status === "confirmed" || status === "already";

  return (
    <MainLayout>
      <div className="container py-12 animate-fade-in">
        <div className="max-w-lg mx-auto">
          <Card className="text-center overflow-hidden">
            {/* Success gradient header */}
            {isSuccess && (
              <div className="h-2 bg-gradient-to-r from-green-400 via-primary to-accent" />
            )}
            
            <CardContent className="pt-8 pb-8">
              {/* Ícone com animação */}
              <div className="flex justify-center mb-6 transition-all duration-500 ease-out">
                {content.icon}
              </div>

              {/* Título */}
              <h1 className="text-2xl font-bold mb-2 transition-all duration-300">
                {content.title}
              </h1>

              {/* Subtítulo */}
              <p className="text-muted-foreground mb-2">{content.subtitle}</p>

              {/* Mensagem detalhada */}
              <p className="text-sm text-muted-foreground/80 mb-6">{message}</p>

              {/* Countdown para redirecionamento */}
              {isSuccess && orderId && token && (
                <div className="bg-muted/50 rounded-lg p-4 mb-6 transition-all duration-300">
                  <p className="text-sm text-muted-foreground">
                    Redirecionando para avaliação em{" "}
                    <span className="font-bold text-primary">{countdown}s</span>
                  </p>
                </div>
              )}

              {/* Botões de ação */}
              {!isLoading && (
                <div className="flex flex-col sm:flex-row gap-3 justify-center transition-all duration-300">
                  {/* Botão de avaliação - aparecer após confirmação bem-sucedida */}
                  {isSuccess && orderId && token && (
                    <Button asChild size="lg">
                      <Link to={`/avaliar?orderId=${encodeURIComponent(orderId)}&token=${encodeURIComponent(token)}`}>
                        <Star className="h-4 w-4 mr-2" />
                        Avaliar Produtos Agora
                      </Link>
                    </Button>
                  )}

                  <Button asChild variant={isSuccess ? "outline" : "default"} size="lg">
                    <Link to="/shop">
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Continuar Comprando
                    </Link>
                  </Button>
                </div>
              )}

              {/* Suporte para erros */}
              {(status === "error" || status === "invalid" || status === "expired") && (
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
