import { useParams, useNavigate } from 'react-router-dom';
import { ShippingLabel } from '@/components/admin/ShippingLabel';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const ShippingLabelPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();

  if (!orderId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground mb-4">ID do pedido não informado</p>
        <Button onClick={() => navigate('/admin/orders')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Pedidos
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-background rounded-lg shadow-lg p-6">
        <ShippingLabel 
          orderId={orderId} 
          onClose={() => navigate('/admin/orders')}
        />
      </div>
    </div>
  );
};

export default ShippingLabelPage;
