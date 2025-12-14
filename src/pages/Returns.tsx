import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  RefreshCw, 
  Package, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  MessageCircle,
  ArrowRight,
  Shield,
  Truck
} from "lucide-react";

const Returns = () => {
  const conditions = [
    "Produto sem sinais de uso (arranhões, deformações)",
    "Película protetora intacta (se houver)",
    "Embalagem original em bom estado",
    "Nota fiscal ou comprovante de compra",
  ];

  const steps = [
    {
      number: "1",
      title: "Entre em Contato",
      description: "Fale com a gente pelo WhatsApp ou e-mail informando o número do pedido e o motivo da troca/devolução.",
    },
    {
      number: "2",
      title: "Aguarde a Aprovação",
      description: "Nossa equipe vai analisar seu pedido e te enviar as instruções de envio em até 48h.",
    },
    {
      number: "3",
      title: "Envie o Produto",
      description: "Embale o produto com cuidado e envie pelos Correios. O código de postagem será enviado por e-mail.",
    },
    {
      number: "4",
      title: "Receba seu Reembolso",
      description: "Após recebermos e analisarmos o produto, processamos o reembolso ou envio do novo item.",
    },
  ];

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-accent/5 to-background py-20 md:py-28">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 animate-fade-in">
            Trocas e Devoluções
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in">
            Comprou e não curtiu? Relaxa! A gente resolve. Aqui na Cali, você compra com total segurança 
            e tranquilidade, sempre dentro do Código de Defesa do Consumidor.
          </p>
        </div>
      </section>

      {/* Direito de Arrependimento */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  Direito de Arrependimento
                </h2>
              </div>
              <p className="text-muted-foreground mb-6">
                Conforme o <strong>Artigo 49 do Código de Defesa do Consumidor</strong>, você tem até 
                <strong> 7 dias corridos</strong> após o recebimento do produto para desistir da compra, 
                sem precisar justificar o motivo.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Produto não precisa ter defeito</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Reembolso integral, incluindo o frete</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Frete de devolução por nossa conta</span>
                </li>
              </ul>
            </div>
            <Card className="border-primary/20">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-6xl font-bold text-primary mb-2">7</div>
                  <div className="text-xl font-semibold text-foreground mb-2">dias corridos</div>
                  <p className="text-muted-foreground">
                    para desistir da compra após o recebimento
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Troca por Defeito */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <Card className="border-primary/20 order-2 lg:order-1">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-6xl font-bold text-primary mb-2">30</div>
                  <div className="text-xl font-semibold text-foreground mb-2">dias corridos</div>
                  <p className="text-muted-foreground">
                    para reclamar de produtos com defeito
                  </p>
                </div>
              </CardContent>
            </Card>
            <div className="order-1 lg:order-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <RefreshCw className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  Troca por Defeito
                </h2>
              </div>
              <p className="text-muted-foreground mb-6">
                Conforme o <strong>Artigo 18 do Código de Defesa do Consumidor</strong>, você tem até 
                <strong> 30 dias corridos</strong> para reclamar de produtos com defeito aparente.
              </p>
              <p className="text-muted-foreground mb-4">Você pode escolher entre:</p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Substituição do produto por outro igual</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Reembolso integral do valor pago</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">Abatimento proporcional do preço</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Condições para Troca/Devolução */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Condições para Troca ou Devolução
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Para garantir um processo tranquilo, o produto precisa estar nas seguintes condições:
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {conditions.map((condition, index) => (
              <Card key={index} className="border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <Package className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-muted-foreground">{condition}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="mt-8 p-4 bg-accent/10 rounded-lg border border-accent/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                <strong>Importante:</strong> Capas com sinais de uso, arranhões, deformações ou sem a embalagem 
                original não poderão ser devolvidas pelo direito de arrependimento.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Como Solicitar */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Como Solicitar sua Troca ou Devolução
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Processo simples e rápido. Siga os passos abaixo:
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <Card className="h-full border-border/50">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg mb-4">
                      {step.number}
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                    <ArrowRight className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Prazos e Custos */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Prazos e Custos
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Truck className="w-6 h-6 text-primary" />
                  <h3 className="font-semibold text-foreground">Frete de Devolução</h3>
                </div>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span><strong>Arrependimento:</strong> Frete pago pela Cali</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span><strong>Defeito:</strong> Frete pago pela Cali</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="w-6 h-6 text-primary" />
                  <h3 className="font-semibold text-foreground">Prazo de Reembolso</h3>
                </div>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span><strong>Cartão de crédito:</strong> Até 2 faturas após a devolução</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span><strong>Pix:</strong> Até 7 dias úteis após recebimento</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 via-accent/5 to-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Precisa de Ajuda?
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Nossa equipe tá pronta pra te ajudar. Chama no WhatsApp que a gente resolve!
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg">
              <a 
                href="https://wa.me/5581994446464?text=Oi%20Cali!%20Preciso%20de%20ajuda%20com%20troca%20ou%20devolução" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <MessageCircle className="mr-2 w-5 h-5" />
                Falar no WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/contact">
                Outras formas de contato
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default Returns;
