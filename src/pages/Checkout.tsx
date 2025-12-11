import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CreditCard, Lock, QrCode, Barcode, Loader2 } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/hooks/useAuth';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { z } from 'zod';

// Validation schema for checkout form
const checkoutSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255, "Email muito longo"),
  phone: z.string().trim().regex(/^\(\d{2}\)\s?\d{4,5}-?\d{4}$/, "Telefone inválido (ex: (11) 99999-9999)").optional().or(z.literal("")),
  firstName: z.string().trim().min(2, "Nome muito curto").max(100, "Nome muito longo"),
  lastName: z.string().trim().min(2, "Sobrenome muito curto").max(100, "Sobrenome muito longo"),
  address: z.string().trim().min(5, "Endereço muito curto").max(200, "Endereço muito longo"),
  city: z.string().trim().min(2, "Cidade muito curta").max(100, "Cidade muito longa"),
  zip: z.string().trim().regex(/^\d{5}-?\d{3}$/, "CEP inválido (ex: 12345-678)"),
});

type PaymentMethod = 'pix' | 'boleto' | 'card';

const Checkout = () => {
  const { items, total } = useCart();
  const isRedirecting = useRef(false);
  const { user } = useAuth();
  const { settings } = useStoreSettings();
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Form state
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');

  const shipping = total >= settings.free_shipping_threshold ? 0 : settings.standard_shipping_rate;
  const finalTotal = total + shipping;

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    try {
      // Validate form data with zod schema
      const validationResult = checkoutSchema.safeParse({
        email,
        phone: phone || "",
        firstName,
        lastName,
        address,
        city,
        zip,
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast.error(firstError.message);
        setIsProcessing(false);
        return;
      }

      const baseUrl = window.location.origin;
      
      const checkoutData = {
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          size: item.size,
          color: item.color,
          model: item.model,
        })),
        email,
        phone: phone || null,
        shipping_address: {
          firstName,
          lastName,
          address,
          city,
          zip,
        },
        user_id: user?.id || null,
        total: finalTotal,
        shipping,
        payment_method: paymentMethod,
        success_url: `${baseUrl}/order-confirmation`,
        cancel_url: `${baseUrl}/checkout`,
      };

      console.log('Creating checkout session:', checkoutData);

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: checkoutData,
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Erro ao criar sessão de pagamento');
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao criar sessão de pagamento');
      }

      console.log('Checkout session created:', data);
      
      // Open Stripe Checkout in new tab (works in preview and production)
      if (data.sessionUrl) {
        isRedirecting.current = true;
        window.open(data.sessionUrl, '_blank');
        toast.success('Abrindo página de pagamento...');
        setIsProcessing(false);
        return;
      } else {
        throw new Error('URL de pagamento não recebida');
      }
      
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      toast.error(error.message || 'Erro ao processar pagamento. Tente novamente.');
      setIsProcessing(false);
    }
  };

  // Don't show empty cart message if we're redirecting to payment
  if (items.length === 0 && !isRedirecting.current) {
    return (
      <MainLayout>
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Sua sacola tá vazia!</h1>
          <Link to="/shop">
            <Button>Continuar Comprando</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-12">
        <Link
          to="/cart"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar pra Sacola
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Checkout Form */}
          <div>
            <h1 className="text-3xl font-bold mb-8">Finalizar Compra</h1>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Contact Info */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Informações de Contato</h2>
                <div>
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              {/* Shipping Address */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Endereço de Entrega</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Nome *</Label>
                    <Input 
                      id="firstName" 
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Sobrenome *</Label>
                    <Input 
                      id="lastName" 
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="address">Endereço *</Label>
                  <Input 
                    id="address" 
                    required 
                    placeholder="Rua, número, complemento"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">Cidade *</Label>
                    <Input 
                      id="city" 
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="zip">CEP *</Label>
                    <Input 
                      id="zip" 
                      required 
                      placeholder="00000-000"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Forma de Pagamento
                </h2>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Pagamento 100% seguro via Stripe
                </p>
                
                <RadioGroup 
                  value={paymentMethod} 
                  onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-3 border border-border rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors">
                    <RadioGroupItem value="pix" id="pix" />
                    <Label htmlFor="pix" className="flex items-center gap-3 cursor-pointer flex-1">
                      <QrCode className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Pix</p>
                        <p className="text-sm text-muted-foreground">Aprovação instantânea</p>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-3 border border-border rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors">
                    <RadioGroupItem value="boleto" id="boleto" />
                    <Label htmlFor="boleto" className="flex items-center gap-3 cursor-pointer flex-1">
                      <Barcode className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Boleto Bancário</p>
                        <p className="text-sm text-muted-foreground">Aprovação em até 3 dias úteis</p>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-3 border border-border rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex items-center gap-3 cursor-pointer flex-1">
                      <CreditCard className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Cartão de Crédito</p>
                        <p className="text-sm text-muted-foreground">Aprovação instantânea</p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full bg-gradient-ocean text-primary-foreground hover:opacity-90"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecionando para pagamento...
                  </>
                ) : (
                  `Pagar ${formatPrice(finalTotal)}`
                )}
              </Button>
            </form>
          </div>

          {/* Order Summary */}
          <div>
            <div className="bg-card rounded-xl border border-border p-6 sticky top-24">
              <h2 className="text-xl font-semibold mb-6">Resumo do Pedido</h2>

              <div className="space-y-4 mb-6">
                {items.map((item, index) => {
                  const itemKey = `${item.id}-${item.size || ''}-${item.color || ''}-${item.model || ''}-${index}`;
                  return (
                    <div key={itemKey} className="flex gap-4">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium line-clamp-1">{item.name}</p>
                        {(item.color || item.model || item.size) && (
                          <p className="text-xs text-muted-foreground">
                            {[item.color, item.model, item.size].filter(Boolean).join(' / ')}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Qtd: {item.quantity}
                        </p>
                      </div>
                      <p className="font-medium">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3 pt-4 border-t border-border">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Frete</span>
                  <span>{shipping === 0 ? 'Grátis 🎉' : formatPrice(shipping)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-3 border-t border-border">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(finalTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Checkout;
