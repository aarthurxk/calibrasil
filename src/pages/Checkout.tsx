import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/hooks/useAuth";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useUserAddresses, UserAddress } from "@/hooks/useUserAddresses";
import { useCoupon } from "@/hooks/useCoupon";
import { useSeller } from "@/hooks/useSeller";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import CustomerForm from "@/components/checkout/CustomerForm";
import DeliveryMethodCards, { ShippingOption } from "@/components/checkout/DeliveryMethodCards";
import AddressForm from "@/components/checkout/AddressForm";
import PaymentOptions from "@/components/checkout/PaymentOptions";
import OrderSummary from "@/components/checkout/OrderSummary";
import MobileBottomBar from "@/components/checkout/MobileBottomBar";

// Validation regex patterns
const brazilianPhoneRegex = /^\(\d{2}\)\s?\d{4,5}-\d{4}$/;
const cepRegex = /^\d{5}-?\d{3}$/;
const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;

interface FieldErrors {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  zip?: string;
  street?: string;
  houseNumber?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

const formatPhone = (phone: string): string => {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  } else if (digits.length === 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }
  return phone;
};

const Checkout = () => {
  const { items, total } = useCart();
  const isRedirecting = useRef(false);
  const { user } = useAuth();
  const { settings } = useStoreSettings();
  const { addresses, isLoading: isLoadingAddresses, addAddress, canAddMore } = useUserAddresses();
  const { appliedCoupon, isValidating, validateCoupon, removeCoupon, discountAmount } = useCoupon(total);
  const { appliedSeller, isValidating: isValidatingSeller, validateSeller, removeSeller, sellerDiscount } = useSeller(total);
  
  const [isProcessingStripe, setIsProcessingStripe] = useState(false);
  const [isProcessingMercadoPago, setIsProcessingMercadoPago] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [sellerCode, setSellerCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
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
  const isPickup = selectedShipping?.service === "pickup";
  const shipping = selectedShipping?.price ?? 0;
  const totalAfterCouponDiscount = total - discountAmount;
  const totalAfterSellerDiscount = totalAfterCouponDiscount - sellerDiscount;
  const finalTotal = totalAfterSellerDiscount + shipping;

  // Auto-fill contact info from user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      setEmail(user.email || "");
      const { data } = await supabase.from("profiles").select("full_name, phone").eq("user_id", user.id).single();
      if (data) {
        if (data.full_name) {
          const nameParts = data.full_name.trim().split(" ");
          setFirstName(nameParts[0] || "");
          setLastName(nameParts.slice(1).join(" ") || "");
        }
        if (data.phone) setPhone(formatPhone(data.phone));
      }
    };
    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId && !useNewAddress) {
      const defaultAddr = addresses.find((a) => a.is_default) || addresses[0];
      setSelectedAddressId(defaultAddr.id);
      fillFormFromAddress(defaultAddr);
    }
  }, [addresses]);

  useEffect(() => {
    if (user && addresses.length === 0 && !isLoadingAddresses) setSaveNewAddress(true);
  }, [user, addresses, isLoadingAddresses]);

  useEffect(() => {
    if (isPickup) {
      setFieldErrors((prev) => ({ ...prev, zip: undefined, street: undefined, houseNumber: undefined, neighborhood: undefined, city: undefined, state: undefined }));
    }
  }, [isPickup]);

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
    setZip(""); setStreet(""); setHouseNumber(""); setComplement(""); setNeighborhood(""); setCity(""); setState("");
  };

  const fetchAddressByCep = async (cep: string) => {
    const cepNumbers = cep.replace(/\D/g, "");
    if (cepNumbers.length !== 8) return;
    setIsLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepNumbers}/json/`);
      const data = await response.json();
      if (data.erro) { toast.error("CEP não encontrado"); return; }
      setStreet(data.logradouro || "");
      setNeighborhood(data.bairro || "");
      setCity(data.localidade || "");
      setState(data.uf || "");
    } catch { toast.error("Erro ao buscar CEP"); }
    finally { setIsLoadingCep(false); }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value.replace(/\D/g, "");
    const formatado = valor.replace(/(\d{5})(\d{3})/, "$1-$2");
    setZip(formatado);
    if (fieldErrors.zip) setFieldErrors((prev) => ({ ...prev, zip: undefined }));
    if (valor.length === 8) fetchAddressByCep(valor);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 11);
    setPhone(formatPhone(digits));
    if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: undefined }));
  };

  const validateField = useCallback((field: keyof FieldErrors, value: string) => {
    const addressFields: (keyof FieldErrors)[] = ["zip", "street", "houseNumber", "neighborhood", "city", "state"];
    if (isPickup && addressFields.includes(field)) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
      return true;
    }
    let error: string | undefined;
    switch (field) {
      case "email": error = !value.trim() ? "Email é obrigatório" : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "Email inválido" : undefined; break;
      case "phone": error = !value.trim() ? "Telefone é obrigatório" : !brazilianPhoneRegex.test(value) ? "Telefone inválido" : undefined; break;
      case "firstName": error = !value.trim() ? "Nome é obrigatório" : value.trim().length < 2 ? "Nome muito curto" : !nameRegex.test(value) ? "Nome inválido" : undefined; break;
      case "lastName": error = !value.trim() ? "Sobrenome é obrigatório" : value.trim().length < 2 ? "Sobrenome muito curto" : !nameRegex.test(value) ? "Sobrenome inválido" : undefined; break;
      case "zip": error = !cepRegex.test(value) ? "CEP inválido" : undefined; break;
      case "street": error = value.trim().length < 3 ? "Rua é obrigatória" : undefined; break;
      case "houseNumber": error = !value.trim() ? "Número é obrigatório" : undefined; break;
      case "neighborhood": error = value.trim().length < 2 ? "Bairro é obrigatório" : undefined; break;
      case "city": error = value.trim().length < 2 ? "Cidade é obrigatória" : undefined; break;
      case "state": error = value.trim().length !== 2 ? "Estado deve ter 2 caracteres" : undefined; break;
    }
    setFieldErrors((prev) => ({ ...prev, [field]: error }));
    return !error;
  }, [isPickup]);

  const handleFieldBlur = (field: keyof FieldErrors, value: string) => validateField(field, value);

  const validateForm = () => {
    const errors: FieldErrors = {};
    let hasErrors = false;
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errors.email = !email.trim() ? "Email é obrigatório" : "Email inválido"; hasErrors = true; }
    if (!phone.trim() || !brazilianPhoneRegex.test(phone)) { errors.phone = !phone.trim() ? "Telefone é obrigatório" : "Telefone inválido"; hasErrors = true; }
    if (!firstName.trim() || firstName.trim().length < 2 || !nameRegex.test(firstName)) { errors.firstName = !firstName.trim() ? "Nome é obrigatório" : "Nome inválido"; hasErrors = true; }
    if (!lastName.trim() || lastName.trim().length < 2 || !nameRegex.test(lastName)) { errors.lastName = !lastName.trim() ? "Sobrenome é obrigatório" : "Sobrenome inválido"; hasErrors = true; }
    if (!isPickup) {
      if (!zip.trim() || !cepRegex.test(zip)) { errors.zip = "CEP inválido"; hasErrors = true; }
      if (!street.trim() || street.trim().length < 3) { errors.street = "Rua é obrigatória"; hasErrors = true; }
      if (!houseNumber.trim()) { errors.houseNumber = "Número é obrigatório"; hasErrors = true; }
      if (!neighborhood.trim() || neighborhood.trim().length < 2) { errors.neighborhood = "Bairro é obrigatório"; hasErrors = true; }
      if (!city.trim() || city.trim().length < 2) { errors.city = "Cidade é obrigatória"; hasErrors = true; }
      if (!state.trim() || state.trim().length !== 2) { errors.state = "Estado inválido"; hasErrors = true; }
    }
    setFieldErrors(errors);
    if (hasErrors) { const firstError = Object.values(errors).find((e) => e); if (firstError) toast.error(firstError); return false; }
    if (!selectedShipping && settings.shipping_mode !== "free") { toast.error("Selecione um método de entrega"); return false; }
    return true;
  };

  const saveAddressIfNeeded = async () => {
    if (user && !isPickup && (useNewAddress || addresses.length === 0) && saveNewAddress && canAddMore && addressLabel) {
      await addAddress({ label: addressLabel, zip, street, house_number: houseNumber, complement: complement || null, neighborhood, city, state, is_default: addresses.length === 0 });
    }
  };

  const getCheckoutPayload = () => ({
    items: items.map((item) => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity, image: item.image, size: item.size, color: item.color, model: item.model })),
    customerEmail: email, customerName: `${firstName} ${lastName}`, customerPhone: phone,
    shippingAddress: isPickup ? null : { street, houseNumber, complement: complement || null, neighborhood, city, state, zip },
    shippingCost: shipping, shippingMethod: selectedShipping?.service || "standard",
    couponCode: appliedCoupon?.code || null, sellerCode: appliedSeller?.code || null, user_id: user?.id || null,
  });

  const handleStripeCheckout = async () => {
    if (!validateForm()) return;
    setIsProcessingStripe(true);
    try {
      await saveAddressIfNeeded();
      const baseUrl = window.location.origin;
      const payload = getCheckoutPayload();
      const checkoutData = {
        items: payload.items, email: payload.customerEmail, phone: payload.customerPhone,
        shipping_address: isPickup ? { firstName, lastName, street: "Retirada na Loja", number: "", complement: settings.store_pickup_address || "", neighborhood: "", city: "", state: "", zip: "" }
          : { firstName, lastName, street: payload.shippingAddress?.street, number: payload.shippingAddress?.houseNumber, complement: payload.shippingAddress?.complement, neighborhood: payload.shippingAddress?.neighborhood, city: payload.shippingAddress?.city, state: payload.shippingAddress?.state, zip: payload.shippingAddress?.zip },
        user_id: payload.user_id, total: finalTotal, shipping, shipping_method: payload.shippingMethod, payment_method: "card",
        success_url: `${baseUrl}/order-confirmation`, cancel_url: `${baseUrl}/checkout`, coupon_code: payload.couponCode || "",
      };
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      // Use access token if available, otherwise use anon key for guest checkout
      // The Edge Function validates the request and enforces rate limiting
      const authHeader = accessToken ? `Bearer ${accessToken}` : `Bearer ${supabaseAnonKey}`;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
        method: "POST", 
        headers: { 
          "Content-Type": "application/json", 
          apikey: supabaseAnonKey, 
          Authorization: authHeader 
        },
        body: JSON.stringify(checkoutData),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Erro ao criar sessão Stripe");
      if (data.sessionUrl) { isRedirecting.current = true; window.location.href = data.sessionUrl; return; }
      throw new Error("URL de pagamento não recebida");
    } catch (error: any) {
      toast.error(error.message || "Erro ao processar pagamento");
      setIsProcessingStripe(false);
    }
  };

  const handleMercadoPagoCheckout = async () => {
    if (!validateForm()) return;
    setIsProcessingMercadoPago(true);
    try {
      await saveAddressIfNeeded();
      const baseUrl = window.location.origin;
      const payload = getCheckoutPayload();
      const checkoutData = {
        ...payload,
        shippingAddress: isPickup ? { street: "Retirada na Loja", houseNumber: "", complement: settings.store_pickup_address || "", neighborhood: "", city: "", state: "", zip: "" } : payload.shippingAddress,
        success_url: `${baseUrl}/order-confirmation`, cancel_url: `${baseUrl}/checkout`,
      };
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      // Use access token if available, otherwise use anon key for guest checkout
      // The Edge Function validates the request and enforces rate limiting
      const authHeader = accessToken ? `Bearer ${accessToken}` : `Bearer ${supabaseAnonKey}`;
      
      const response = await fetch(`${supabaseUrl}/functions/v1/create-mercadopago-checkout`, {
        method: "POST", 
        headers: { 
          "Content-Type": "application/json", 
          apikey: supabaseAnonKey, 
          Authorization: authHeader 
        },
        body: JSON.stringify(checkoutData),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Erro ao criar sessão Mercado Pago");
      if (data.url) { isRedirecting.current = true; window.location.href = data.url; return; }
      throw new Error("URL de pagamento não recebida");
    } catch (error: any) {
      toast.error(error.message || "Erro ao processar pagamento");
      setIsProcessingMercadoPago(false);
    }
  };

  const handleFinalize = () => {
    if (!validateForm()) return;
    // Scroll to payment section
    document.getElementById("payment-section")?.scrollIntoView({ behavior: "smooth" });
    toast.info("Escolha uma forma de pagamento para finalizar");
  };

  if (items.length === 0 && !isRedirecting.current) {
    return (
      <MainLayout>
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Sua sacola está vazia!</h1>
          <Link to="/shop"><Button>Continuar Comprando</Button></Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Mobile Summary Header */}
      <div className="lg:hidden">
        <OrderSummary
          items={items} total={total} shipping={shipping} finalTotal={finalTotal} discountAmount={discountAmount} sellerDiscount={sellerDiscount}
          appliedCoupon={appliedCoupon} appliedSeller={appliedSeller} selectedShipping={selectedShipping}
          couponCode={couponCode} sellerCode={sellerCode} isValidatingCoupon={isValidating} isValidatingSeller={isValidatingSeller}
          onCouponCodeChange={setCouponCode} onSellerCodeChange={setSellerCode} onValidateCoupon={() => validateCoupon(couponCode)} onValidateSeller={() => validateSeller(sellerCode)}
          onRemoveCoupon={removeCoupon} onRemoveSeller={removeSeller} isProcessing={isProcessing} onFinalize={handleFinalize} compact
        />
      </div>

      <div className="container py-6 lg:py-12 pb-32 lg:pb-12">
        <Link to="/cart" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para sacola
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 lg:gap-12">
          {/* Left Column - Form */}
          <div className="space-y-8">
            <h1 className="text-2xl lg:text-3xl font-bold">Finalizar Compra</h1>

            <CustomerForm
              firstName={firstName} lastName={lastName} email={email} phone={phone} fieldErrors={fieldErrors}
              onFirstNameChange={(v) => { setFirstName(v); if (fieldErrors.firstName) setFieldErrors((p) => ({ ...p, firstName: undefined })); }}
              onLastNameChange={(v) => { setLastName(v); if (fieldErrors.lastName) setFieldErrors((p) => ({ ...p, lastName: undefined })); }}
              onEmailChange={(v) => { setEmail(v); if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined })); }}
              onPhoneChange={handlePhoneChange} onFieldBlur={handleFieldBlur}
            />

            <DeliveryMethodCards selectedOption={selectedShipping} onSelectOption={setSelectedShipping} itemsTotal={total} initialCep={zip} onCepChange={setZip} />

            {!isPickup && (
              <AddressForm
                zip={zip} street={street} houseNumber={houseNumber} complement={complement} neighborhood={neighborhood} city={city} state={state}
                fieldErrors={fieldErrors} isLoadingCep={isLoadingCep} addresses={addresses} selectedAddressId={selectedAddressId} useNewAddress={useNewAddress}
                saveNewAddress={saveNewAddress} addressLabel={addressLabel} canAddMore={canAddMore} user={user}
                onZipChange={handleCepChange}
                onStreetChange={(v) => { setStreet(v); if (fieldErrors.street) setFieldErrors((p) => ({ ...p, street: undefined })); }}
                onHouseNumberChange={(v) => { setHouseNumber(v); if (fieldErrors.houseNumber) setFieldErrors((p) => ({ ...p, houseNumber: undefined })); }}
                onComplementChange={setComplement}
                onNeighborhoodChange={(v) => { setNeighborhood(v); if (fieldErrors.neighborhood) setFieldErrors((p) => ({ ...p, neighborhood: undefined })); }}
                onCityChange={(v) => { setCity(v); if (fieldErrors.city) setFieldErrors((p) => ({ ...p, city: undefined })); }}
                onStateChange={(v) => { setState(v); if (fieldErrors.state) setFieldErrors((p) => ({ ...p, state: undefined })); }}
                onFieldBlur={handleFieldBlur} onSelectAddress={handleSelectAddress} onUseNewAddress={handleUseNewAddress}
                onSaveNewAddressChange={setSaveNewAddress} onAddressLabelChange={setAddressLabel}
              />
            )}

            <div id="payment-section">
              <PaymentOptions
                isProcessingStripe={isProcessingStripe} isProcessingMercadoPago={isProcessingMercadoPago} isProcessing={isProcessing}
                onStripeClick={handleStripeCheckout} onMercadoPagoClick={handleMercadoPagoCheckout}
              />
            </div>
          </div>

          {/* Right Column - Summary (Desktop only) */}
          <div className="hidden lg:block">
            <OrderSummary
              items={items} total={total} shipping={shipping} finalTotal={finalTotal} discountAmount={discountAmount} sellerDiscount={sellerDiscount}
              appliedCoupon={appliedCoupon} appliedSeller={appliedSeller} selectedShipping={selectedShipping}
              couponCode={couponCode} sellerCode={sellerCode} isValidatingCoupon={isValidating} isValidatingSeller={isValidatingSeller}
              onCouponCodeChange={setCouponCode} onSellerCodeChange={setSellerCode} onValidateCoupon={() => validateCoupon(couponCode)} onValidateSeller={() => validateSeller(sellerCode)}
              onRemoveCoupon={removeCoupon} onRemoveSeller={removeSeller} isProcessing={isProcessing} onFinalize={handleFinalize}
            />
          </div>
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      <MobileBottomBar finalTotal={finalTotal} isProcessing={isProcessing} onFinalize={handleFinalize} />
    </MainLayout>
  );
};

export default Checkout;
