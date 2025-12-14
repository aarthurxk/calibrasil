import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Truck, Clock, MapPin, Package, CheckCircle, AlertCircle, ArrowRight, MessageCircle } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";
const Shipping = () => {
  const {
    settings
  } = useStoreSettings();
  const deliveryMinDays = settings?.delivery_min_days || 5;
  const deliveryMaxDays = settings?.delivery_max_days || 10;
  const freeShippingThreshold = settings?.free_shipping_threshold || 250;
  const regions = [{
    name: "Sul e Sudeste",
    days: "5 a 8 dias úteis"
  }, {
    name: "Centro-Oeste",
    days: "6 a 10 dias úteis"
  }, {
    name: "Nordeste",
    days: "5 a 8 dias úteis"
  }, {
    name: "Norte",
    days: "8 a 12 dias úteis"
  }];
  const trackingSteps = [{
    icon: Package,
    title: "Pedido Confirmado",
    description: "Recebemos seu pagamento e separamos seu pedido."
  }, {
    icon: Truck,
    title: "Em Trânsito",
    description: "Seu pedido foi postado e está a caminho."
  }, {
    icon: MapPin,
    title: "Saiu para Entrega",
    description: "Seu pedido está com o entregador na sua região."
  }, {
    icon: CheckCircle,
    title: "Entregue",
    description: "Pedido entregue! Hora de curtir sua nova capa."
  }];
  return <MainLayout>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-accent/5 to-background py-20 md:py-28">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 animate-fade-in">
            Entrega
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in">
            Enviamos pra todo o Brasil! Sua capa chega rapidinho e com todo cuidado 
            pra você começar a usar.
          </p>
        </div>
      </section>

      {/* Prazo de Entrega */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  Prazo de Entrega
                </h2>
              </div>
              <p className="text-muted-foreground mb-6">
                O prazo de entrega varia de acordo com a sua região. Em média, nossos produtos 
                chegam entre <strong>{deliveryMinDays} a {deliveryMaxDays} dias úteis</strong> após 
                a confirmação do pagamento.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Prazo começa após confirmação do pagamento</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Pix: processamento em até 24h</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Pedidos feitos antes das 14h são postados até o próximo dia útil</span>
                </li>
              </ul>
            </div>
            <Card className="border-primary/20">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-5xl font-bold text-primary mb-2">
                    {deliveryMinDays} - {deliveryMaxDays}
                  </div>
                  <div className="text-xl font-semibold text-foreground mb-2">dias úteis</div>
                  <p className="text-muted-foreground">
                    prazo médio de entrega para todo o Brasil
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Frete Grátis */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Truck className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Frete Grátis
            </h2>
            <p className="text-muted-foreground mb-6">
              Nas compras acima de <strong className="text-primary">R$ {freeShippingThreshold.toFixed(2).replace('.', ',')}</strong>, 
              o frete é por nossa conta! Válido para todo o Brasil.
            </p>
            <Button asChild>
              <Link to="/shop">
                Ir para a Loja
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Prazos por Região */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Prazos Estimados por Região
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Os prazos podem variar de acordo com a disponibilidade da transportadora 
              e localidade exata de entrega.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {regions.map((region, index) => <Card key={index} className="border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{region.name}</h3>
                  <p className="text-primary font-medium">{region.days}</p>
                </CardContent>
              </Card>)}
          </div>
          <div className="mt-8 p-4 bg-accent/10 rounded-lg border border-accent/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                <strong>Atenção:</strong> Prazos em dias úteis. Não contam finais de semana e feriados. 
                O prazo começa a contar após a confirmação do pagamento.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Rastreamento */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Acompanhe seu Pedido
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Assim que seu pedido for postado, você receberá o código de rastreio por e-mail. 
              Acompanhe cada etapa até a entrega!
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {trackingSteps.map((step, index) => <div key={index} className="relative">
                <Card className="h-full border-border/50">
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                      <step.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
                {index < trackingSteps.length - 1 && <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-6 h-6 text-muted-foreground/50" />
                  </div>}
              </div>)}
          </div>
        </div>
      </section>

      {/* Problemas na Entrega */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Problemas com a Entrega?
              </h2>
            </div>
            <Card className="border-border/50">
              <CardContent className="p-6 md:p-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Se o prazo já passou:</h3>
                    <p className="text-muted-foreground">
                      Aguarde até 3 dias úteis após o prazo estimado. Em períodos de alta demanda 
                      (Black Friday, Natal), pode haver pequenos atrasos.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Endereço incorreto:</h3>
                    <p className="text-muted-foreground">
                      Informe imediatamente após a compra se precisar alterar o endereço. 
                      Após a postagem, não conseguimos modificar o destino.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">Pedido extraviado:</h3>
                    <p className="text-muted-foreground">
                      Caso o rastreamento indique problemas ou o pedido não chegue, entre em contato. 
                      Reenviamos ou reembolsamos integralmente.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 via-accent/5 to-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Dúvidas sobre sua Entrega?
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Fala com a gente! Estamos aqui pra te ajudar a acompanhar seu pedido.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg">
              <a href="https://wa.me/5581994446464?text=Oi%20Cali!%20Preciso%20de%20ajuda%20com%20minha%20entrega" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 w-5 h-5" />
                Falar no WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/shop">
                Continuar Comprando
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </MainLayout>;
};
export default Shipping;