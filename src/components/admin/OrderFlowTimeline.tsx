import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  MinusCircle,
  ShoppingCart,
  CreditCard,
  Package,
  Truck,
  Mail,
  Star,
  ClipboardCheck,
  MapPin,
  Receipt,
  PackageCheck,
  Send,
  MessageSquare
} from 'lucide-react';
import { OrderFlowStep } from '@/hooks/useOrderFlowChecker';
import { cn } from '@/lib/utils';

const stepIcons: Record<string, React.ComponentType<any>> = {
  order_created: ShoppingCart,
  checkout_completed: ClipboardCheck,
  payment_started: CreditCard,
  payment_approved: Receipt,
  status_updated: PackageCheck,
  stock_reserved: Package,
  shipping_created: MapPin,
  tracking_generated: Send,
  confirmation_email: Mail,
  order_shipped: Truck,
  order_delivered: CheckCircle2,
  review_requested: MessageSquare,
  review_received: Star,
};

interface OrderFlowTimelineProps {
  steps: OrderFlowStep[];
}

export const OrderFlowTimeline = ({ steps }: OrderFlowTimelineProps) => {
  const getStatusIcon = (status: OrderFlowStep['status']) => {
    switch (status) {
      case 'ok':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'na':
        return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: OrderFlowStep['status']) => {
    switch (status) {
      case 'ok':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'pending':
        return 'bg-yellow-50 border-yellow-300 text-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-300 text-red-800';
      case 'na':
        return 'bg-muted border-border text-muted-foreground';
    }
  };

  const getLineColor = (status: OrderFlowStep['status']) => {
    switch (status) {
      case 'ok':
        return 'bg-green-300';
      case 'pending':
        return 'bg-yellow-300';
      case 'error':
        return 'bg-red-300';
      case 'na':
        return 'bg-border';
    }
  };

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-0">
      {steps.map((step, index) => {
        const StepIcon = stepIcons[step.id] || Package;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="relative flex gap-4">
            {/* Timeline line */}
            {!isLast && (
              <div 
                className={cn(
                  "absolute left-5 top-10 w-0.5 h-[calc(100%-16px)]",
                  getLineColor(step.status)
                )}
              />
            )}

            {/* Icon container */}
            <div 
              className={cn(
                "relative z-10 flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center",
                getStatusColor(step.status)
              )}
            >
              <StepIcon className="h-4 w-4" />
            </div>

            {/* Content */}
            <div className="flex-1 pb-6">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{step.name}</span>
                    {getStatusIcon(step.status)}
                  </div>
                  
                  {step.timestamp && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatTimestamp(step.timestamp)}
                    </p>
                  )}
                  
                  {step.evidence && (
                    <p className="text-xs text-muted-foreground mt-1 font-mono bg-muted/50 px-2 py-1 rounded inline-block">
                      {step.evidence}
                    </p>
                  )}
                  
                  {step.reason && step.status !== 'ok' && (
                    <p className={cn(
                      "text-xs mt-1",
                      step.status === 'error' ? 'text-red-600' : 'text-yellow-600'
                    )}>
                      {step.reason}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
