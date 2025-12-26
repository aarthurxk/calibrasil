import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShoppingCart, Star, CheckCircle2, XCircle, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  success: boolean;
  statusCode: number;
  message: string;
  details?: any;
}

const EmailTests = () => {
  const [isRunningAbandonedCart, setIsRunningAbandonedCart] = useState(false);
  const [isRunningReviewRequest, setIsRunningReviewRequest] = useState(false);
  const [abandonedCartResult, setAbandonedCartResult] = useState<TestResult | null>(null);
  const [reviewRequestResult, setReviewRequestResult] = useState<TestResult | null>(null);

  const runAbandonedCartTest = async () => {
    setIsRunningAbandonedCart(true);
    setAbandonedCartResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setAbandonedCartResult({
          success: false,
          statusCode: 401,
          message: 'Você precisa estar logado como admin'
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('admin-trigger-emails', {
        body: { action: 'abandoned-cart' }
      });

      if (error) {
        setAbandonedCartResult({
          success: false,
          statusCode: 500,
          message: error.message,
          details: error
        });
        return;
      }

      if (data?.success) {
        const result = data.result;
        setAbandonedCartResult({
          success: true,
          statusCode: 200,
          message: result?.processed !== undefined 
            ? `Carrinhos processados: ${result.processed}` 
            : result?.message || 'Endpoint executado com sucesso',
          details: result
        });
      } else {
        setAbandonedCartResult({
          success: false,
          statusCode: data?.result?.status || 400,
          message: data?.result?.message || data?.result?.error || 'Erro desconhecido',
          details: data?.result
        });
      }
    } catch (err: any) {
      setAbandonedCartResult({
        success: false,
        statusCode: 500,
        message: err.message || 'Erro de conexão',
        details: err
      });
    } finally {
      setIsRunningAbandonedCart(false);
    }
  };

  const runReviewRequestTest = async () => {
    setIsRunningReviewRequest(true);
    setReviewRequestResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setReviewRequestResult({
          success: false,
          statusCode: 401,
          message: 'Você precisa estar logado como admin'
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('admin-trigger-emails', {
        body: { action: 'review-request' }
      });

      if (error) {
        setReviewRequestResult({
          success: false,
          statusCode: 500,
          message: error.message,
          details: error
        });
        return;
      }

      if (data?.success) {
        const result = data.result;
        setReviewRequestResult({
          success: true,
          statusCode: 200,
          message: result?.processed !== undefined 
            ? `Pedidos processados: ${result.processed}` 
            : result?.message || 'Endpoint executado com sucesso',
          details: result
        });
      } else {
        setReviewRequestResult({
          success: false,
          statusCode: data?.result?.status || 400,
          message: data?.result?.message || data?.result?.error || 'Erro desconhecido',
          details: data?.result
        });
      }
    } catch (err: any) {
      setReviewRequestResult({
        success: false,
        statusCode: 500,
        message: err.message || 'Erro de conexão',
        details: err
      });
    } finally {
      setIsRunningReviewRequest(false);
    }
  };

  const ResultDisplay = ({ result, title }: { result: TestResult | null; title: string }) => {
    if (!result) return null;

    return (
      <Alert className={result.success ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}>
        <div className="flex items-start gap-3">
          {result.success ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">{title}</span>
              <Badge variant={result.success ? 'default' : 'destructive'} className="text-xs">
                {result.statusCode}
              </Badge>
            </div>
            <AlertDescription className={result.success ? 'text-green-800' : 'text-red-800'}>
              {result.message}
            </AlertDescription>
            {result.details && !result.success && (
              <pre className="mt-2 text-xs bg-background/50 p-2 rounded overflow-auto max-h-32">
                {JSON.stringify(result.details, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </Alert>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Testes de Email</h1>
        <p className="text-muted-foreground">
          Execute os endpoints de email com autorização interna
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Abandoned Cart Test */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <ShoppingCart className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Carrinho Abandonado</CardTitle>
                <CardDescription>
                  Envia emails para carrinhos abandonados há mais de 2 horas
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <p><strong>Endpoint:</strong> send-abandoned-cart-email</p>
              <p><strong>Header:</strong> x-internal-secret</p>
              <p><strong>ENV:</strong> INTERNAL_API_SECRET</p>
            </div>
            
            <Button 
              onClick={runAbandonedCartTest}
              disabled={isRunningAbandonedCart}
              className="w-full gap-2"
            >
              {isRunningAbandonedCart ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Executando...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Testar Carrinho Abandonado
                </>
              )}
            </Button>

            <ResultDisplay result={abandonedCartResult} title="Resultado" />
          </CardContent>
        </Card>

        {/* Review Request Test */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Solicitação de Avaliação</CardTitle>
                <CardDescription>
                  Envia emails solicitando avaliação para pedidos entregues há 1+ dia
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <p><strong>Endpoint:</strong> send-review-request-email</p>
              <p><strong>Header:</strong> x-internal-secret</p>
              <p><strong>ENV:</strong> INTERNAL_API_SECRET</p>
            </div>
            
            <Button 
              onClick={runReviewRequestTest}
              disabled={isRunningReviewRequest}
              className="w-full gap-2"
            >
              {isRunningReviewRequest ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Executando...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Testar Solicitação de Avaliação
                </>
              )}
            </Button>

            <ResultDisplay result={reviewRequestResult} title="Resultado" />
          </CardContent>
        </Card>
      </div>

      <Alert>
        <Mail className="h-4 w-4" />
        <AlertDescription>
          Estes testes executam os endpoints reais com autorização interna. 
          Emails serão enviados para os clientes elegíveis encontrados no banco de dados.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default EmailTests;
