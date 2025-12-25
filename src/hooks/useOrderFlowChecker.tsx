import { useMemo } from 'react';

export interface OrderFlowStep {
  id: string;
  name: string;
  status: 'ok' | 'pending' | 'error' | 'na';
  reason?: string;
  evidence?: string;
  timestamp?: string;
}

export interface OrderFlowResult {
  steps: OrderFlowStep[];
  completedSteps: number;
  totalSteps: number;
  overallStatus: 'ok' | 'pending' | 'error';
  stoppedAt?: string;
  stoppedReason?: string;
  impact?: string;
  suggestion?: string;
}

interface Order {
  id: string;
  status: string;
  payment_status: string | null;
  payment_gateway: string | null;
  payment_method: string | null;
  mercadopago_payment_id: string | null;
  pagseguro_transaction_id: string | null;
  tracking_code: string | null;
  shipping_method: string | null;
  shipping_address: any;
  guest_email: string | null;
  user_id: string | null;
  review_email_sent: boolean | null;
  received_at: string | null;
  created_at: string;
  updated_at: string;
  total: number;
  order_items?: any[];
}

export const useOrderFlowChecker = (order: Order | null): OrderFlowResult | null => {
  return useMemo(() => {
    if (!order) return null;

    const isPickup = order.shipping_method === 'pickup';
    const isPaid = order.payment_status === 'paid' || order.payment_status === 'approved';
    const hasPaymentId = !!(order.mercadopago_payment_id || order.pagseguro_transaction_id);
    
    const steps: OrderFlowStep[] = [
      // 1. Pedido criado
      {
        id: 'order_created',
        name: 'Pedido criado',
        status: 'ok',
        timestamp: order.created_at,
        evidence: `ID: ${order.id.slice(0, 8)}`,
      },
      
      // 2. Checkout finalizado
      {
        id: 'checkout_completed',
        name: 'Checkout finalizado',
        status: order.shipping_address ? 'ok' : 'error',
        timestamp: order.created_at,
        evidence: order.shipping_address ? 'Endereço registrado' : undefined,
        reason: !order.shipping_address ? 'Endereço não preenchido' : undefined,
      },
      
      // 3. Pagamento iniciado
      {
        id: 'payment_started',
        name: 'Pagamento iniciado',
        status: order.payment_gateway ? 'ok' : 'pending',
        evidence: order.payment_gateway ? `Gateway: ${order.payment_gateway}` : undefined,
        reason: !order.payment_gateway ? 'Gateway não identificado' : undefined,
      },
      
      // 4. Pagamento aprovado
      {
        id: 'payment_approved',
        name: 'Pagamento aprovado',
        status: isPaid ? 'ok' : order.payment_status === 'failed' ? 'error' : 'pending',
        evidence: hasPaymentId ? `PaymentID: ${order.mercadopago_payment_id || order.pagseguro_transaction_id}` : undefined,
        reason: order.payment_status === 'failed' ? 'Pagamento recusado' : 
                !isPaid ? 'Aguardando confirmação' : undefined,
      },
      
      // 5. Status interno atualizado
      {
        id: 'status_updated',
        name: 'Status interno atualizado',
        status: isPaid && (order.status === 'processing' || order.status === 'confirmed' || order.status === 'shipped' || order.status === 'delivered') ? 'ok' :
                isPaid && order.status === 'pending' ? 'error' : 'pending',
        evidence: `Status: ${order.status}`,
        reason: isPaid && order.status === 'pending' ? 'Status não foi atualizado após pagamento' : undefined,
      },
      
      // 6. Estoque reservado (assumimos OK se pedido confirmado)
      {
        id: 'stock_reserved',
        name: 'Estoque reservado',
        status: isPaid ? 'ok' : 'pending',
        evidence: order.order_items?.length ? `${order.order_items.length} item(s)` : undefined,
      },
      
      // 7. Envio criado ou retirada definida
      {
        id: 'shipping_created',
        name: isPickup ? 'Retirada definida' : 'Envio criado',
        status: isPickup ? 'ok' : 
                order.status === 'shipped' || order.status === 'delivered' || order.tracking_code ? 'ok' :
                isPaid && order.status === 'processing' ? 'pending' : 'na',
        evidence: isPickup ? 'Retirada na loja' : 
                  order.tracking_code ? `Rastreio: ${order.tracking_code}` : undefined,
        reason: !isPickup && isPaid && !order.tracking_code && order.status === 'processing' ? 'Aguardando despacho' : undefined,
      },
      
      // 8. Código de rastreio gerado
      {
        id: 'tracking_generated',
        name: 'Código de rastreio gerado',
        status: isPickup ? 'na' :
                order.tracking_code ? 'ok' : 
                isPaid ? 'pending' : 'na',
        evidence: order.tracking_code || undefined,
        reason: !isPickup && isPaid && !order.tracking_code ? 'Aguardando código' : undefined,
      },
      
      // 9. Email de confirmação enviado
      // Considerar OK se temos guest_email OU user_id (usuário logado pode ter email no auth)
      {
        id: 'confirmation_email',
        name: 'Email de confirmação enviado',
        status: isPaid && (order.guest_email || order.user_id) ? 'ok' : 
                isPaid && !order.guest_email && !order.user_id ? 'error' : 'pending',
        evidence: order.guest_email ? `Para: ${order.guest_email}` : 
                  order.user_id ? 'Email do usuário logado' : undefined,
        reason: isPaid && !order.guest_email && !order.user_id ? 'Email do cliente não encontrado' : undefined,
      },
      
      // 10. Pedido enviado
      {
        id: 'order_shipped',
        name: 'Pedido enviado',
        status: isPickup ? 'na' :
                order.status === 'shipped' || order.status === 'delivered' ? 'ok' : 'pending',
        evidence: order.status === 'shipped' ? 'Em trânsito' : 
                  order.status === 'delivered' ? 'Entregue' : undefined,
      },
      
      // 11. Pedido entregue
      {
        id: 'order_delivered',
        name: isPickup ? 'Pedido retirado' : 'Pedido entregue',
        status: order.status === 'delivered' || order.received_at ? 'ok' : 'pending',
        timestamp: order.received_at || undefined,
        evidence: order.received_at ? 'Confirmado pelo cliente' : undefined,
      },
      
      // 12. Avaliação solicitada
      {
        id: 'review_requested',
        name: 'Avaliação solicitada',
        status: order.review_email_sent ? 'ok' : 
                order.status === 'delivered' ? 'pending' : 'na',
        evidence: order.review_email_sent ? 'Email enviado' : undefined,
      },
      
      // 13. Avaliação recebida (NA por padrão, seria necessário verificar tabela reviews)
      {
        id: 'review_received',
        name: 'Avaliação recebida',
        status: 'na', // Precisaria de join com product_reviews
      },
    ];

    // Calcular estatísticas
    const applicableSteps = steps.filter(s => s.status !== 'na');
    const completedSteps = steps.filter(s => s.status === 'ok').length;
    const errorSteps = steps.filter(s => s.status === 'error');
    const pendingSteps = applicableSteps.filter(s => s.status === 'pending');

    // Determinar status geral
    let overallStatus: 'ok' | 'pending' | 'error' = 'ok';
    let stoppedAt: string | undefined;
    let stoppedReason: string | undefined;
    let impact: string | undefined;
    let suggestion: string | undefined;

    if (errorSteps.length > 0) {
      overallStatus = 'error';
      const firstError = errorSteps[0];
      stoppedAt = firstError.name;
      stoppedReason = firstError.reason || 'Erro detectado nesta etapa';
      
      // Definir impacto e sugestão baseado no erro
      switch (firstError.id) {
        case 'checkout_completed':
          impact = 'O cliente não consegue receber seu pedido';
          suggestion = 'Verificar dados do checkout e contatar cliente';
          break;
        case 'payment_approved':
          impact = 'Pedido não será processado até pagamento';
          suggestion = 'Aguardar confirmação ou reprocessar pagamento';
          break;
        case 'status_updated':
          impact = 'Cliente pode não estar vendo status correto';
          suggestion = 'Atualizar status do pedido manualmente';
          break;
        case 'confirmation_email':
          impact = 'Cliente não recebeu confirmação por email';
          suggestion = 'Reenviar email de confirmação';
          break;
        default:
          impact = 'Fluxo do pedido está incompleto';
          suggestion = 'Verificar logs e reprocessar etapa';
      }
    } else if (pendingSteps.length > 0 && isPaid) {
      // Só marcar como pendente se houver etapas pendentes após pagamento
      const criticalPending = pendingSteps.filter(s => 
        ['confirmation_email', 'order_shipped', 'tracking_generated'].includes(s.id)
      );
      if (criticalPending.length > 0) {
        overallStatus = 'pending';
        stoppedAt = criticalPending[0].name;
        stoppedReason = criticalPending[0].reason || 'Aguardando processamento';
      }
    } else if (!isPaid) {
      overallStatus = 'pending';
      stoppedAt = 'Pagamento aprovado';
      stoppedReason = 'Aguardando confirmação de pagamento';
    }

    return {
      steps,
      completedSteps,
      totalSteps: applicableSteps.length,
      overallStatus,
      stoppedAt,
      stoppedReason,
      impact,
      suggestion,
    };
  }, [order]);
};
