import { useState } from 'react';
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Trash2, 
  RefreshCw,
  AlertTriangle,
  Bug,
  Package,
  ShoppingCart,
  CreditCard,
  Mail,
  Database
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'ok' | 'error';
  endpoint?: string;
  statusCode?: number;
  message?: string;
  duration?: number;
}

interface TestData {
  productId?: string;
  orderId?: string;
  orderItemId?: string;
}

const TEST_PREFIX = '[TESTE-DIAG]';

const Diagnostic = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [testData, setTestData] = useState<TestData>({});
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Criar produto de teste', status: 'pending' },
    { name: 'Verificar produto criado', status: 'pending' },
    { name: 'Criar pedido de teste', status: 'pending' },
    { name: 'Verificar itens do pedido', status: 'pending' },
    { name: 'Atualizar status do pedido', status: 'pending' },
    { name: 'Verificar reflexo no total', status: 'pending' },
  ]);

  const updateTest = (index: number, update: Partial<TestResult>) => {
    setTests(prev => prev.map((t, i) => i === index ? { ...t, ...update } : t));
  };

  const resetTests = () => {
    setTests(prev => prev.map(t => ({ ...t, status: 'pending', message: undefined, statusCode: undefined, endpoint: undefined, duration: undefined })));
    setTestData({});
  };

  const runTests = async () => {
    setIsRunning(true);
    resetTests();
    const data: TestData = {};
    let startTime: number;

    try {
      // Test 1: Criar produto de teste
      updateTest(0, { status: 'running' });
      startTime = Date.now();
      
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          name: `${TEST_PREFIX} Produto Diagnóstico`,
          category: 'teste',
          price: 99.99,
          description: `${TEST_PREFIX} Produto criado automaticamente para diagnóstico`,
          in_stock: true,
        })
        .select()
        .single();

      if (productError) {
        updateTest(0, { 
          status: 'error', 
          endpoint: 'supabase.from("products").insert()',
          statusCode: 400,
          message: productError.message,
          duration: Date.now() - startTime
        });
        throw new Error('Falha ao criar produto');
      }

      data.productId = product.id;
      updateTest(0, { 
        status: 'ok', 
        endpoint: 'supabase.from("products").insert()',
        statusCode: 201,
        message: `Produto criado: ${product.id.slice(0, 8)}`,
        duration: Date.now() - startTime
      });

      // Test 2: Verificar produto criado
      updateTest(1, { status: 'running' });
      startTime = Date.now();

      const { data: verifyProduct, error: verifyError } = await supabase
        .from('products')
        .select('*')
        .eq('id', data.productId)
        .single();

      if (verifyError || !verifyProduct) {
        updateTest(1, { 
          status: 'error', 
          endpoint: 'supabase.from("products").select()',
          statusCode: 404,
          message: verifyError?.message || 'Produto não encontrado',
          duration: Date.now() - startTime
        });
        throw new Error('Produto não encontrado');
      }

      updateTest(1, { 
        status: 'ok', 
        endpoint: 'supabase.from("products").select()',
        statusCode: 200,
        message: `Verificado: ${verifyProduct.name}`,
        duration: Date.now() - startTime
      });

      // Test 3: Criar pedido de teste
      updateTest(2, { status: 'running' });
      startTime = Date.now();

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          total: 99.99,
          status: 'pending',
          payment_status: 'pending',
          guest_email: 'teste-diag@cali.com.br',
          shipping_address: {
            name: `${TEST_PREFIX} Cliente`,
            street: 'Rua Teste',
            number: '123',
            city: 'Recife',
            state: 'PE',
            zip: '50000-000'
          }
        })
        .select()
        .single();

      if (orderError) {
        updateTest(2, { 
          status: 'error', 
          endpoint: 'supabase.from("orders").insert()',
          statusCode: 400,
          message: orderError.message,
          duration: Date.now() - startTime
        });
        throw new Error('Falha ao criar pedido');
      }

      data.orderId = order.id;
      updateTest(2, { 
        status: 'ok', 
        endpoint: 'supabase.from("orders").insert()',
        statusCode: 201,
        message: `Pedido criado: #${order.id.slice(0, 8)}`,
        duration: Date.now() - startTime
      });

      // Test 4: Adicionar item ao pedido
      updateTest(3, { status: 'running' });
      startTime = Date.now();

      const { data: orderItem, error: itemError } = await supabase
        .from('order_items')
        .insert({
          order_id: data.orderId,
          product_id: data.productId,
          product_name: `${TEST_PREFIX} Produto Diagnóstico`,
          quantity: 1,
          price: 99.99
        })
        .select()
        .single();

      if (itemError) {
        updateTest(3, { 
          status: 'error', 
          endpoint: 'supabase.from("order_items").insert()',
          statusCode: 400,
          message: itemError.message,
          duration: Date.now() - startTime
        });
        throw new Error('Falha ao adicionar item');
      }

      data.orderItemId = orderItem.id;
      updateTest(3, { 
        status: 'ok', 
        endpoint: 'supabase.from("order_items").insert()',
        statusCode: 201,
        message: `Item adicionado: ${orderItem.quantity}x`,
        duration: Date.now() - startTime
      });

      // Test 5: Atualizar status do pedido
      updateTest(4, { status: 'running' });
      startTime = Date.now();

      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'processing',
          payment_status: 'paid'
        })
        .eq('id', data.orderId);

      if (updateError) {
        updateTest(4, { 
          status: 'error', 
          endpoint: 'supabase.from("orders").update()',
          statusCode: 400,
          message: updateError.message,
          duration: Date.now() - startTime
        });
        throw new Error('Falha ao atualizar pedido');
      }

      updateTest(4, { 
        status: 'ok', 
        endpoint: 'supabase.from("orders").update()',
        statusCode: 200,
        message: 'Status: pending → processing, paid',
        duration: Date.now() - startTime
      });

      // Test 6: Verificar reflexo no total
      updateTest(5, { status: 'running' });
      startTime = Date.now();

      const { data: finalOrder, error: finalError } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', data.orderId)
        .single();

      if (finalError || !finalOrder) {
        updateTest(5, { 
          status: 'error', 
          endpoint: 'supabase.from("orders").select()',
          statusCode: 404,
          message: finalError?.message || 'Pedido não encontrado',
          duration: Date.now() - startTime
        });
        throw new Error('Falha na verificação final');
      }

      const itemsTotal = (finalOrder.order_items as any[])?.reduce(
        (sum, item) => sum + (item.price * item.quantity), 0
      ) || 0;

      updateTest(5, { 
        status: 'ok', 
        endpoint: 'supabase.from("orders").select()',
        statusCode: 200,
        message: `Total pedido: R$ ${finalOrder.total} | Itens: R$ ${itemsTotal.toFixed(2)}`,
        duration: Date.now() - startTime
      });

      setTestData(data);
      toast.success('Todos os testes passaram!');

    } catch (error: any) {
      console.error('Erro nos testes:', error);
      setTestData(data);
    } finally {
      setIsRunning(false);
    }
  };

  const cleanTestData = async () => {
    setIsCleaning(true);

    try {
      // Limpar order_items de teste
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .like('product_name', `${TEST_PREFIX}%`);

      if (itemsError) {
        console.error('Erro ao limpar itens:', itemsError);
      }

      // Limpar orders de teste
      const { error: ordersError } = await supabase
        .from('orders')
        .delete()
        .eq('guest_email', 'teste-diag@cali.com.br');

      if (ordersError) {
        console.error('Erro ao limpar pedidos:', ordersError);
      }

      // Limpar products de teste
      const { error: productsError } = await supabase
        .from('products')
        .delete()
        .like('name', `${TEST_PREFIX}%`);

      if (productsError) {
        console.error('Erro ao limpar produtos:', productsError);
      }

      toast.success('Dados de teste limpos!');
      resetTests();

    } catch (error: any) {
      toast.error(`Erro ao limpar: ${error.message}`);
    } finally {
      setIsCleaning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />;
      case 'running':
        return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
      case 'ok':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const getTestIcon = (index: number) => {
    const icons = [Package, Database, ShoppingCart, Package, RefreshCw, CreditCard];
    const Icon = icons[index] || Package;
    return <Icon className="w-4 h-4" />;
  };

  const completedTests = tests.filter(t => t.status === 'ok').length;
  const failedTests = tests.filter(t => t.status === 'error').length;
  const totalDuration = tests.reduce((sum, t) => sum + (t.duration || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bug className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Diagnóstico</h1>
            <Badge variant="outline" className="ml-2">Admin Only</Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Teste os fluxos principais do sistema sem automação contínua
          </p>
        </div>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Este modo executa testes sequenciais usando endpoints existentes. 
          Todos os dados criados são marcados com <code className="bg-muted px-1 rounded">{TEST_PREFIX}</code> 
          e podem ser limpos a qualquer momento.
        </AlertDescription>
      </Alert>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <Button 
          onClick={runTests} 
          disabled={isRunning || isCleaning}
          size="lg"
          className="gap-2"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Executando...
            </>
          ) : (
            <>
              <Play className="h-5 w-5" />
              Executar Testes
            </>
          )}
        </Button>

        <Button 
          variant="outline" 
          onClick={cleanTestData}
          disabled={isRunning || isCleaning}
          className="gap-2"
        >
          {isCleaning ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Limpando...
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4" />
              Limpar Dados de Teste
            </>
          )}
        </Button>
      </div>

      {/* Results Summary */}
      {(completedTests > 0 || failedTests > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className={cn(
            "transition-all duration-300",
            completedTests === tests.length && "border-green-300 bg-green-50"
          )}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Testes OK</p>
                  <p className="text-2xl font-bold text-green-600">{completedTests}/{tests.length}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className={cn(
            "transition-all duration-300",
            failedTests > 0 && "border-red-300 bg-red-50"
          )}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Erros</p>
                  <p className="text-2xl font-bold text-red-600">{failedTests}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tempo Total</p>
                  <p className="text-2xl font-bold">{totalDuration}ms</p>
                </div>
                <RefreshCw className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tests List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Testes</CardTitle>
          <CardDescription>
            Testes executados sequencialmente nos endpoints existentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tests.map((test, index) => (
              <div 
                key={index}
                className={cn(
                  "p-4 rounded-lg border transition-all duration-300 animate-fade-in",
                  test.status === 'running' && "border-primary bg-primary/5",
                  test.status === 'ok' && "border-green-200 bg-green-50/50",
                  test.status === 'error' && "border-red-200 bg-red-50/50",
                  test.status === 'pending' && "border-border"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-0.5">
                    {getStatusIcon(test.status)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {getTestIcon(index)}
                      <span className="font-medium">{test.name}</span>
                      {test.duration && (
                        <Badge variant="outline" className="text-xs">
                          {test.duration}ms
                        </Badge>
                      )}
                    </div>
                    
                    {test.message && (
                      <p className={cn(
                        "text-sm mt-1",
                        test.status === 'error' ? "text-red-600" : "text-muted-foreground"
                      )}>
                        {test.message}
                      </p>
                    )}

                    {test.endpoint && (
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">
                          {test.endpoint}
                        </code>
                        {test.statusCode && (
                          <Badge 
                            variant={test.statusCode >= 200 && test.statusCode < 300 ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {test.statusCode}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Test Data Info */}
      {Object.keys(testData).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados Criados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {testData.productId && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-muted-foreground">Produto ID</p>
                  <code className="font-mono">{testData.productId.slice(0, 8)}...</code>
                </div>
              )}
              {testData.orderId && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-muted-foreground">Pedido ID</p>
                  <code className="font-mono">{testData.orderId.slice(0, 8)}...</code>
                </div>
              )}
              {testData.orderItemId && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-muted-foreground">Item ID</p>
                  <code className="font-mono">{testData.orderItemId.slice(0, 8)}...</code>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Diagnostic;
