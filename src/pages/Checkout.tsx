import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CreditCard, Lock, QrCode, Loader2, MapPin, Ticket, X } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useUserAddresses, UserAddress } from "@/hooks/useUserAddresses";
import { useCoupon } from "@/hooks/useCoupon";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { z } from "zod";

// Validation schema for checkout form
const checkoutSchema = z.object({
  email: z.string().trim().email("Email inválido").max(255, "Email muito longo"),
  phone: z
    .string()
    .trim()
    .regex(/^\(\d{2}\)\s?\d{4,5}-?\d{4}$/, "Telefone inválido (ex: (11) 99999-9999)"),
  firstName: z.string().trim().min(2, "Nome muito curto").max(100, "Nome muito longo"),
  lastName: z.string().trim().min(2, "Sobrenome muito curto").max(100, "Sobrenome muito longo"),
  zip: z.string().trim().regex(/^\d{5}-?\d{3}$/, "CEP inválido (ex: 12345-678)"),
  street: z.string().trim().min(3, "Rua é obrigatória"),
  houseNumber: z.string().trim().min(1, "Número é obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().trim().min(2, "Bairro é obrigatório"),
  city: z.string().trim().min(2, "Cidade é obrigatória"),
  state: z.string().trim().length(2, "Estado inválido"),
});

type PaymentGateway = "stripe" | "mercadopago";

const Checkout = () => {
  const { items, total } = useCart();
  const isRedirecting = useRef(false);
  const { user } = useAuth();
  const { settings } = useStoreSettings();
  const { addresses, isLoading: isLoadingAddresses, addAddress, canAddMore } = useUserAddresses();
  const { appliedCoupon, isValidating, validateCoupon, removeCoupon, discountAmount } = useCoupon(total);
  const [isProcessingStripe, setIsProcessingStripe] = useState(false);
  const [isProcessingMercadoPago, setIsProcessingMercadoPago] = useState(false);
  const [couponCode, setCouponCode] = useState("");

  // Address selection state
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [saveNewAddress, setSaveNewAddress] = useState(false);
  const [addressLabel, setAddressLabel] = useState("");

  // Form state
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [zip, setZip] = useState("");
  const [street, setStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  const isProcessing = isProcessingStripe || isProcessingMercadoPago;

  const shipping = total >= settings.free_shipping_threshold ? 0 : settings.standard_shipping_rate;
  const totalAfterDiscount = total - discountAmount;
  const finalTotal = totalAfterDiscount + shipping;

  // Auto-fill contact info from user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      // Email from auth
      setEmail(user.email || "");

      // Fetch profile data
      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("user_id", user.id)
        .single();

      if (data) {
        if (data.full_name) {
          const nameParts = data.full_name.trim().split(" ");
          setFirstName(nameParts[0] || "");
          setLastName(nameParts.slice(1).join(" ") || "");
        }
        if (data.phone) {
          setPhone(data.phone);
        }
      }
    };

    fetchProfile();
  }, [user]);

  // Auto-select default address when addresses load
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId && !useNewAddress) {
      const defaultAddr = addresses.find((a) => a.is_default) || addresses[0];
      setSelectedAddressId(defaultAddr.id);
      fillFormFromAddress(defaultAddr);
    }
  }, [addresses]);

  // For logged-in users with no addresses, default to save new address
  useEffect(() => {
    if (user && addresses.length === 0 && !isLoadingAddresses) {
      setSaveNewAddress(true);
    }
  }, [user, addresses, isLoadingAddresses]);

  const fillFormFromAddress = (address: UserAddress) => {
    setZip(address.zip);
    setStreet(address.street);
    setHouseNumber(address.house_number);
    setComplement(address.complement || "");
    setNeighborhood(address.neighborhood);
    setCity(address.city);
    setState(address.state);
  };

  const handleSelectAddress = (address: UserAddress) => {
    setSelectedAddressId(address.id);
    setUseNewAddress(false);
    fillFormFromAddress(address);
  };

  const handleUseNewAddress = () => {
    setSelectedAddressId(null);
    setUseNewAddress(true);
    // Clear address fields
    setZip("");
    setStreet("");
    setHouseNumber("");
    setComplement("");
    setNeighborhood("");
    setCity("");
    setState("");
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const fetchAddressByCep = async (cep: string) => {
    const cepNumbers = cep.replace(/\D/g, "");
    if (cepNumbers.length !== 8) return;

    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepNumbers}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error("CEP não encontrado");
        return;
      }

      setStreet(data.logradouro || "");
      setNeighborhood(data.bairro || "");
      setCity(data.localidade || "");
      setState(data.uf || "");
    } catch (error) {
      toast.error("Erro ao buscar CEP");
    } finally {
      setIsLoadingCep(false);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value.replace(/\D/g, "");
    const formatado = valor.replace(/(\d{5})(\d{3})/, "$1-$2");
    setZip(formatado);

    // Auto-fetch when CEP is complete
    if (valor.length === 8) {
      fetchAddressByCep(valor);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value.replace(/\D/g, "");
    const formatado = valor.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    setPhone(formatado);
  };

  const validateForm = () => {
    const validationResult = checkoutSchema.safeParse({
      email,
      phone,
      firstName,
      lastName,
      zip,
      street,
      houseNumber,
      complement: complement || undefined,
      neighborhood,
      city,
      state,
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast.error(firstError.message);
      return false;
    }
    return true;
  };

  const saveAddressIfNeeded = async () => {
    if (user && (useNewAddress || addresses.length === 0) && saveNewAddress && canAddMore && addressLabel) {
      await addAddress({
        label: addressLabel,
        zip,
        street,
        house_number: houseNumber,
        complement: complement || null,
        neighborhood,
        city,
        state,
        is_default: addresses.length === 0,
      });
    }
  };

  const getCheckoutPayload = () => ({
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image: item.image,
      size: item.size,
      color: item.color,
      model: item.model,
    })),
    customerEmail: email,
    customerName: `${firstName} ${lastName}`,
    customerPhone: phone,
    shippingAddress: {
      street,
      houseNumber,
      complement: complement || null,
      neighborhood,
      city,
      state,
      zip,
    },
    shippingCost: shipping,
    couponCode: appliedCoupon?.code || null,
    user_id: user?.id || null,
  });

  const handleStripeCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsProcessingStripe(true);

    try {
      await saveAddressIfNeeded();

      const baseUrl = window.location.origin;
      const payload = getCheckoutPayload();

      const checkoutData = {
        items: payload.items,
        email: payload.customerEmail,
        phone: payload.customerPhone,
        shipping_address: {
          firstName,
          lastName,
          street: payload.shippingAddress.street,
          number: payload.shippingAddress.houseNumber,
          complement: payload.shippingAddress.complement,
          neighborhood: payload.shippingAddress.neighborhood,
          city: payload.shippingAddress.city,
          state: payload.shippingAddress.state,
          zip: payload.shippingAddress.zip,
        },
        user_id: payload.user_id,
        total: finalTotal,
        shipping,
        payment_method: "card",
        success_url: `${baseUrl}/order-confirmation`,
        cancel_url: `${baseUrl}/checkout`,
      };

      console.log("Creating Stripe checkout session:", { itemCount: items.length });

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
        },
        body: JSON.stringify(checkoutData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error("Stripe checkout error:", data);
        throw new Error(data.error || "Erro ao criar sessão de pagamento Stripe");
      }

      if (data.sessionUrl) {
        isRedirecting.current = true;
        window.location.href = data.sessionUrl;
        return;
      } else {
        throw new Error("URL de pagamento não recebida");
      }
    } catch (error: any) {
      console.error("Error creating Stripe checkout:", error);
      const errorMessage = error.message || '';
      
      if (errorMessage.includes('valor mínimo')) {
        toast.error(errorMessage);
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
        toast.error('Erro de conexão. Verifique sua internet.');
      } else {
        toast.error(errorMessage || 'Erro ao processar pagamento. Tente novamente.');
      }
      
      setIsProcessingStripe(false);
    }
  };

  const handleMercadoPagoCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsProcessingMercadoPago(true);

    try {
      await saveAddressIfNeeded();

      const baseUrl = window.location.origin;
      const payload = getCheckoutPayload();

      const checkoutData = {
        ...payload,
        success_url: `${baseUrl}/order-confirmation`,
        cancel_url: `${baseUrl}/checkout`,
      };

      console.log("Creating Mercado Pago checkout session:", { itemCount: items.length });

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;

      const response = await fetch(`${supabaseUrl}/functions/v1/create-mercadopago-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
        },
        body: JSON.stringify(checkoutData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error("Mercado Pago checkout error:", data);
        throw new Error(data.error || "Erro ao criar sessão de pagamento Mercado Pago");
      }

      if (data.url) {
        isRedirecting.current = true;
        window.location.href = data.url;
        return;
      } else {
        throw new Error("URL de pagamento não recebida");
      }
    } catch (error: any) {
      console.error("Error creating Mercado Pago checkout:", error);
      const errorMessage = error.message || '';
      
      if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
        toast.error('Erro de conexão. Verifique sua internet.');
      } else {
        toast.error(errorMessage || 'Erro ao processar pagamento Mercado Pago. Tente novamente.');
      }
      
      setIsProcessingMercadoPago(false);
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

  const hasAddresses = user && addresses.length > 0;

  return (
    <MainLayout>
      <div className="container py-12">
        <Link to="/cart" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar pra Sacola
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Checkout Form */}
          <div>
            <h1 className="text-3xl font-bold mb-8">Finalizar Compra</h1>

            <form className="space-y-8">
              {/* Contact Info */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Informações de Contato</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">Nome *</Label>
                    <Input id="firstName" required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Sobrenome *</Label>
                    <Input id="lastName" required value={lastName} onChange={(e) => setLastName(e.target.value)} />
                  </div>
                </div>
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
                  <Label htmlFor="phone">Telefone *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    required
                    placeholder="(11) 99999-9999"
                    value={phone}
                    onChange={handlePhoneChange}
                  />
                </div>
              </div>

              {/* Shipping Address */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Endereço de Entrega</h2>

                {/* Prompt for users without addresses */}
                {user && addresses.length === 0 && !isLoadingAddresses && (
                  <div className="p-4 border border-dashed border-primary/50 bg-primary/5 rounded-lg">
                    <p className="text-sm text-foreground">
                      Você ainda não tem endereços salvos. Preencha o endereço abaixo e salve para usar em compras futuras!
                    </p>
                  </div>
                )}

                {/* Saved Addresses */}
                {hasAddresses && (
                  <div className="space-y-3">
                    <Label className="text-sm text-muted-foreground">Endereços salvos</Label>
                    <div className="space-y-2">
                      {addresses.map((addr) => (
                        <div
                          key={addr.id}
                          onClick={() => handleSelectAddress(addr)}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            selectedAddressId === addr.id && !useNewAddress
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <MapPin className="h-4 w-4 mt-0.5 text-primary" />
                            <div className="flex-1">
                              <p className="font-medium text-sm">{addr.label}</p>
                              <p className="text-sm text-muted-foreground">
                                {addr.street}, {addr.house_number}
                                {addr.complement && ` - ${addr.complement}`}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {addr.neighborhood}, {addr.city} - {addr.state}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      type="button"
                      variant={useNewAddress ? "default" : "outline"}
                      size="sm"
                      onClick={handleUseNewAddress}
                      className="w-full"
                    >
                      Usar outro endereço
                    </Button>
                  </div>
                )}

                {/* New Address Form */}
                {(!hasAddresses || useNewAddress) && (
                  <Collapsible open={!hasAddresses || useNewAddress} className="space-y-4">
                    <CollapsibleContent className="space-y-4">
                      {/* CEP */}
                      <div>
                        <Label htmlFor="zip">CEP *</Label>
                        <div className="relative">
                          <Input
                            id="zip"
                            required
                            placeholder="00000-000"
                            value={zip}
                            onChange={handleCepChange}
                            maxLength={9}
                          />
                          {isLoadingCep && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {/* Street */}
                      <div>
                        <Label htmlFor="street">Rua *</Label>
                        <Input
                          id="street"
                          required
                          placeholder="Preenchido automaticamente pelo CEP"
                          value={street}
                          onChange={(e) => setStreet(e.target.value)}
                        />
                      </div>

                      {/* Number & Complement */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="houseNumber">Número *</Label>
                          <Input
                            id="houseNumber"
                            required
                            placeholder="123"
                            value={houseNumber}
                            onChange={(e) => setHouseNumber(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="complement">Complemento</Label>
                          <Input
                            id="complement"
                            placeholder="Apto, bloco, etc. (opcional)"
                            value={complement}
                            onChange={(e) => setComplement(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Neighborhood */}
                      <div>
                        <Label htmlFor="neighborhood">Bairro *</Label>
                        <Input
                          id="neighborhood"
                          required
                          placeholder="Preenchido automaticamente pelo CEP"
                          value={neighborhood}
                          onChange={(e) => setNeighborhood(e.target.value)}
                        />
                      </div>

                      {/* City & State */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                          <Label htmlFor="city">Cidade *</Label>
                          <Input
                            id="city"
                            required
                            placeholder="Preenchido pelo CEP"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="state">Estado *</Label>
                          <Input
                            id="state"
                            required
                            placeholder="UF"
                            value={state}
                            onChange={(e) => setState(e.target.value.toUpperCase())}
                            maxLength={2}
                          />
                        </div>
                      </div>

                      {/* Save address option (only for logged-in users) */}
                      {user && canAddMore && (useNewAddress || addresses.length === 0) && (
                        <div className="space-y-3 pt-2 border-t border-border">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="saveAddress"
                              checked={saveNewAddress}
                              onCheckedChange={(checked) => setSaveNewAddress(checked === true)}
                            />
                            <Label htmlFor="saveAddress" className="text-sm font-normal cursor-pointer">
                              Salvar este endereço no meu perfil
                            </Label>
                          </div>
                          {saveNewAddress && (
                            <div>
                              <Label htmlFor="addressLabel">Nome do endereço *</Label>
                              <Input
                                id="addressLabel"
                                required={saveNewAddress}
                                placeholder="Ex: Casa, Trabalho"
                                value={addressLabel}
                                onChange={(e) => setAddressLabel(e.target.value)}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>

              {/* Payment Gateway Selection */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Escolha como pagar
                </h2>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Pagamento 100% seguro
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Stripe Button */}
                  <Button
                    type="button"
                    size="lg"
                    onClick={handleStripeCheckout}
                    disabled={isProcessing}
                    className="h-auto py-4 flex flex-col items-center gap-2 bg-[#635BFF] hover:bg-[#5046e5] text-white"
                  >
                    {isProcessingStripe ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm">Redirecionando...</span>
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-6 w-6" />
                        <span className="font-semibold">Pagar com Stripe</span>
                        <span className="text-xs opacity-80">Cartão</span>
                      </>
                    )}
                  </Button>

                  {/* Mercado Pago Button */}
                  <Button
                    type="button"
                    size="lg"
                    onClick={handleMercadoPagoCheckout}
                    disabled={isProcessing}
                    className="h-auto py-4 flex flex-col items-center gap-2 bg-[#009EE3] hover:bg-[#007eb8] text-white"
                  >
                    {isProcessingMercadoPago ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm">Redirecionando...</span>
                      </>
                    ) : (
                      <>
                        <QrCode className="h-6 w-6" />
                        <span className="font-semibold">Pagar com Mercado Pago</span>
                        <span className="text-xs opacity-80">Cartão, Pix e Boleto</span>
                      </>
                    )}
                  </Button>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  Você será redirecionado para o gateway de pagamento escolhido
                </p>
              </div>
            </form>
          </div>

          {/* Order Summary */}
          <div>
            <div className="bg-card rounded-xl border border-border p-6 sticky top-24">
              <h2 className="text-xl font-semibold mb-6">Resumo do Pedido</h2>

              <div className="space-y-4 mb-6">
                {items.map((item, index) => {
                  const itemKey = `${item.id}-${item.size || ""}-${item.color || ""}-${item.model || ""}-${index}`;
                  return (
                    <div key={itemKey} className="flex gap-4">
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.name}</p>
                        {(item.color || item.model) && (
                          <p className="text-xs text-muted-foreground">
                            {item.color && `Cor: ${item.color}`}
                            {item.color && item.model && " | "}
                            {item.model && `Modelo: ${item.model}`}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Qtd: {item.quantity} × {formatPrice(item.price)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Coupon Field */}
              <div className="border-t border-border pt-4 mb-4">
                <Label className="text-sm font-medium mb-2 block">Cupom de Desconto</Label>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2">
                      <Ticket className="h-4 w-4 text-primary" />
                      <span className="font-mono font-medium text-sm">{appliedCoupon.code}</span>
                      <span className="text-xs text-primary">-{appliedCoupon.discount_percent}%</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={removeCoupon}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite o código"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => validateCoupon(couponCode)}
                      disabled={isValidating || !couponCode}
                    >
                      {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aplicar"}
                    </Button>
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{formatPrice(total)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-sm text-primary">
                    <span>Desconto ({appliedCoupon.discount_percent}%)</span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Frete</span>
                  <span>
                    {shipping === 0 ? (
                      <span className="text-primary font-medium">Grátis</span>
                    ) : (
                      formatPrice(shipping)
                    )}
                  </span>
                </div>
                {shipping > 0 && total < settings.free_shipping_threshold && (
                  <p className="text-xs text-muted-foreground">
                    Faltam {formatPrice(settings.free_shipping_threshold - total)} para frete grátis!
                  </p>
                )}
                <div className="flex justify-between font-semibold text-lg pt-2 border-t border-border">
                  <span>Total</span>
                  <span>{formatPrice(finalTotal)}</span>
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
