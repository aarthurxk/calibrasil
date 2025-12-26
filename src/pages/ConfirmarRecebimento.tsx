import { useEffect, useState, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, AlertCircle, Info, ShoppingBag, LogIn, Package, Loader2, RefreshCw } from "lucide-react";
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
 * Ela chama a Edge Function via fetch e exibe o resultado.
 * 
 * Estados possíveis:
 * - loading: Chamando a API
 * - confirmed: Recebimento confirmado com sucesso
 * - already_confirmed: Já estava confirmado
 * - used: Token já foi usado (mas pedido confirmado)
 * - invalid_token: Token inválido
 * - expired: Token expirado
 * - not_found: Pedido não encontrado
 * - error: Erro inesperado
 */

type ConfirmationStatus = 
  | "loading"
  | "confirmed"
  | "already_confirmed"
  | "invalid_token"
  | "expired"
  | "used"
  | "not_found"
  | "error";

interface ApiResponse {
  ok: boolean;
  status: ConfirmationStatus;
  message_pt: string;
}

const ConfirmarRecebimento = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [status, setStatus] = useState<ConfirmationStatus>("loading");
  const [message, setMessage] = useState<string>("Confirmando recebimento...");
  const [hasAttempted, setHasAttempted] = useState(false);

  const orderId = searchParams.get('orderId');
  const token = searchParams.get('token');

  const confirmReceipt = useCallback(async () => {
    if (!orderId || !token) {
      setStatus("invalid_token");
      setMessage("Link de confirmação incompleto. Verifique se copiou o link corretamente do e-mail.");
      return;
    }

    setStatus("loading");
    setMessage("Confirmando recebimento...");

    try {
      // Chamar a Edge Function via POST
      const { data, error } = await supabase.functions.invoke('confirm-order-received-v2', {
        body: { orderId, token }
      });

      if (error) {
        console.error('[CONFIRMAR] Edge function error:', error);
        setStatus("error");
        setMessage("Erro ao conectar com o servidor. Por favor, tente novamente.");
        return;
      }

      const response = data as ApiResponse;
      console.log('[CONFIRMAR] Response:', response);

      // Mapear status da API para status local
      // "used" é tratado como sucesso pois significa que o pedido foi confirmado
      if (response.status === "used") {
        setStatus("already_confirmed");
      } else {
        setStatus(response.status as ConfirmationStatus);
      }
      setMessage(response.message_pt || getDefaultMessage(response.status));

    } catch (error: any) {
      console.error('[CONFIRMAR] Unexpected error:', error);
      setStatus("error");
      setMessage("Ocorreu um erro inesperado. Por favor, tente novamente.");
    }
  }, [orderId, token]);

  useEffect(() => {
    if (!hasAttempted) {
      setHasAttempted(true);
      confirmReceipt();
    }
  }, [hasAttempted, confirmReceipt]);

  const getDefaultMessage = (status: string): string => {
    const messages: Record<string, string> = {
      confirmed: "Recebimento confirmado com sucesso! Obrigado por comprar conosco.",
      already_confirmed: "Este pedido já foi confirmado anteriormente.",
      invalid_token: "O link de confirmação é inválido.",
      expired: "O link de confirmação expirou.",
      used: "Este pedido já foi confirmado.",
      not_found: "Pedido não encontrado.",
      error: "Ocorreu um erro. Por favor, tente novamente."
    };
    return messages[status] || messages.error;
  };

  const getContent = () => {
    switch (status) {
      case "loading":
        return {
          icon: <Loader2 className="h-16 w-16 text-primary animate-spin" />,
          title: "Confirmando...",
          variant: "loading" as const,
          showRetry: false
        };
      case "confirmed":
        return {
          icon: <CheckCircle2 className="h-16 w-16 text-green-500" />,
          title: "Recebimento Confirmado!",
          variant: "success" as const,
          showRetry: false
        };
      case "already_confirmed":
        return {
          icon: <Info className="h-16 w-16 text-blue-500" />,
          title: "Pedido Já Confirmado",
          variant: "info" as const,
          showRetry: false
        };
      case "invalid_token":
      case "expired":
      case "used":
        return {
          icon: <AlertCircle className="h-16 w-16 text-amber-500" />,
          title: status === "expired" ? "Link Expirado" : "Link Inválido",
          variant: "warning" as const,
          showRetry: true
        };
      case "not_found":
        return {
          icon: <AlertCircle className="h-16 w-16 text-destructive" />,
          title: "Pedido Não Encontrado",
          variant: "error" as const,
          showRetry: false
        };
      case "error":
      default:
        return {
          icon: <AlertCircle className="h-16 w-16 text-destructive" />,
          title: "Erro",
          variant: "error" as const,
          showRetry: true
        };
    }
  };

  const content = getContent();

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
              <h1 className="text-2xl font-bold mb-3">
                {content.title}
              </h1>
              
              {/* Mensagem */}
              <p className="text-muted-foreground mb-8">
                {message}
              </p>

              {/* Botões de ação */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {/* Botão de retry para erros recuperáveis */}
                {content.showRetry && content.variant !== "loading" && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setHasAttempted(false);
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Tentar Novamente
                  </Button>
                )}

                {/* Botão para loja - sempre visível após loading */}
                {content.variant !== "loading" && (
                  <Button asChild variant="outline">
                    <Link to="/shop">
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Ir para a Loja
                    </Link>
                  </Button>
                )}
                
                {/* Botão para pedidos - apenas se logado e após loading */}
                {content.variant !== "loading" && user && (
                  <Button asChild>
                    <Link to="/orders">
                      <Package className="h-4 w-4 mr-2" />
                      Ver Meus Pedidos
                    </Link>
                  </Button>
                )}

                {/* Botão de login - apenas se não logado e após loading */}
                {content.variant !== "loading" && !user && (
                  <Button asChild>
                    <Link to="/auth">
                      <LogIn className="h-4 w-4 mr-2" />
                      Fazer Login
                    </Link>
                  </Button>
                )}
              </div>

              {/* Informação de suporte para erros */}
              {(status === "error" || status === "not_found") && (
                <div className="mt-6 pt-6 border-t text-sm text-muted-foreground">
                  <p>Precisa de ajuda?</p>
                  <a 
                    href="mailto:oi@calibrasil.com" 
                    className="text-primary hover:underline"
                  >
                    oi@calibrasil.com
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Debug info em desenvolvimento */}
          {import.meta.env.DEV && (
            <div className="mt-4 p-4 bg-muted rounded-lg text-xs font-mono">
              <p><strong>Debug:</strong></p>
              <p>orderId: {orderId || 'null'}</p>
              <p>token: {token ? `${token.substring(0, 10)}...` : 'null'}</p>
              <p>status: {status}</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};

export default ConfirmarRecebimento;
