import { Leaf, Shield, Truck, Headphones } from "lucide-react";

const features = [
  {
    icon: Leaf,
    title: "Sustentável",
    description: "Materiais eco-friendly e entrega carbono neutro. A gente ama o planeta!",
  },
  {
    icon: Shield,
    title: "Garantia",
    description: "Cobertura total nos produtos tech. Pode usar sem medo!",
  },
  {
    icon: Truck,
    title: "Frete Grátis",
    description: "Acima de R$250, entrega em todo Brasil. É mole ou quer mais?",
  },
  {
    icon: Headphones,
    title: "Suporte",
    description: "Tamo junto sempre que você precisar. É só chamar!",
  },
];

const WhyChooseUs = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-accent uppercase tracking-widest mb-2">Por que a Cali?</p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">Feito pra Vida na Praia</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-6 rounded-xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-soft animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-lg bg-cali-teal-light flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-card-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
