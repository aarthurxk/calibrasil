import { Link } from 'react-router-dom';
import { Cpu, Backpack, ArrowRight } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

const categories = [
  {
    name: 'Tech da Hora',
    description: 'Gadgets espertos pra vida na praia',
    icon: Cpu,
    path: '/shop?category=tech',
    gradient: 'bg-gradient-ocean',
  },
  {
    name: 'Acessórios Irados',
    description: 'O combo perfeito pro seu rolê praiano',
    icon: Backpack,
    path: '/shop?category=acessórios',
    gradient: 'bg-gradient-sunset',
  },
];

const Categories = () => {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.2 });

  return (
    <section className="py-20 bg-muted" ref={ref as React.RefObject<HTMLElement>}>
      <div className="container">
        <div
          className={`text-center mb-12 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <p className="text-sm font-medium text-accent uppercase tracking-widest mb-2">
            Escolhe tua Vibe
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Nossas Coleções 🏄
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {categories.map((category, index) => (
            <Link
              key={category.name}
              to={category.path}
              className={`group relative overflow-hidden rounded-2xl p-8 transition-all duration-500 hover:-translate-y-3 hover:shadow-glow ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{
                transitionDelay: isVisible ? `${200 + index * 150}ms` : '0ms',
              }}
            >
              <div
                className={`absolute inset-0 ${category.gradient} opacity-90 transition-opacity duration-300 group-hover:opacity-100`}
              />
              
              {/* Glow effect on hover */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-t from-transparent via-transparent to-white/10" />
              
              <div className="relative z-10 flex items-center justify-between">
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-xl bg-background/20 flex items-center justify-center backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-background/30">
                    <category.icon className="h-7 w-7 text-primary-foreground transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <h3 className="text-2xl font-bold text-primary-foreground">
                    {category.name}
                  </h3>
                  <p className="text-primary-foreground/80">
                    {category.description}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-background/20 flex items-center justify-center transition-all duration-300 group-hover:translate-x-2 group-hover:bg-background/30 group-hover:scale-110">
                  <ArrowRight className="h-6 w-6 text-primary-foreground transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </div>
              
              {/* Border glow */}
              <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-white/20 transition-all duration-300" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Categories;
