import MainLayout from "@/components/layout/MainLayout";
import { Mail, Phone, MapPin, Clock, Instagram, Facebook, MessageCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import kioskImage from "@/assets/contact/kiosk-riomar.jpg";
const Contact = () => {
  const contactCards = [
    {
      icon: Mail,
      title: "E-mail",
      info: "contato@calibrasil.com.br",
      link: "mailto:contato@calibrasil.com.br",
      description: "Resposta em até 24h",
    },
    {
      icon: MessageCircle,
      title: "WhatsApp",
      info: "(81) 99444-6464",
      link: "https://wa.me/5581994446464?text=Oi%20Cali!%20Vim%20pelo%20site",
      description: "Atendimento rápido",
    },
    {
      icon: Instagram,
      title: "Instagram",
      info: "@cali.brasil",
      link: "https://instagram.com/cali.brasil",
      description: "Segue a gente!",
    },
    {
      icon: Facebook,
      title: "Facebook",
      info: "/calibrasil",
      link: "https://facebook.com/calibrasil",
      description: "Curte nossa página",
    },
  ];
  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-accent/5 to-background py-20 md:py-28">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 animate-fade-in">
            Fala com a Gente
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in">
            Tá com dúvida, quer fechar parceria ou só dar um oi? A gente tá sempre ligado pra trocar uma ideia com você.
            Pode chegar!
          </p>
        </div>
      </section>

      {/* Contact Cards Section */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-12">
            Escolhe o Canal que Tu Prefere
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactCards.map((card, index) => (
              <a key={index} href={card.link} target="_blank" rel="noopener noreferrer" className="group">
                <Card className="h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1 border-border/50 hover:border-primary/30">
                  <CardContent className="p-6 text-center">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <card.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">{card.title}</h3>
                    <p className="text-primary font-medium mb-2">{card.info}</p>
                    <p className="text-sm text-muted-foreground">{card.description}</p>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Kiosk Section */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            {/* Text Content */}
            <div className="order-2 lg:order-1">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6">Cola Lá no Nosso Point! 📍</h2>
              <p className="text-muted-foreground mb-8">
                Vem conhecer os produtos de perto, experimentar e trocar aquela ideia com a galera. Te esperamos no
                nosso quiosque!
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Endereço</h3>
                    <p className="text-muted-foreground">
                      Av. República do Líbano, 251
                      <br />
                      Shopping RioMar — Piso L1
                      <br />
                      Próximo ao O Boticário
                      <br />
                      Recife, PE
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Horário de Funcionamento</h3>
                    <p className="text-muted-foreground">
                      Segunda a Sábado: 09h às 22h Domingos e Feriados: 12h às 21h
                      <br />
                      Domingos e Feriados: 14h às 20h
                    </p>
                  </div>
                </div>
              </div>

              <Button asChild className="mt-8">
                <a href="https://maps.google.com/?q=Shopping+RioMar+Recife" target="_blank" rel="noopener noreferrer">
                  Ver no Google Maps
                  <ArrowRight className="ml-2 w-4 h-4" />
                </a>
              </Button>
            </div>

            {/* Image */}
            <div className="order-1 lg:order-2">
              <div className="relative rounded-2xl overflow-hidden shadow-xl">
                <img
                  src={kioskImage}
                  alt="Quiosque Cali Brasil no Shopping RioMar"
                  className="w-full h-auto object-cover aspect-[4/3]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 via-accent/5 to-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">A Gente Vibra Melhor Junto</h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Conecta com a Cali e fica por dentro de tudo que rola — lançamentos, promos e muito mais!
          </p>

          <div className="flex items-center justify-center gap-4 mb-10">
            <a
              href="https://instagram.com/cali.brasil"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
            >
              <Instagram className="w-6 h-6 text-primary" />
            </a>
            <a
              href="https://wa.me/5581999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
            >
              <MessageCircle className="w-6 h-6 text-primary" />
            </a>
            <a
              href="https://facebook.com/calibrasil"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
            >
              <Facebook className="w-6 h-6 text-primary" />
            </a>
          </div>

          <Button asChild size="lg">
            <Link to="/shop">
              Bora pra Loja
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        </div>
      </section>
    </MainLayout>
  );
};
export default Contact;
