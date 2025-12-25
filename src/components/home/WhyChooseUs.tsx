import { Leaf, Shield, Truck, Headphones } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const features = [
  {
    icon: Leaf,
    title: "Sustentável",
    description: "Materiais eco-friendly e entrega carbono neutro. A gente ama o planeta!",
    iconAnimation: "group-hover:rotate-12",
  },
  {
    icon: Shield,
    title: "Garantia",
    description: "Cobertura total nos produtos tech. Pode usar sem medo!",
    iconAnimation: "group-hover:scale-110",
  },
  {
    icon: Truck,
    title: "Frete Grátis",
    description: "Acima de R$250, entrega em todo Brasil. É mole ou quer mais?",
    iconAnimation: "group-hover:translate-x-1",
  },
  {
    icon: Headphones,
    title: "Suporte",
    description: "Tamo junto sempre que você precisar. É só chamar!",
    iconAnimation: "group-hover:animate-bounce-subtle",
  },
];

const WhyChooseUs = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  return (
    <section className="py-20 bg-background" ref={ref as React.RefObject<HTMLElement>}>
      <div className="container">
        <div
          className={`text-center mb-12 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <p className="text-sm font-medium text-accent uppercase tracking-widest mb-2">
            Por que a Cali?
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Feito pra Vida na Praia
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`group p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-500 hover:shadow-glow hover:-translate-y-2 cursor-default ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{
                transitionDelay: isVisible ? `${200 + index * 100}ms` : "0ms",
              }}
            >
              <div
                className={`w-12 h-12 rounded-lg bg-cali-teal-light flex items-center justify-center mb-4 transition-all duration-300 ${feature.iconAnimation}`}
              >
                <feature.icon className="h-6 w-6 text-primary transition-colors" />
              </div>
              <h3 className="font-semibold text-card-foreground mb-2 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
