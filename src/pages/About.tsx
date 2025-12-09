import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Palette, Leaf, ArrowRight } from "lucide-react";
import MainLayout from "@/components/layout/MainLayout";

// Import images
import vibeHero from "@/assets/about/vibe-hero.jpg";
import vibeHandFemale from "@/assets/about/vibe-hand-female.jpg";
import vibeHandMale from "@/assets/about/vibe-hand-male.jpg";
import vibeSurf from "@/assets/about/vibe-surf.jpg";
import vibeProductsSand from "@/assets/about/vibe-products-sand.jpg";
import vibeProductsBeach from "@/assets/about/vibe-products-beach.jpg";
import vibeSustainability from "@/assets/about/vibe-sustainability.jpg";
import vibeHat from "@/assets/about/vibe-hat.jpg";
import vibeGrass from "@/assets/about/vibe-grass.jpg";

const About = () => {
  const values = [
    {
      icon: Sparkles,
      title: "Inovação",
      description: "Tecnologia de ponta em cada detalhe"
    },
    {
      icon: Palette,
      title: "Criatividade",
      description: "Design único que expressa quem você é"
    },
    {
      icon: Leaf,
      title: "Sustentabilidade",
      description: "Compromisso real com o planeta"
    }
  ];

  const galleryImages = [
    { src: vibeSurf, alt: "Lifestyle surf Cali Brasil" },
    { src: vibeProductsSand, alt: "Produtos Cali na areia" },
    { src: vibeProductsBeach, alt: "Cases Cali na praia" },
    { src: vibeHat, alt: "Estilo Cali lifestyle" },
    { src: vibeGrass, alt: "Produtos Cali na natureza" }
  ];

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${vibeHero})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
        
        <div className="relative z-10 container mx-auto px-4 text-center py-20">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-6 animate-fade-in">
            Tecnologia com<br />
            <span className="text-primary">Alma de Praia</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-in">
            A Cali Brasil nasceu pra quem vive conectado e não abre mão do estilo. 
            A gente une tecnologia, lifestyle e autoexpressão em acessórios mobile que são a sua cara.
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Nossa Missão
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Empoderar a galera dos 20 aos 40 que vive com atitude, estilo e muita energia. 
                Inovação e criatividade andam juntas aqui — porque a vida é muito curta pra ser sem graça.
              </p>
              
              <div className="grid gap-4 pt-4">
                {values.map((value, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-4 p-4 rounded-lg bg-card border border-border hover:border-primary/50 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-primary/10">
                      <value.icon className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{value.title}</h3>
                      <p className="text-sm text-muted-foreground">{value.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <img 
                src={vibeHandFemale} 
                alt="Case Cali em mãos femininas" 
                className="rounded-2xl object-cover w-full h-64 md:h-80 shadow-lg"
              />
              <img 
                src={vibeHandMale} 
                alt="Case Cali em mãos masculinas" 
                className="rounded-2xl object-cover w-full h-64 md:h-80 shadow-lg mt-8"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Sustainability Section */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <img 
                src={vibeSustainability} 
                alt="Sustentabilidade Cali Brasil - Stop Ocean Plastic Pollution" 
                className="rounded-2xl object-cover w-full h-[400px] md:h-[500px] shadow-xl"
              />
            </div>
            
            <div className="order-1 md:order-2 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
                <Leaf className="w-4 h-4" />
                <span className="text-sm font-medium">Sustentabilidade</span>
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Stop Ocean<br />Plastic Pollution
              </h2>
              
              <p className="text-lg text-muted-foreground leading-relaxed">
                A gente ama o oceano e leva isso a sério. Nossos Bio Cases são feitos de materiais 
                biodegradáveis, reduzindo o impacto ambiental sem abrir mão do estilo e proteção 
                que você merece.
              </p>
              
              <p className="text-muted-foreground">
                Cada case Cali é um passo em direção a um futuro mais sustentável. 
                Porque proteger o seu celular e o planeta podem andar juntos.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Lifestyle Gallery */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Lifestyle Cali
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Nossos produtos fazem parte do seu dia a dia — da praia ao rolê, do trabalho ao lazer.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {galleryImages.map((image, index) => (
              <div 
                key={index}
                className="group relative overflow-hidden rounded-xl aspect-square"
              >
                <img 
                  src={image.src} 
                  alt={image.alt}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            Mais que produtos,<br />
            <span className="text-primary">é um lifestyle.</span>
          </h2>
          
          <div className="flex flex-wrap justify-center gap-6 mb-10">
            <div className="flex items-center gap-2 text-foreground">
              <span className="text-2xl">🔥</span>
              <span className="font-semibold">Ousado</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <span className="text-2xl">💪</span>
              <span className="font-semibold">Confiante</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <span className="text-2xl">⚡</span>
              <span className="font-semibold">Autenticamente Cali</span>
            </div>
          </div>
          
          <Button asChild size="lg" className="group">
            <Link to="/shop">
              Bora Conhecer a Loja
              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </div>
      </section>
    </MainLayout>
  );
};

export default About;
