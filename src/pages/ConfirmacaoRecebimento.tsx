import { useSearchParams, Link } from "react-router-dom";
import { CheckCircle2, AlertCircle, Info, ShoppingBag, LogIn, Package } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

const ConfirmacaoRecebimento = () => {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  const status = searchParams.get('status') || 'error';
  const reason = searchParams.get('reason');

  const getContent = () => {
    switch (status) {
      case 'ok':
        return {
          icon: <CheckCircle2 className="h-16 w-16 text-green-500" />,
          title: "Recebimento confirmado com sucesso!",
          description: "Obrigado por confirmar que recebeu seu pedido. Esperamos que aproveite seus produtos!",
          variant: "success" as const
        };
      case 'already':
        return {
          icon: <Info className="h-16 w-16 text-blue-500" />,
          title: "Este pedido já foi confirmado",
          description: "O recebimento deste pedido já havia sido confirmado anteriormente.",
          variant: "info" as const
        };
      case 'error':
      default:
        let errorMessage = "Ocorreu um erro ao processar sua solicitação.";
        if (reason === 'token') {
          errorMessage = "O link de confirmação é inválido ou expirou. Por favor, solicite um novo link.";
        } else if (reason === 'order') {
          errorMessage = "Pedido não encontrado. Verifique se o link está correto.";
        }
        return {
          icon: <AlertCircle className="h-16 w-16 text-destructive" />,
          title: "Link inválido ou expirado",
          description: errorMessage,
          variant: "error" as const
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
              <div className="flex justify-center mb-6 animate-float">
                {content.icon}
              </div>
              
              <h1 className="text-2xl font-bold mb-3">
                {content.title}
              </h1>
              
              <p className="text-muted-foreground mb-8">
                {content.description}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild variant="outline">
                  <Link to="/shop">
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    Ir para a Loja
                  </Link>
                </Button>
                
                {user ? (
                  <Button asChild>
                    <Link to="/orders">
                      <Package className="h-4 w-4 mr-2" />
                      Ver Meus Pedidos
                    </Link>
                  </Button>
                ) : (
                  <Button asChild>
                    <Link to="/auth">
                      <LogIn className="h-4 w-4 mr-2" />
                      Fazer Login
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default ConfirmacaoRecebimento;
