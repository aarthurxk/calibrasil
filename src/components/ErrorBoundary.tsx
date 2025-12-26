import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary Global
 * 
 * Captura erros de renderização em componentes filhos e exibe uma UI amigável
 * em vez de uma tela branca. Nunca deixa o usuário ver uma página em branco.
 * 
 * Uso:
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 */
class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Aqui você pode enviar o erro para um serviço de monitoramento
    // como Sentry, LogRocket, etc.
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      // Se um fallback customizado foi fornecido, usar ele
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI padrão de erro
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center">
            <CardContent className="pt-8 pb-8">
              {/* Ícone */}
              <div className="flex justify-center mb-6">
                <div className="rounded-full bg-destructive/10 p-4">
                  <AlertTriangle className="h-12 w-12 text-destructive" />
                </div>
              </div>
              
              {/* Título */}
              <h1 className="text-2xl font-bold mb-3">
                Ops! Algo deu errado
              </h1>
              
              {/* Mensagem */}
              <p className="text-muted-foreground mb-6">
                Ocorreu um erro inesperado. Nossa equipe foi notificada e estamos trabalhando para resolver.
              </p>

              {/* Botões */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button 
                  variant="outline" 
                  onClick={this.handleReload}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar Novamente
                </Button>
                
                <Button onClick={this.handleGoHome}>
                  <Home className="h-4 w-4 mr-2" />
                  Ir para Início
                </Button>
              </div>

              {/* Detalhes do erro (apenas em desenvolvimento) */}
              {import.meta.env.DEV && this.state.error && (
                <div className="mt-6 pt-6 border-t text-left">
                  <p className="text-sm font-semibold text-destructive mb-2">
                    Detalhes do erro (dev only):
                  </p>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </div>
              )}

              {/* Suporte */}
              <div className="mt-6 pt-6 border-t text-sm text-muted-foreground">
                <p>Precisa de ajuda?</p>
                <a 
                  href="mailto:oi@calibrasil.com" 
                  className="text-primary hover:underline"
                >
                  oi@calibrasil.com
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
