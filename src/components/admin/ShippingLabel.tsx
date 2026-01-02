import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Printer, Loader2 } from 'lucide-react';
import caliLogo from '@/assets/cali-logo.jpeg';

interface ShippingAddress {
  firstName?: string;
  lastName?: string;
  name?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip?: string;
  cep?: string;
}

interface ShippingLabelProps {
  orderId: string;
  onClose?: () => void;
}

export function ShippingLabel({ orderId, onClose }: ShippingLabelProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch order data
  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ['shipping-label-order', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, shipping_address, shipping_method, tracking_code, created_at')
        .eq('id', orderId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch store settings for sender info
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['shipping-label-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_settings')
        .select('store_name, store_pickup_address')
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const handlePrint = () => {
    window.print();
  };

  if (orderLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando etiqueta...</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Pedido não encontrado
      </div>
    );
  }

  const address = order.shipping_address as ShippingAddress | null;
  const recipientName = address?.name || 
    `${address?.firstName || ''} ${address?.lastName || ''}`.trim() || 
    'Destinatário';
  const recipientZip = address?.zip || address?.cep || '';

  // Sender info from store settings
  const senderName = settings?.store_name || 'Cali Beach Tech';
  const senderAddress = settings?.store_pickup_address || 'Shopping RioMar, Av. República do Líbano, 251 - Piso L1, Recife - PE';
  const senderCep = '51110-160'; // CEP do RioMar Recife

  return (
    <>
      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #shipping-label, #shipping-label * {
            visibility: visible;
          }
          #shipping-label {
            position: absolute;
            left: 0;
            top: 0;
            width: 10cm;
            height: 15cm;
            margin: 0;
            padding: 0;
          }
          .print-hide {
            display: none !important;
          }
          @page {
            size: 10cm 15cm;
            margin: 0;
          }
        }
      `}</style>

      {/* Print Button */}
      <div className="print-hide flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Etiqueta de Envio</h2>
        <div className="flex gap-2">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          )}
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir Etiqueta
          </Button>
        </div>
      </div>

      {/* Label Content */}
      <div
        id="shipping-label"
        ref={printRef}
        className="w-[10cm] min-h-[15cm] mx-auto bg-white border-2 border-dashed border-foreground/20 p-4 font-sans text-foreground"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Remetente */}
        <div className="border-b-2 border-foreground/30 pb-3 mb-3">
          <div className="flex items-start gap-3">
            <img 
              src={caliLogo} 
              alt="Logo" 
              className="w-12 h-12 object-contain"
            />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Remetente</p>
              <p className="font-bold text-sm">{senderName}</p>
              <p className="text-xs">{senderAddress}</p>
              <p className="text-xs font-semibold">CEP: {senderCep}</p>
            </div>
          </div>
        </div>

        {/* Destinatário */}
        <div className="border-b-2 border-foreground/30 pb-3 mb-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Destinatário</p>
          <p className="font-bold text-base">{recipientName}</p>
          {address && (
            <div className="text-sm space-y-0.5">
              <p>
                {address.street}, {address.number}
                {address.complement && ` - ${address.complement}`}
              </p>
              <p>{address.neighborhood}</p>
              <p className="font-semibold">
                {address.city} - {address.state}
              </p>
              <p className="text-base font-bold">CEP: {recipientZip}</p>
            </div>
          )}
        </div>

        {/* Informações do Pedido */}
        <div className="border-b-2 border-foreground/30 pb-3 mb-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">Pedido</p>
              <p className="font-bold">#{order.id.slice(0, 8)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Serviço</p>
              <p className="font-bold">{order.shipping_method || 'PAC'}</p>
            </div>
          </div>
          {order.tracking_code && (
            <div className="mt-2">
              <p className="text-muted-foreground text-xs">Rastreamento</p>
              <p className="font-bold font-mono text-sm">{order.tracking_code}</p>
            </div>
          )}
        </div>

        {/* Linha de Recorte */}
        <div className="flex items-center justify-center text-xs text-muted-foreground py-2 border-t border-dashed border-foreground/40">
          <span>✂️ Recorte aqui</span>
        </div>
      </div>
    </>
  );
}
