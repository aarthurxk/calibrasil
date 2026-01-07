import { Link } from "react-router-dom";
import { ArrowRight, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { useEffect, useState } from "react";

const Hero = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return (
    <section className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center overflow-hidden">
      {/* Background Image with Parallax Effect */}
      <div className="absolute inset-0">
        <img
          src="/images/hero-beach.jpg"
          alt="Pôr do sol na praia com ondas"
          className="h-full w-full object-cover transition-transform duration-1000 scale-105"
          fetchPriority="high"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-cali-ocean-dark/95 via-cali-ocean-dark/70 to-cali-ocean-dark/30 sm:to-transparent" />
      </div>

      {/* Content */}
      <div className="container relative z-10 py-12 sm:py-16 md:py-20">
        <div className="max-w-2xl space-y-5 sm:space-y-6 md:space-y-8">
          {/* Badge - Stage 1 */}
          <div
            className={`flex items-center gap-2 text-cali-wave transition-all duration-700 ${
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "100ms" }}
          >
            <Waves className="h-5 w-5 sm:h-6 sm:w-6 animate-wave" />
            <span className="text-xs sm:text-sm font-medium uppercase tracking-widest">
              Estilo Praia Tech
            </span>
          </div>

          {/* Title - Stage 2 */}
          <h1
            className={`text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold text-sidebar-foreground leading-tight transition-all duration-700 ${
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "200ms" }}
          >
            Onde a Onda
            <span className="block bg-gradient-ocean bg-clip-text text-transparent">
              Encontra Inovação
            </span>
          </h1>

          {/* Description - Stage 3 */}
          <p
            className={`text-base sm:text-lg text-sidebar-foreground/80 max-w-lg transition-all duration-700 ${
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "300ms" }}
          >
            Produtos premium que elevam seu estilo e simplificam seu dia a dia.
            Inovação com conforto, sofisticação e alma livre.
          </p>

          {/* Buttons - Stage 4 */}
          <div
            className={`flex flex-col sm:flex-row gap-3 sm:gap-4 transition-all duration-700 ${
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "400ms" }}
          >
            <Link to="/shop" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-gradient-ocean text-primary-foreground hover:opacity-90 transition-all shadow-glow hover:shadow-[0_0_40px_hsl(var(--cali-teal)/0.5)] hover:scale-105 group text-base"
              >
                Bora Conferir
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/about" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto border-sidebar-foreground/30 bg-sidebar-foreground/10 text-sidebar-foreground hover:bg-sidebar-foreground/20 hover:text-sidebar-foreground transition-all backdrop-blur-sm"
              >
                Nossa História
              </Button>
            </Link>
          </div>

          {/* Stats - Stage 5 */}
          <div
            className={`flex flex-wrap gap-3 sm:gap-6 md:gap-8 pt-6 sm:pt-8 border-t border-sidebar-border/30 transition-all duration-700 ${
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: "500ms" }}
          >
            <div className="flex-1 min-w-[80px] text-center sm:text-left bg-sidebar-foreground/5 backdrop-blur-sm rounded-lg py-3 px-2 sm:py-0 sm:px-0 sm:bg-transparent sm:backdrop-blur-none">
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-cali-wave">
                <AnimatedNumber value={5000} suffix="+" duration={2000} />
              </p>
              <p className="text-xs text-sidebar-foreground/60 mt-1">
                Clientes Felizes
              </p>
            </div>
            <div className="flex-1 min-w-[80px] text-center sm:text-left bg-sidebar-foreground/5 backdrop-blur-sm rounded-lg py-3 px-2 sm:py-0 sm:px-0 sm:bg-transparent sm:backdrop-blur-none">
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-cali-wave">
                <AnimatedNumber value={100} suffix="%" duration={1500} />
              </p>
              <p className="text-xs text-sidebar-foreground/60 mt-1">
                Sustentável
              </p>
            </div>
            <div className="flex-1 min-w-[80px] text-center sm:text-left bg-sidebar-foreground/5 backdrop-blur-sm rounded-lg py-3 px-2 sm:py-0 sm:px-0 sm:bg-transparent sm:backdrop-blur-none">
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-cali-wave">
                Eco
              </p>
              <p className="text-xs text-sidebar-foreground/60 mt-1">
                Produção consciente
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
