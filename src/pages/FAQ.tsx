import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ShoppingBag, CreditCard, Package, Truck, RefreshCw, MessageCircle, ArrowRight } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";

const FAQ = () => {
  const { settings } = useStoreSettings();

  const deliveryMinDays = settings?.delivery_min_days || 5;
  const deliveryMaxDays = settings?.delivery_max_days || 10;
  const freeShippingThreshold = settings?.free_shipping_threshold || 250;

  const faqCategories = [
    {
      icon: ShoppingBag,
      title: "Pedidos",
      questions: [
        {
          question: "Como acompanho meu pedido?",
          answer:
            "Assim que seu pedido for postado, você receberá um e-mail com o código de rastreio. Também é possível acompanhar na página 'Meus Pedidos' se você tiver uma conta.",
        },
        {
          question: "Posso cancelar meu pedido?",
          answer:
            "Sim! Se o pedido ainda não foi enviado, entre em contato pelo WhatsApp que cancelamos e estornamos o valor. Após o envio, você pode devolver o produto em até 7 dias após o recebimento.",
        },
        {
          question: "Posso alterar o endereço de entrega?",
          answer:
            "Sim, desde que o pedido ainda não tenha sido postado. Entre em contato imediatamente pelo WhatsApp com o novo endereço. Após a postagem, não é possível alterar o destino.",
        },
        {
          question: "Quanto tempo demora para processar meu pedido?",
          answer:
            "Pedidos pagos até às 14h são enviados até no próximo dia útil. Pagamentos via Pix são confirmados em minutos. Cartão de crédito pode levar até 24h para aprovação.",
        },
      ],
    },
    {
      icon: CreditCard,
      title: "Pagamento",
      questions: [
        {
          question: "Quais formas de pagamento são aceitas?",
          answer:
            "Aceitamos cartão de crédito (todas as bandeiras), cartão de débito e Pix. Pagamentos via Pix são confirmados instantaneamente.",
        },
        {
          question: "O Pix é seguro?",
          answer:
            "Sim! O Pix é regulamentado pelo Banco Central e é tão seguro quanto qualquer outra forma de pagamento. Usamos gateways de pagamento certificados (Stripe) para processar todas as transações.",
        },
        {
          question: "Posso parcelar minha compra?",
          answer:
            "Sim! Compras acima de R$ 100 podem ser parceladas em até 3x, e compras acima de R$ 200 em até 6x sem juros no cartão de crédito.",
        },
        {
          question: "Quando meu cartão será cobrado?",
          answer:
            "A cobrança é feita no momento da finalização do pedido. Em caso de cancelamento, o estorno é feito em até 2 faturas do cartão.",
        },
      ],
    },
    {
      icon: Package,
      title: "Produtos",
      questions: [
        {
          question: "A capa serve no meu celular?",
          answer:
            "Na página de cada produto, você pode selecionar o modelo do seu celular. Nossas capas são feitas sob medida para cada modelo específico, garantindo encaixe perfeito.",
        },
        {
          question: "As cores são exatamente como nas fotos?",
          answer:
            "Fazemos o máximo para que as fotos representem fielmente os produtos. Pequenas variações podem ocorrer devido a configurações de tela, mas garantimos a qualidade das cores.",
        },
        {
          question: "As capas protegem contra quedas?",
          answer:
            "Sim! Nossas capas oferecem proteção contra quedas do dia a dia, arranhões e impactos leves. Elas possuem bordas elevadas para proteger a tela e câmera.",
        },
        {
          question: "Qual o material das capas?",
          answer:
            "Utilizamos materiais de alta qualidade, desde palha de trigo natural, como silicone premium, TPU flexível e policarbonato rígido, dependendo do modelo. Todos são duráveis, resistentes e agradáveis ao toque.",
        },
      ],
    },
    {
      icon: Truck,
      title: "Entrega",
      questions: [
        {
          question: "Para onde vocês entregam?",
          answer: "Entregamos para todo o Brasil! Seja qual for sua cidade, levamos sua capa até você.",
        },
        {
          question: "Qual o prazo de entrega?",
          answer: `O prazo médio é de ${deliveryMinDays} a ${deliveryMaxDays} dias úteis após a confirmação do pagamento. O prazo pode variar de acordo com sua região.`,
        },
        {
          question: "O frete é grátis?",
          answer: `Sim! Para compras acima de R$ ${freeShippingThreshold.toFixed(2).replace(".", ",")}, o frete é grátis para todo o Brasil.`,
        },
        {
          question: "Como funciona o rastreamento?",
          answer:
            "Após a postagem, você recebe um e-mail com o código de rastreio dos Correios. Com ele, você acompanha cada etapa da entrega em tempo real.",
        },
      ],
    },
    {
      icon: RefreshCw,
      title: "Trocas e Devoluções",
      questions: [
        {
          question: "Posso devolver se não gostar?",
          answer:
            "Sim! Você tem até 7 dias corridos após o recebimento para devolver o produto, mesmo sem defeito. É seu direito garantido pelo Código de Defesa do Consumidor.",
        },
        {
          question: "Como faço para trocar um produto?",
          answer:
            "Entre em contato pelo WhatsApp informando o número do pedido e o motivo da troca. Nossa equipe vai te orientar sobre o processo de envio e troca.",
        },
        {
          question: "Quem paga o frete da devolução?",
          answer:
            "Se for devolução por arrependimento ou defeito do produto, nós pagamos o frete de devolução. Você só precisa ir até uma agência dos Correios.",
        },
        {
          question: "Qual o prazo para solicitar troca?",
          answer:
            "Para arrependimento: 7 dias corridos após o recebimento. Para produtos com defeito: 30 dias corridos. O produto deve estar sem uso e na embalagem original.",
        },
      ],
    },
  ];

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary/10 via-accent/5 to-background py-20 md:py-28">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 animate-fade-in">
            Dúvidas Frequentes
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in">
            Tá com dúvida? A gente responde! Aqui você encontra as respostas para as perguntas mais comuns sobre nossos
            produtos e serviços.
          </p>
        </div>
      </section>

      {/* FAQ Categories */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto space-y-12">
            {faqCategories.map((category, categoryIndex) => (
              <div key={categoryIndex}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <category.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-foreground">{category.title}</h2>
                </div>
                <Accordion type="single" collapsible className="space-y-2">
                  {category.questions.map((item, index) => (
                    <AccordionItem
                      key={index}
                      value={`${categoryIndex}-${index}`}
                      className="border border-border/50 rounded-lg px-4 data-[state=open]:border-primary/30"
                    >
                      <AccordionTrigger className="text-left hover:no-underline py-4">
                        <span className="font-medium text-foreground">{item.question}</span>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pb-4">{item.answer}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 via-accent/5 to-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Não Encontrou sua Resposta?</h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Sem problemas! Manda uma mensagem pra gente que a equipe Cali te ajuda.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg">
              <a
                href="https://wa.me/5581994446464?text=Oi%20Cali!%20Tenho%20uma%20dúvida"
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="mr-2 w-5 h-5" />
                Falar no WhatsApp
              </a>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/contact">
                Mais formas de contato
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </MainLayout>
  );
};

export default FAQ;
