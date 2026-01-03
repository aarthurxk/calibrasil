import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import caliLogo from '@/assets/cali-logo.jpeg';

export interface ShippingLabelPrintData {
  trackingCode: string;
  etiquetaNumber: string;
  serviceType: 'PAC' | 'SEDEX';
  sender: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipcode: string;
    phone: string;
  };
  receiver: {
    name: string;
    address: string;
    neighborhood: string;
    city: string;
    state: string;
    zipcode: string;
    phone: string;
  };
  orderData: {
    orderId: string;
    weight: number;
    declaredValue: number;
    serviceType: string;
  };
}

interface ShippingLabelPrintProps {
  data: ShippingLabelPrintData;
  onClose?: () => void;
}

export function ShippingLabelPrint({ data, onClose }: ShippingLabelPrintProps) {
  const labelRef = useRef<HTMLDivElement>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);

  // Generate barcode when component mounts or tracking code changes
  useEffect(() => {
    if (barcodeRef.current && data.trackingCode) {
      try {
        JsBarcode(barcodeRef.current, data.trackingCode, {
          format: 'CODE128',
          width: 2,
          height: 50,
          displayValue: false,
          margin: 0,
        });
      } catch (error) {
        console.error('Error generating barcode:', error);
      }
    }
  }, [data.trackingCode]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!labelRef.current) return;

    try {
      const canvas = await html2canvas(labelRef.current, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [100, 150],
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 100, 150);
      pdf.save(`etiqueta-${data.trackingCode}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const serviceColor = data.serviceType === 'SEDEX' ? '#003D7A' : '#00A859';
  const trackingUrl = `https://rastreamento.correios.com.br/app/index.php?id=${data.trackingCode}`;

  return (
    <div className="flex flex-col gap-4">
      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #shipping-label-print, #shipping-label-print * {
            visibility: visible;
          }
          #shipping-label-print {
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

      {/* Action Buttons */}
      <div className="print-hide flex justify-between items-center">
        <h2 className="text-lg font-semibold">Etiqueta de Envio - Correios</h2>
        <div className="flex gap-2">
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          )}
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            Baixar PDF
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Label Content */}
      <div
        id="shipping-label-print"
        ref={labelRef}
        className="w-[10cm] min-h-[15cm] mx-auto bg-white border-2 border-foreground/20 font-sans text-foreground"
        style={{ fontFamily: 'Arial, sans-serif' }}
      >
        {/* Header - Logo and Service Type */}
        <div 
          className="flex justify-between items-center px-3 py-2 border-b-2 border-foreground/30"
          style={{ backgroundColor: '#FFCC00' }}
        >
          <div className="flex items-center gap-2">
            <img 
              src={caliLogo} 
              alt="Logo" 
              className="w-10 h-10 object-contain rounded"
            />
            <div>
              <p className="font-bold text-xs" style={{ color: '#003D7A' }}>CORREIOS</p>
              <p className="text-[8px]" style={{ color: '#003D7A' }}>ECT - EMPRESA BRASILEIRA DE CORREIOS</p>
            </div>
          </div>
          <div 
            className="px-3 py-1 rounded text-white font-bold text-lg"
            style={{ backgroundColor: serviceColor }}
          >
            {data.serviceType}
          </div>
        </div>

        {/* Label Number */}
        <div className="text-center py-1 border-b border-foreground/20 bg-muted/30">
          <p className="font-mono font-bold text-sm">{data.etiquetaNumber}</p>
        </div>

        {/* Sender */}
        <div className="px-3 py-2 border-b border-foreground/20">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">REMETENTE:</p>
          <div className="text-xs space-y-0.5">
            <p className="font-semibold">{data.sender.name}</p>
            <p>{data.sender.address}</p>
            <p>{data.sender.city} - {data.sender.state} | CEP: {data.sender.zipcode}</p>
            {data.sender.phone && <p>Tel: {data.sender.phone}</p>}
          </div>
        </div>

        {/* Receiver - Highlighted */}
        <div className="px-3 py-3 border-b-2 border-foreground/30 bg-muted/20">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">DESTINATÁRIO:</p>
          <div className="text-sm space-y-0.5">
            <p className="font-bold text-base">{data.receiver.name}</p>
            <p>{data.receiver.address}</p>
            {data.receiver.neighborhood && <p>{data.receiver.neighborhood}</p>}
            <p className="font-semibold">{data.receiver.city} - {data.receiver.state}</p>
            <p className="text-lg font-bold">CEP: {data.receiver.zipcode}</p>
            {data.receiver.phone && <p className="text-xs">Tel: {data.receiver.phone}</p>}
          </div>
        </div>

        {/* Barcode */}
        <div className="flex flex-col items-center justify-center py-3 border-b border-foreground/20">
          <svg ref={barcodeRef} className="w-full max-w-[90%]" />
          <p className="font-mono font-bold text-sm mt-1 tracking-wider">{data.trackingCode}</p>
        </div>

        {/* Footer - Weight, Value, QR Code */}
        <div className="flex justify-between items-center px-3 py-2 border-b border-dashed border-foreground/40">
          <div className="text-xs space-y-0.5">
            <p>Peso: {data.orderData.weight.toFixed(3)} kg</p>
            <p>Valor Declarado: R$ {data.orderData.declaredValue.toFixed(2)}</p>
            <p className="text-muted-foreground">Pedido: #{data.orderData.orderId.slice(0, 8)}</p>
          </div>
          <div className="flex flex-col items-center">
            <QRCodeSVG 
              value={trackingUrl} 
              size={50}
              level="M"
            />
            <p className="text-[8px] text-muted-foreground mt-1">Rastrear</p>
          </div>
        </div>

        {/* Cut Line */}
        <div className="flex items-center justify-center text-xs text-muted-foreground py-2 border-t border-dashed border-foreground/40">
          <span>✂️ Recorte aqui</span>
        </div>
      </div>
    </div>
  );
}
