import { Link } from "react-router-dom";
import { ArrowRight, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
const Hero = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src="/images/hero-beach.jpg" 
          alt="Pôr do sol na praia com ondas" 
          className="h-full w-full object-cover"
          fetchPriority="high"
          width={1920}
          height={1080}
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
            <span className="block bg-gradient-ocean bg-clip-text text-transparent">Encontra Inovação</span>
          </h1>

          <p className="text-lg text-sidebar-foreground/80 max-w-lg">
            Produtos premium que elevam seu estilo e simplificam seu dia a dia. Inovação com conforto, sofisticação e
            alma livre.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link to="/shop">
              <Button
                size="lg"
                className="bg-gradient-ocean text-primary-foreground hover:opacity-90 transition-opacity shadow-glow"
              >
                Bora Conferir
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/about">
              <Button
                size="lg"
                variant="outline"
                className="border-sidebar-border hover:bg-sidebar-accent text-primary"
              >
                Nossa História
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-4 sm:gap-8 pt-8 border-t border-sidebar-border/30">
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-cali-wave">5mil+</p>
              <p className="text-xs sm:text-sm text-sidebar-foreground/60">Clientes Felizes</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-cali-wave">100%</p>
              <p className="text-xs sm:text-sm text-sidebar-foreground/60">Sustentável</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-bold text-cali-wave">Eco</p>
              <p className="text-xs sm:text-sm text-sidebar-foreground/60">Produção consciente</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
export default Hero;
