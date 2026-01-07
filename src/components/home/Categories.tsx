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
    <section className="py-12 sm:py-16 md:py-20 bg-muted" ref={ref as React.RefObject<HTMLElement>}>
      <div className="container">
        <div
          className={`text-center mb-6 sm:mb-8 md:mb-12 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <p className="text-xs sm:text-sm font-medium text-accent uppercase tracking-widest mb-1 sm:mb-2">
            Escolhe tua Vibe
          </p>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">
            Nossas Coleções 🏄
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6 max-w-4xl mx-auto">
          {categories.map((category, index) => (
            <Link
              key={category.name}
              to={category.path}
              className={`group relative overflow-hidden rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-8 transition-all duration-500 hover:-translate-y-2 sm:hover:-translate-y-3 hover:shadow-glow ${
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
              
              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="space-y-2 sm:space-y-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl bg-background/20 flex items-center justify-center backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-background/30">
                    <category.icon className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-primary-foreground transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-primary-foreground">
                    {category.name}
                  </h3>
                  <p className="text-sm sm:text-base text-primary-foreground/80">
                    {category.description}
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-background/20 flex items-center justify-center transition-all duration-300 group-hover:translate-x-2 group-hover:bg-background/30 group-hover:scale-110 flex-shrink-0">
                  <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </div>
              
              {/* Border glow */}
              <div className="absolute inset-0 rounded-xl sm:rounded-2xl border-2 border-transparent group-hover:border-white/20 transition-all duration-300" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Categories;
