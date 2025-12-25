import { useState } from "react";
import { ChevronDown, ChevronUp, Ticket, UserCheck, X, Loader2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  size?: string;
  color?: string;
  model?: string;
}

interface AppliedCoupon {
  code: string;
  discount_percent: number;
}

interface AppliedSeller {
  code: string;
  name: string;
  discount_percent: number;
}

interface ShippingOption {
  service: string;
  name: string;
  price: number;
  delivery_range?: string;
}

interface OrderSummaryProps {
  items: CartItem[];
  total: number;
  shipping: number;
  finalTotal: number;
  discountAmount: number;
  sellerDiscount: number;
  appliedCoupon: AppliedCoupon | null;
  appliedSeller: AppliedSeller | null;
  selectedShipping: ShippingOption | null;
  couponCode: string;
  sellerCode: string;
  isValidatingCoupon: boolean;
  isValidatingSeller: boolean;
  onCouponCodeChange: (value: string) => void;
  onSellerCodeChange: (value: string) => void;
  onValidateCoupon: () => void;
  onValidateSeller: () => void;
  onRemoveCoupon: () => void;
  onRemoveSeller: () => void;
  isProcessing: boolean;
  onFinalize: () => void;
  compact?: boolean;
}

const formatPrice = (price: number) => {
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const OrderSummary = ({
  items,
  total,
  shipping,
  finalTotal,
  discountAmount,
  sellerDiscount,
  appliedCoupon,
  appliedSeller,
  selectedShipping,
  couponCode,
  sellerCode,
  isValidatingCoupon,
  isValidatingSeller,
  onCouponCodeChange,
  onSellerCodeChange,
  onValidateCoupon,
  onValidateSeller,
  onRemoveCoupon,
  onRemoveSeller,
  isProcessing,
  onFinalize,
  compact = false,
}: OrderSummaryProps) => {
  const [isCouponOpen, setIsCouponOpen] = useState(false);
  const [isSellerOpen, setIsSellerOpen] = useState(false);

  const isPickup = selectedShipping?.service === "pickup";

  if (compact) {
    // Mobile collapsed version
    return (
      <Collapsible>
        <CollapsibleTrigger className="w-full flex items-center justify-between p-4 bg-card border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {items.length} {items.length === 1 ? "item" : "itens"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold" data-testid="order-summary-total">
              {formatPrice(finalTotal)}
            </span>
            <span className="text-sm text-primary">Ver resumo</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className="p-4 bg-card border-b border-border space-y-4">
          {/* Items */}
          <div className="space-y-3">
            {items.map((item, index) => {
              const itemKey = `${item.id}-${item.size || ""}-${item.color || ""}-${item.model || ""}-${index}`;
              return (
                <div key={itemKey} className="flex gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Qtd: {item.quantity} × {formatPrice(item.price)}
                    </p>
                  </div>
                  <p className="font-semibold text-sm">{formatPrice(item.price * item.quantity)}</p>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="space-y-2 pt-3 border-t border-border">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatPrice(total)}</span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between text-sm text-primary">
                <span>Cupom ({appliedCoupon.discount_percent}%)</span>
                <span>-{formatPrice(discountAmount)}</span>
              </div>
            )}
            {appliedSeller && sellerDiscount > 0 && (
              <div className="flex justify-between text-sm text-primary">
                <span>Vendedor ({appliedSeller.discount_percent}%)</span>
                <span>-{formatPrice(sellerDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span>{isPickup ? "Retirada na loja" : "Frete"}</span>
              <span className={shipping === 0 ? "text-primary font-medium" : ""}>
                {shipping === 0 ? "Grátis" : formatPrice(shipping)}
              </span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // Desktop full version
  return (
    <div className="bg-card rounded-2xl border border-border p-6 sticky top-24 space-y-6">
      <h2 className="text-lg font-semibold">Resumo do Pedido</h2>

      {/* Items */}
      <div className="space-y-4 max-h-[240px] overflow-y-auto pr-2 -mr-2">
        {items.map((item, index) => {
          const itemKey = `${item.id}-${item.size || ""}-${item.color || ""}-${item.model || ""}-${index}`;
          return (
            <div key={itemKey} className="flex gap-3">
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.name}</p>
                {(item.color || item.model) && (
                  <p className="text-xs text-muted-foreground truncate">
                    {item.color && `Cor: ${item.color}`}
                    {item.color && item.model && " | "}
                    {item.model && `Modelo: ${item.model}`}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  Qtd: {item.quantity} × {formatPrice(item.price)}
                </p>
              </div>
              <p className="font-semibold text-sm">{formatPrice(item.price * item.quantity)}</p>
            </div>
          );
        })}
      </div>

      {/* Coupon Section */}
      <Collapsible open={isCouponOpen || !!appliedCoupon} onOpenChange={setIsCouponOpen}>
        <CollapsibleTrigger
          data-testid="coupon-toggle"
          className="w-full flex items-center justify-between py-3 border-t border-border text-sm font-medium hover:text-primary transition-colors"
        >
          <div className="flex items-center gap-2">
            <Ticket className="h-4 w-4" />
            Cupom de desconto
          </div>
          {isCouponOpen || appliedCoupon ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="pb-3">
          {appliedCoupon ? (
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-primary" />
                <span className="font-mono font-medium text-sm">{appliedCoupon.code}</span>
                <span className="text-xs text-primary">-{appliedCoupon.discount_percent}%</span>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={onRemoveCoupon} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                data-testid="coupon-input"
                placeholder="Digite o código"
                value={couponCode}
                onChange={(e) => onCouponCodeChange(e.target.value.toUpperCase())}
                className="font-mono h-10"
              />
              <Button
                type="button"
                data-testid="coupon-apply-btn"
                variant="outline"
                onClick={onValidateCoupon}
                disabled={isValidatingCoupon || !couponCode}
                className="h-10"
              >
                {isValidatingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
              </Button>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Seller Code Section */}
      <Collapsible open={isSellerOpen || !!appliedSeller} onOpenChange={setIsSellerOpen}>
        <CollapsibleTrigger
          data-testid="seller-toggle"
          className="w-full flex items-center justify-between py-3 border-t border-border text-sm font-medium hover:text-primary transition-colors"
        >
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            Código do vendedor
            <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
          </div>
          {isSellerOpen || appliedSeller ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent className="pb-3">
          {appliedSeller ? (
            <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg border border-accent">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-foreground" />
                <span className="font-medium text-sm">{appliedSeller.name}</span>
                {appliedSeller.discount_percent > 0 && (
                  <span className="text-xs text-primary">-{appliedSeller.discount_percent}%</span>
                )}
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={onRemoveSeller} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                data-testid="seller-input"
                placeholder="Código do vendedor"
                value={sellerCode}
                onChange={(e) => onSellerCodeChange(e.target.value.toUpperCase())}
                className="font-mono h-10"
              />
              <Button
                type="button"
                data-testid="seller-validate-btn"
                variant="outline"
                onClick={onValidateSeller}
                disabled={isValidatingSeller || !sellerCode}
                className="h-10"
              >
                {isValidatingSeller ? <Loader2 className="h-4 w-4 animate-spin" /> : "Validar"}
              </Button>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Totals */}
      <div className="border-t border-border pt-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <span>{formatPrice(total)}</span>
        </div>
        {appliedCoupon && (
          <div className="flex justify-between text-sm text-primary">
            <span>Desconto cupom ({appliedCoupon.discount_percent}%)</span>
            <span>-{formatPrice(discountAmount)}</span>
          </div>
        )}
        {appliedSeller && sellerDiscount > 0 && (
          <div className="flex justify-between text-sm text-primary">
            <span>Desconto vendedor ({appliedSeller.discount_percent}%)</span>
            <span>-{formatPrice(sellerDiscount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span>
            {isPickup ? "Retirada na loja" : "Frete"}
            {selectedShipping && !isPickup && selectedShipping.name && (
              <span className="text-xs text-muted-foreground ml-1">({selectedShipping.name})</span>
            )}
          </span>
          <span className={shipping === 0 ? "text-primary font-medium" : ""}>
            {shipping === 0 ? "Grátis" : formatPrice(shipping)}
          </span>
        </div>
        {selectedShipping?.delivery_range && (
          <p className="text-xs text-muted-foreground">Prazo: {selectedShipping.delivery_range}</p>
        )}
        <div className="flex justify-between font-bold text-xl pt-3 border-t border-border">
          <span>Total</span>
          <span data-testid="order-summary-total">{formatPrice(finalTotal)}</span>
        </div>
      </div>

      {/* CTA Button */}
      <Button
        type="button"
        data-testid="checkout-cta-finalize"
        size="lg"
        onClick={onFinalize}
        disabled={isProcessing}
        className="w-full h-14 text-base font-semibold"
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
  );
};

export default OrderSummary;
