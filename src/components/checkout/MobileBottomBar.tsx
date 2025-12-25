import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MobileBottomBarProps {
  finalTotal: number;
  isProcessing: boolean;
  onFinalize: () => void;
}

const formatPrice = (price: number) => {
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const MobileBottomBar = ({ finalTotal, isProcessing, onFinalize }: MobileBottomBarProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border p-4 lg:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.1)]">
      <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
        <div>
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-xl font-bold" data-testid="order-summary-total">
            {formatPrice(finalTotal)}
          </p>
        </div>
        <Button
          type="button"
          data-testid="checkout-cta-finalize"
          size="lg"
          onClick={onFinalize}
          disabled={isProcessing}
          className="h-12 px-8 text-base font-semibold min-w-[180px]"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Processando...
            </>
          ) : (
            "Finalizar compra"
          )}
        </Button>
      </div>
    </div>
  );
};

export default MobileBottomBar;
