import { CreditCard, QrCode, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentOptionsProps {
  isProcessingStripe: boolean;
  isProcessingMercadoPago: boolean;
  isProcessing: boolean;
  onStripeClick: () => void;
  onMercadoPagoClick: () => void;
}

const PaymentOptions = ({
  isProcessingStripe,
  isProcessingMercadoPago,
  isProcessing,
  onStripeClick,
  onMercadoPagoClick,
}: PaymentOptionsProps) => {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Pagamento
        </h2>
        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
          <Lock className="h-3.5 w-3.5" />
          Pagamento 100% seguro
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Stripe Button */}
        <Button
          type="button"
          data-testid="pay-stripe-btn"
          size="lg"
          onClick={onStripeClick}
          disabled={isProcessing}
          className="h-auto min-h-[72px] py-4 flex flex-col items-center justify-center gap-1.5 bg-[#635BFF] hover:bg-[#5046e5] text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#635BFF]"
        >
          {isProcessingStripe ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Redirecionando...</span>
            </>
          ) : (
            <>
              <CreditCard className="h-5 w-5" />
              <span className="font-semibold text-sm">Pagar com Stripe</span>
              <span className="text-xs opacity-80">Cartão de crédito</span>
            </>
          )}
        </Button>

        {/* Mercado Pago Button */}
        <Button
          type="button"
          data-testid="pay-mercadopago-btn"
          size="lg"
          onClick={onMercadoPagoClick}
          disabled={isProcessing}
          className="h-auto min-h-[72px] py-4 flex flex-col items-center justify-center gap-1.5 bg-[#009EE3] hover:bg-[#007eb8] text-white focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#009EE3]"
        >
          {isProcessingMercadoPago ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Redirecionando...</span>
            </>
          ) : (
            <>
              <QrCode className="h-5 w-5" />
              <span className="font-semibold text-sm">Pagar com Mercado Pago</span>
              <span className="text-xs opacity-80">Cartão, Pix e Boleto</span>
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Você será redirecionado para o gateway de pagamento escolhido
      </p>
    </section>
  );
};

export default PaymentOptions;
