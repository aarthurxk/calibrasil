import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, AlertCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import MainLayout from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";

type ConfirmStatus = "loading" | "confirmed" | "already" | "invalid" | "expired" | "error" | "missing_params";

interface ApiResponse {
  status: string;
  message_pt: string;
}

const ConfirmarRecebimento = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<ConfirmStatus>("loading");
  const [message, setMessage] = useState<string>("");
  const [orderId, setOrderId] = useState<string>("");

  useEffect(() => {
    const orderIdParam = searchParams.get("orderId");
    const tokenParam = searchParams.get("token");

    console.log("[CONFIRM-PAGE] URL params:", { orderIdParam, tokenParam });

    // Validar parâmetros da URL
    if (!orderIdParam || !tokenParam) {
      console.error("[CONFIRM-PAGE] Missing required parameters");
      setStatus("missing_params");
      setMessage("Link de confirmação incompleto. Verifique o link enviado por e-mail.");
      return;
    }

    setOrderId(orderIdParam);
    confirmarRecebimento(orderIdParam, tokenParam);
  }, [searchParams]);

  const confirmarRecebimento = async (orderId: string, token: string) => {
    console.log("[CONFIRM-PAGE] Starting confirmation process...");

    try {
      setStatus("loading");

      // Chamar a Edge Function via supabase.functions.invoke
      const { data, error } = await supabase.functions.invoke("confirm-order-received-v2", {
        body: { orderId, token },
      });

      console.log("[CONFIRM-PAGE] Response:", { data, error });

      if (error) {
        console.error("[CONFIRM-PAGE] Function invocation error:", error);
        setStatus("error");
        setMessage("Erro ao processar sua solicitação. Tente novamente mais tarde.");
        return;
      }

      // Processar resposta da API
      const response = data as ApiResponse;

      if (response.status === "confirmed") {
        setStatus("confirmed");
        setMessage(response.message_pt || "Recebimento confirmado com sucesso!");

        // Redirecionar para avaliação após 3 segundos
        setTimeout(() => {
          navigate(`/avaliar?orderId=${orderId}`);
        }, 3000);
      } else if (response.status === "already") {
        setStatus("already");
        setMessage(response.message_pt || "Este pedido já foi confirmado anteriormente.");
      } else if (response.status === "invalid") {
        setStatus("invalid");
        setMessage(response.message_pt || "Link inválido. O token não corresponde ao pedido.");
      } else if (response.status === "expired") {
        setStatus("expired");
        setMessage(response.message_pt || "Este link expirou. Solicite um novo link.");
      } else {
        setStatus("error");
        setMessage(response.message_pt || "Erro ao processar sua solicitação.");
      }
    } catch (err) {
      console.error("[CONFIRM-PAGE] Unexpected error:", err);
      setStatus("error");
      setMessage("Erro inesperado ao confirmar recebimento. Tente novamente.");
    }
  };

  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto mb-4" />
              <CardTitle className="text-xl mb-2">Confirmando recebimento...</CardTitle>
              <CardDescription>Por favor, aguarde um momento.</CardDescription>
            </CardContent>
          </Card>
        );

      case "confirmed":
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <CardTitle className="text-2xl">Recebimento Confirmado! ✅</CardTitle>
              <CardDescription className="text-base mt-2">{message}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                Você será redirecionado para avaliar o produto em alguns segundos...
              </p>
              <Button onClick={() => navigate(`/avaliar?orderId=${orderId}`)} className="w-full">
                Avaliar produto agora
              </Button>
              <Button onClick={() => navigate("/")} variant="outline" className="w-full">
                Voltar para a loja
              </Button>
            </CardContent>
          </Card>
        );

      case "already":
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <AlertCircle className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <CardTitle className="text-2xl">Já Confirmado</CardTitle>
              <CardDescription className="text-base mt-2">{message}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => navigate(`/avaliar?orderId=${orderId}`)} className="w-full">
                Avaliar produto
              </Button>
              <Button onClick={() => navigate("/orders")} variant="outline" className="w-full">
                Ver meus pedidos
              </Button>
            </CardContent>
          </Card>
        );

      case "invalid":
      case "expired":
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-2xl">{status === "invalid" ? "Link Inválido" : "Link Expirado"}</CardTitle>
              <CardDescription className="text-base mt-2">{message}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                Entre em contato conosco para obter um novo link de confirmação.
              </p>
              <Button onClick={() => navigate("/contact")} className="w-full">
                Falar com o suporte
              </Button>
              <Button onClick={() => navigate("/")} variant="outline" className="w-full">
                Voltar para a loja
              </Button>
            </CardContent>
          </Card>
        );

      case "missing_params":
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <Package className="h-16 w-16 text-orange-500 mx-auto mb-4" />
              <CardTitle className="text-2xl">Link Incompleto</CardTitle>
              <CardDescription className="text-base mt-2">{message}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                Certifique-se de usar o link completo enviado no e-mail.
              </p>
              <Button onClick={() => navigate("/orders")} className="w-full">
                Ver meus pedidos
              </Button>
              <Button onClick={() => navigate("/")} variant="outline" className="w-full">
                Voltar para a loja
              </Button>
            </CardContent>
          </Card>
        );

      case "error":
      default:
        return (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-2xl">Erro na Confirmação</CardTitle>
              <CardDescription className="text-base mt-2">{message}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => window.location.reload()} className="w-full">
                Tentar novamente
              </Button>
              <Button onClick={() => navigate("/contact")} variant="outline" className="w-full">
                Falar com o suporte
              </Button>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <MainLayout>
      <div className="container py-12 min-h-[60vh] flex items-center justify-center px-4">{renderContent()}</div>
    </MainLayout>
  );
};

export default ConfirmarRecebimento;
