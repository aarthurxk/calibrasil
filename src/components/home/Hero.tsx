import { Link } from 'react-router-dom';
import { ArrowRight, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import heroImage from '@/assets/hero-beach.jpg';

const Hero = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Pôr do sol na praia com ondas"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-cali-ocean-dark/90 via-cali-ocean-dark/60 to-transparent" />
      </div>

      {/* Content */}
      <div className="container relative z-10 py-20">
        <div className="max-w-2xl space-y-8 animate-fade-in">
          <div className="flex items-center gap-2 text-cali-wave">
            <Waves className="h-6 w-6 animate-wave" />
            <span className="text-sm font-medium uppercase tracking-widest">Estilo Praia Tech</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-sidebar-foreground leading-tight">
            Onde a Onda
            <span className="block bg-gradient-ocean bg-clip-text text-transparent">
              Encontra Inovação
            </span>
          </h1>
          
          <p className="text-lg text-sidebar-foreground/80 max-w-lg">
            Descubra produtos tech premium feitos pro surfista moderno. 
            Sustentáveis, inovadores e prontos pra pegar a onda do futuro com você!
          </p>

          <div className="flex flex-wrap gap-4">
            <Link to="/shop">
              <Button size="lg" className="bg-gradient-ocean text-primary-foreground hover:opacity-90 transition-opacity shadow-glow">
                Bora Conferir
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/about">
              <Button size="lg" variant="outline" className="border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent">
                Nossa História
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="flex gap-8 pt-8 border-t border-sidebar-border/30">
            <div>
              <p className="text-3xl font-bold text-cali-wave">50mil+</p>
              <p className="text-sm text-sidebar-foreground/60">Clientes Felizes</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-cali-wave">100%</p>
              <p className="text-sm text-sidebar-foreground/60">Sustentável</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-cali-wave">4.9★</p>
              <p className="text-sm text-sidebar-foreground/60">Avaliação Média</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
