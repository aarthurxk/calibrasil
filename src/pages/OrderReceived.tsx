import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Check, AlertCircle, Info, ShoppingBag, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';

type StatusType = 'loading' | 'success' | 'already_confirmed' | 'error';

const OrderReceived = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<StatusType>('loading');
  const [message, setMessage] = useState('');

  const orderId = searchParams.get('orderId');
  const token = searchParams.get('token');

  useEffect(() => {
    const confirmReceipt = async () => {
      if (!orderId || !token) {
        setStatus('error');
        setMessage('Link inválido. Parâmetros faltando.');
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('confirm-order-received', {
          body: { orderId, token }
        });

        if (error) {
          console.error('Error confirming receipt:', error);
          setStatus('error');
          setMessage('Erro ao confirmar recebimento. Tente novamente.');
          return;
        }

        if (data.alreadyConfirmed) {
          setStatus('already_confirmed');
          setMessage('Você já confirmou o recebimento deste pedido anteriormente. Obrigado!');
        } else {
          setStatus('success');
          setMessage('Obrigado por confirmar o recebimento do seu pedido! Esperamos que você ame seus produtos Cali. Que tal deixar uma avaliação?');
        }
      } catch (err) {
        console.error('Error:', err);
        setStatus('error');
        setMessage('Ocorreu um erro inesperado. Tente novamente.');
      }
    };

    confirmReceipt();
  }, [orderId, token]);

  const getStatusConfig = () => {
    switch (status) {
      case 'loading':
        return {
          icon: <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />,
          title: 'Confirmando...',
          bgClass: 'bg-muted',
          textClass: 'text-foreground'
        };
      case 'success':
        return {
          icon: <Check className="h-12 w-12 text-green-600" />,
          title: 'Recebimento Confirmado! ✅',
          bgClass: 'bg-green-50 dark:bg-green-900/20',
          textClass: 'text-green-700 dark:text-green-400'
        };
      case 'already_confirmed':
        return {
          icon: <Info className="h-12 w-12 text-blue-600" />,
          title: 'Já Confirmado',
          bgClass: 'bg-blue-50 dark:bg-blue-900/20',
          textClass: 'text-blue-700 dark:text-blue-400'
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-12 w-12 text-destructive" />,
          title: 'Erro',
          bgClass: 'bg-destructive/10',
          textClass: 'text-destructive'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="bg-card rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="text-3xl font-bold text-primary mb-6">🌴 Cali Brasil</div>
        
        <div className={`${config.bgClass} rounded-xl p-6 mb-6`}>
          <div className="flex justify-center mb-4">
            {config.icon}
          </div>
          <h1 className={`text-2xl font-bold mb-3 ${config.textClass}`}>
            {config.title}
          </h1>
          {status !== 'loading' && (
            <p className="text-muted-foreground leading-relaxed">
              {message}
            </p>
          )}
        </div>

        {status === 'success' && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link to="/orders">
                <Package className="h-4 w-4 mr-2" />
                Ver Meus Pedidos
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/shop">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Continuar Comprando
              </Link>
            </Button>
          </div>
        )}

        {status === 'already_confirmed' && (
          <Button asChild>
            <Link to="/shop">
              <ShoppingBag className="h-4 w-4 mr-2" />
              Ir para a Loja
            </Link>
          </Button>
        )}

        {status === 'error' && (
          <Button asChild variant="outline">
            <Link to="/">Ir para a Loja</Link>
          </Button>
        )}
      </div>
    </div>
  );
};

export default OrderReceived;
