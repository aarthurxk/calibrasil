import { Leaf, Shield, Truck, Headphones } from 'lucide-react';

const features = [
  {
    icon: Leaf,
    title: 'Sustainable',
    description: 'Eco-friendly materials and carbon-neutral shipping',
  },
  {
    icon: Shield,
    title: '2-Year Warranty',
    description: 'Full coverage on all tech products',
  },
  {
    icon: Truck,
    title: 'Free Shipping',
    description: 'On orders over $75, worldwide delivery',
  },
  {
    icon: Headphones,
    title: '24/7 Support',
    description: 'Expert help whenever you need it',
  },
];

const WhyChooseUs = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-accent uppercase tracking-widest mb-2">
            Why Cali?
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Built for the Beach Life
          </h2>
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
              <h3 className="font-semibold text-card-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
