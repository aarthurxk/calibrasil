import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Loader2, ShoppingCart, Star, CheckCircle2, XCircle, Mail, Send, TestTube } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  success: boolean;
  statusCode: number;
  message: string;
  details?: any;
}

const EmailTests = () => {
  const [testEmail, setTestEmail] = useState('');
  const [isRunningAbandonedCart, setIsRunningAbandonedCart] = useState(false);
  const [isRunningReviewRequest, setIsRunningReviewRequest] = useState(false);
  const [isRunningAbandonedCartTest, setIsRunningAbandonedCartTest] = useState(false);
  const [isRunningReviewRequestTest, setIsRunningReviewRequestTest] = useState(false);
  const [abandonedCartResult, setAbandonedCartResult] = useState<TestResult | null>(null);
  const [reviewRequestResult, setReviewRequestResult] = useState<TestResult | null>(null);

  const runEmailAction = async (
    action: 'abandoned-cart' | 'review-request',
    testMode: boolean,
    setLoading: (v: boolean) => void,
    setResult: (r: TestResult | null) => void
  ) => {
    setLoading(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setResult({
          success: false,
          statusCode: 401,
          message: 'Você precisa estar logado como admin'
        });
        return;
      }

      if (testMode && !testEmail) {
        setResult({
          success: false,
          statusCode: 400,
          message: 'Preencha o email de teste'
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('admin-trigger-emails', {
        body: { 
          action,
          testMode,
          testEmail: testMode ? testEmail : null
        }
      });

      if (error) {
        setResult({
          success: false,
          statusCode: 500,
          message: error.message,
          details: error
        });
        return;
      }

      if (data?.success) {
        const result = data.result;
        setResult({
          success: true,
          statusCode: 200,
          message: result?.message || (result?.processed !== undefined 
            ? `Processados: ${result.processed}` 
            : 'Endpoint executado com sucesso'),
          details: result
        });
      } else {
        setResult({
          success: false,
          statusCode: data?.result?.status || 400,
          message: data?.result?.message || data?.result?.error || 'Erro desconhecido',
          details: data?.result
        });
      }
    } catch (err: any) {
      setResult({
        success: false,
        statusCode: 500,
        message: err.message || 'Erro de conexão',
        details: err
      });
    } finally {
      setLoading(false);
    }
  };

  const ResultDisplay = ({ result, title }: { result: TestResult | null; title: string }) => {
    if (!result) return null;

    return (
      <Alert className={result.success ? 'border-green-500/50 bg-green-500/10' : 'border-destructive/50 bg-destructive/10'}>
        <div className="flex items-start gap-3">
          {result.success ? (
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
          ) : (
            <XCircle className="h-5 w-5 text-destructive mt-0.5" />
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">{title}</span>
              <Badge variant={result.success ? 'default' : 'destructive'} className="text-xs">
                {result.statusCode}
              </Badge>
            </div>
            <AlertDescription className={result.success ? 'text-green-700' : 'text-destructive'}>
              {result.message}
            </AlertDescription>
            {result.details && (
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

      {/* Test Email Configuration */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <TestTube className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Modo de Teste</CardTitle>
              <CardDescription>
                Envia email com dados mockados para testar se o Resend está funcionando
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="testEmail">Email de teste</Label>
            <Input
              id="testEmail"
              type="email"
              placeholder="seu-email@exemplo.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              O email de teste será enviado para este endereço com dados fictícios
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Button 
              onClick={() => runEmailAction('abandoned-cart', true, setIsRunningAbandonedCartTest, setAbandonedCartResult)}
              disabled={isRunningAbandonedCartTest || !testEmail}
              variant="outline"
              className="gap-2"
            >
              {isRunningAbandonedCartTest ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar Teste: Carrinho Abandonado
            </Button>

            <Button 
              onClick={() => runEmailAction('review-request', true, setIsRunningReviewRequestTest, setReviewRequestResult)}
              disabled={isRunningReviewRequestTest || !testEmail}
              variant="outline"
              className="gap-2"
            >
              {isRunningReviewRequestTest ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar Teste: Avaliação
            </Button>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Abandoned Cart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
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
              onClick={() => runEmailAction('abandoned-cart', false, setIsRunningAbandonedCart, setAbandonedCartResult)}
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
                  Executar Produção
                </>
              )}
            </Button>

            <ResultDisplay result={abandonedCartResult} title="Resultado" />
          </CardContent>
        </Card>

        {/* Review Request */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
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
              onClick={() => runEmailAction('review-request', false, setIsRunningReviewRequest, setReviewRequestResult)}
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
                  Executar Produção
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
          <strong>Modo Teste:</strong> Envia email com dados fictícios para confirmar que o Resend funciona.<br/>
          <strong>Modo Produção:</strong> Processa dados reais do banco (respeitando regras de tempo).
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default EmailTests;
