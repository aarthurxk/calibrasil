import { useState } from 'react';
import { 
  AlertTriangle, 
  Copy, 
  CheckCircle2, 
  RefreshCw, 
  Mail, 
  CreditCard,
  Truck,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { OrderFlowTimeline } from './OrderFlowTimeline';
import { OrderFlowResult } from '@/hooks/useOrderFlowChecker';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface OrderDiagnosticPanelProps {
  order: any;
  flowResult: OrderFlowResult;
}

export const OrderDiagnosticPanel = ({ order, flowResult }: OrderDiagnosticPanelProps) => {
  const [logsOpen, setLogsOpen] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isRechecking, setIsRechecking] = useState(false);

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  // Get customer info
  const shippingAddress = order.shipping_address as any;
  const customerName = shippingAddress?.name || 
    `${shippingAddress?.firstName || ''} ${shippingAddress?.lastName || ''}`.trim() || 
    'Cliente';
  const customerEmail = order.guest_email || 'Não disponível';

  // Build logs from order data
  const buildLogs = () => {
    const logs = [
      {
        timestamp: order.created_at,
        event: 'PEDIDO_CRIADO',
        result: 'success',
        details: `Total: ${formatPrice(order.total)}`,
      },
    ];

    if (order.payment_gateway) {
      logs.push({
        timestamp: order.created_at,
        event: 'GATEWAY_SELECIONADO',
        result: 'info',
        details: order.payment_gateway,
      });
    }

    if (order.mercadopago_payment_id) {
      logs.push({
        timestamp: order.updated_at,
        event: 'MERCADOPAGO_PAYMENT',
        result: order.payment_status === 'paid' ? 'success' : 'pending',
        details: `ID: ${order.mercadopago_payment_id}`,
      });
    }

    if (order.payment_status === 'paid') {
      logs.push({
        timestamp: order.updated_at,
        event: 'PAGAMENTO_CONFIRMADO',
        result: 'success',
        details: order.payment_method || 'N/A',
      });
    }

    if (order.tracking_code) {
      logs.push({
        timestamp: order.updated_at,
        event: 'RASTREIO_GERADO',
        result: 'success',
        details: order.tracking_code,
      });
    }

    if (order.received_at) {
      logs.push({
        timestamp: order.received_at,
        event: 'ENTREGA_CONFIRMADA',
        result: 'success',
        details: 'Cliente confirmou recebimento',
      });
    }

    return logs;
  };

  const handleResendEmail = async () => {
    setIsResending(true);
    try {
      const response = await supabase.functions.invoke('test-order-email', {
        body: { orderId: order.id },
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      toast.success('Email reenviado com sucesso!');
    } catch (error: any) {
      toast.error(`Erro ao reenviar email: ${error.message}`);
    } finally {
      setIsResending(false);
    }
  };

  const handleRecheckPayment = async () => {
    setIsRechecking(true);
    try {
      // This would call an edge function to recheck payment status
      toast.info('Funcionalidade de reconsulta ainda não implementada');
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsRechecking(false);
    }
  };

  const handleCopyDiagnostic = () => {
    const diagnostic = {
      orderId: order.id,
      customer: customerName,
      email: customerEmail,
      total: formatPrice(order.total),
      status: order.status,
      paymentStatus: order.payment_status,
      flowResult: {
        overallStatus: flowResult.overallStatus,
        completedSteps: flowResult.completedSteps,
        totalSteps: flowResult.totalSteps,
        stoppedAt: flowResult.stoppedAt,
        stoppedReason: flowResult.stoppedReason,
      },
      steps: flowResult.steps.map(s => ({
        name: s.name,
        status: s.status,
        reason: s.reason,
        evidence: s.evidence,
      })),
      logs: buildLogs(),
    };

    navigator.clipboard.writeText(JSON.stringify(diagnostic, null, 2));
    toast.success('Diagnóstico copiado para área de transferência');
  };

  const logs = buildLogs();

  return (
    <div className="space-y-4">
      {/* Order Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">
                Pedido #{order.id.slice(0, 8)}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {customerName} • {customerEmail}
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">{formatPrice(order.total)}</p>
              <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Error Alert */}
      {flowResult.overallStatus !== 'ok' && flowResult.stoppedAt && (
        <Card className={cn(
          "border-2",
          flowResult.overallStatus === 'error' ? 'border-red-300 bg-red-50' : 'border-yellow-300 bg-yellow-50'
        )}>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className={cn(
                "h-5 w-5 mt-0.5 flex-shrink-0",
                flowResult.overallStatus === 'error' ? 'text-red-600' : 'text-yellow-600'
              )} />
              <div className="flex-1">
                <h4 className={cn(
                  "font-medium",
                  flowResult.overallStatus === 'error' ? 'text-red-800' : 'text-yellow-800'
                )}>
                  Fluxo {flowResult.overallStatus === 'error' ? 'interrompido' : 'incompleto'} em: {flowResult.stoppedAt}
                </h4>
                {flowResult.stoppedReason && (
                  <p className="text-sm mt-1 opacity-90">{flowResult.stoppedReason}</p>
                )}
                {flowResult.impact && (
                  <p className="text-sm mt-2">
                    <strong>Impacto:</strong> {flowResult.impact}
                  </p>
                )}
                {flowResult.suggestion && (
                  <p className="text-sm mt-1">
                    <strong>Sugestão:</strong> {flowResult.suggestion}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Alert */}
      {flowResult.overallStatus === 'ok' && (
        <Card className="border-2 border-green-300 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <h4 className="font-medium text-green-800">Fluxo completo</h4>
                <p className="text-sm text-green-700">
                  Todas as etapas do pedido foram concluídas com sucesso.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Timeline do Fluxo</CardTitle>
            <Badge variant="outline">
              {flowResult.completedSteps}/{flowResult.totalSteps} etapas
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <OrderFlowTimeline steps={flowResult.steps} />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleResendEmail}
              disabled={isResending || !order.guest_email}
            >
              {isResending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Reenviar Email
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRecheckPayment}
              disabled={isRechecking || order.payment_status === 'paid'}
            >
              {isRechecking ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CreditCard className="h-4 w-4 mr-2" />
              )}
              Reconsultar Pagamento
            </Button>

            <Button 
              variant="outline" 
              size="sm"
              asChild
            >
              <a href={`/admin/orders?search=${order.id}`} target="_blank">
                <ExternalLink className="h-4 w-4 mr-2" />
                Ver em Pedidos
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs & Evidence */}
      <Card>
        <Collapsible open={logsOpen} onOpenChange={setLogsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Logs & Evidências</CardTitle>
                {logsOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {logs.map((log, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 text-sm py-2 border-b border-border last:border-0"
                  >
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs font-mono",
                        log.result === 'success' && 'border-green-300 text-green-700',
                        log.result === 'pending' && 'border-yellow-300 text-yellow-700',
                        log.result === 'error' && 'border-red-300 text-red-700'
                      )}
                    >
                      {log.event}
                    </Badge>
                    <span className="text-muted-foreground">{log.details}</span>
                  </div>
                ))}
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="mt-4 w-full"
                onClick={handleCopyDiagnostic}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar Diagnóstico Completo
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
};
