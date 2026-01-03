import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOrderFlowChecker } from '@/hooks/useOrderFlowChecker';
import { cn } from '@/lib/utils';
import { Store, Truck } from 'lucide-react';

interface OrderMonitorCardProps {
  order: any;
  isSelected: boolean;
  onClick: () => void;
}

export const OrderMonitorCard = ({ order, isSelected, onClick }: OrderMonitorCardProps) => {
  const flowResult = useOrderFlowChecker(order);

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = () => {
    if (!flowResult) return null;
    
    switch (flowResult.overallStatus) {
      case 'ok':
        return <Badge className="bg-green-100 text-green-800 border-green-300">OK</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pendente</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Erro</Badge>;
    }
  };

  const getProgressBar = () => {
    if (!flowResult) return null;
    const percentage = (flowResult.completedSteps / flowResult.totalSteps) * 100;
    
    return (
      <div className="w-full bg-muted rounded-full h-1.5 mt-2">
        <div 
          className={cn(
            "h-1.5 rounded-full transition-all",
            flowResult.overallStatus === 'ok' ? 'bg-green-500' :
            flowResult.overallStatus === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  // Get customer name from shipping_address
  const shippingAddress = order.shipping_address as any;
  const customerName = shippingAddress?.name || 
    `${shippingAddress?.firstName || ''} ${shippingAddress?.lastName || ''}`.trim() || 
    'Cliente';
  
  const isPickup = order.shipping_method === 'pickup';
  const hasTracking = !!order.tracking_code;

  return (
    <Card 
      className={cn(
        "p-4 cursor-pointer transition-all duration-200",
        "hover:shadow-lg hover:-translate-y-0.5",
        isSelected && "ring-2 ring-primary bg-accent/50 shadow-lg",
        flowResult?.overallStatus === 'error' && "border-red-200 hover:border-red-300",
        flowResult?.overallStatus === 'pending' && "border-yellow-200 hover:border-yellow-300"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-medium">
              #{order.id.slice(0, 8)}
            </span>
            <div className={cn(
              "transition-all duration-300",
              flowResult?.overallStatus === 'error' && "animate-badge-pulse"
            )}>
              {getStatusBadge()}
            </div>
            {isPickup && (
              <Badge variant="outline" className="text-xs gap-1 bg-blue-50 border-blue-200 text-blue-700">
                <Store className="h-3 w-3" />
                Retirada
              </Badge>
            )}
            {hasTracking && !isPickup && (
              <Badge variant="outline" className="text-xs gap-1 bg-purple-50 border-purple-200 text-purple-700">
                <Truck className="h-3 w-3" />
                {order.tracking_code?.slice(0, 13)}
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground truncate mt-1">
            {customerName}
          </p>
          
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {formatPrice(Number(order.total))}
            </span>
            <span>•</span>
            <span>{formatDate(order.created_at)}</span>
          </div>

          {flowResult && (
            <>
              <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
                <div 
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-700 ease-out",
                    flowResult.overallStatus === 'ok' ? 'bg-green-500' :
                    flowResult.overallStatus === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                  )}
                  style={{ width: `${(flowResult.completedSteps / flowResult.totalSteps) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className="text-muted-foreground">
                  {flowResult.completedSteps}/{flowResult.totalSteps} etapas
                </span>
                {flowResult.stoppedAt && flowResult.overallStatus !== 'ok' && (
                  <span className={cn(
                    "truncate ml-2",
                    flowResult.overallStatus === 'error' ? 'text-red-600' : 'text-yellow-600'
                  )}>
                    Parou em: {flowResult.stoppedAt}
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};
