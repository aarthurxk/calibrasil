import { Link } from 'react-router-dom';
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, Loader2 } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { useCart } from '@/contexts/CartContext';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { Button } from '@/components/ui/button';

const Cart = () => {
  const { items, removeItem, updateQuantity, total, clearCart } = useCart();
  const { settings, isLoading: isLoadingSettings } = useStoreSettings();

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const shipping = total >= settings.free_shipping_threshold ? 0 : settings.standard_shipping_rate;
  const finalTotal = total + shipping;

  if (items.length === 0) {
    return (
      <MainLayout>
        <div className="container py-20 text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-4">Ih, tá vazio aqui! 😅</h1>
          <p className="text-muted-foreground mb-8">
            Parece que você ainda não escolheu nada. Bora lá conferir nossos produtos!
          </p>
          <Link to="/shop">
            <Button className="bg-gradient-ocean text-primary-foreground">
              Começar a Comprar
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-12">
        <h1 className="text-3xl font-bold mb-8">Sua Sacola 🛍️</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item, index) => {
              const itemKey = `${item.id}-${item.size || ''}-${item.color || ''}-${item.model || ''}-${index}`;
              return (
                <div
                  key={itemKey}
                  className="flex gap-4 p-4 bg-card rounded-xl border border-border"
                >
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/product/${item.id}`}
                      className="font-semibold text-card-foreground hover:text-primary transition-colors line-clamp-1"
                    >
                      {item.name}
                    </Link>
                    {(item.size || item.color || item.model) && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {[item.color, item.model, item.size].filter(Boolean).join(' / ')}
                      </p>
                    )}
                    <p className="text-lg font-bold text-primary mt-2">
                      {formatPrice(item.price)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => removeItem(item.id, item.size, item.color, item.model)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                    <div className="flex items-center border border-border rounded-lg">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1, item.size, item.color, item.model)}
                        className="p-2 hover:bg-muted transition-colors"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="px-4 font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1, item.size, item.color, item.model)}
                        className="p-2 hover:bg-muted transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            <Button
              variant="ghost"
              onClick={clearCart}
              className="text-muted-foreground hover:text-destructive"
            >
              Limpar Sacola
            </Button>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl border border-border p-6 sticky top-24">
              <h2 className="text-xl font-semibold mb-6">Resumo do Pedido</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Frete</span>
                  <span>{shipping === 0 ? 'Grátis 🎉' : formatPrice(shipping)}</span>
                </div>
                <div className="border-t border-border pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">
                      {formatPrice(finalTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {total < settings.free_shipping_threshold && (
                <p className="text-sm text-muted-foreground mb-4 p-3 bg-cali-teal-light rounded-lg">
                  Adiciona mais {formatPrice(settings.free_shipping_threshold - total)} e ganha frete grátis! 🚚
                </p>
              )}

              <Link to="/checkout">
                <Button className="w-full bg-gradient-ocean text-primary-foreground hover:opacity-90">
                  Finalizar Compra
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>

              <Link to="/shop">
                <Button variant="ghost" className="w-full mt-3">
                  Continuar Comprando
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Cart;
