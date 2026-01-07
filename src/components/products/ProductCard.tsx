import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Badge } from "@/components/ui/badge";
import WishlistButton from "@/components/products/WishlistButton";
import { formatPrice } from "@/lib/formatters";
import type { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  // Get all images for the carousel
  const images = product.images?.length ? product.images : product.image ? [product.image] : ["/placeholder.svg"];

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true },
    images.length > 1 ? [Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true })] : [],
  );

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
  }, [emblaApi, onSelect]);

  // Format colors display: "Cores Variadas" if > 2, otherwise comma-separated
  const displayColors = () => {
    if (!product.color || !Array.isArray(product.color) || product.color.length === 0) return null;
    if (product.color.length > 2) return "Cores Variadas";
    return product.color.join(", ");
  };

  const colorsText = displayColors();

  return (
    <Link
      to={`/product/${product.id}`}
      className="group block"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative overflow-hidden rounded-lg sm:rounded-xl bg-card border border-border shadow-soft transition-all duration-500 hover:shadow-glow hover:-translate-y-1 sm:hover:-translate-y-2 hover:border-primary/30">
        {/* Image Carousel Container */}
        <div 
          className="relative aspect-square overflow-hidden bg-muted"
          role="region"
          aria-label={`Galeria de imagens de ${product.name}`}
          aria-roledescription="carrossel"
        >
          <div ref={emblaRef} className="overflow-hidden h-full">
            <div className="flex h-full" aria-live="polite">
              {images.map((img, index) => (
                <div 
                  key={index} 
                  className="flex-[0_0_100%] min-w-0 h-full overflow-hidden"
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`Imagem ${index + 1} de ${images.length}`}
                  aria-hidden={index !== selectedIndex}
                >
                  <img
                    src={img}
                    alt={`${product.name} - Imagem ${index + 1} de ${images.length}`}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                    decoding="async"
                    width={400}
                    height={400}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Carousel Indicators */}
          {images.length > 1 && (
            <div 
              className="absolute bottom-2 sm:bottom-3 left-1/2 -translate-x-1/2 flex gap-1 sm:gap-1.5 z-10"
              role="tablist"
              aria-label="Indicadores de imagem"
            >
              {images.map((_, index) => (
                <span
                  key={index}
                  role="tab"
                  aria-selected={index === selectedIndex}
                  aria-label={`Imagem ${index + 1}`}
                  className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                    index === selectedIndex ? "bg-primary w-3 sm:w-4" : "bg-background/60 w-1.5 sm:w-2"
                  }`}
                />
              ))}
            </div>
          )}

          {/* Discount Badge with Pulse */}
          {discount > 0 && (
            <Badge className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-accent text-accent-foreground z-10 animate-badge-pulse text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
              -{discount}%
            </Badge>
          )}
          {product.featured && !discount && (
            <Badge className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-primary text-primary-foreground z-10 animate-badge-pulse text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
              Destaque
            </Badge>
          )}

          {/* Wishlist Button with Slide-in Animation */}
          <div
            className={`absolute top-2 right-2 sm:top-3 sm:right-3 z-10 transition-all duration-300 ${
              isHovered ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 sm:opacity-0"
            }`}
          >
            <WishlistButton productId={product.id} />
          </div>

          {/* Quick View Overlay */}
          <div
            className={`absolute inset-0 bg-gradient-to-t from-cali-ocean-dark/60 via-transparent to-transparent transition-opacity duration-300 ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}
          />
        </div>

        {/* Content */}
        <div className="p-2 sm:p-4 space-y-1 sm:space-y-2">
          <div className="flex items-center justify-between gap-1">
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide truncate">{product.category}</p>
            {colorsText && <p className="text-[10px] sm:text-xs text-muted-foreground hidden xs:block truncate">{colorsText}</p>}
          </div>
          <h3 className="text-sm sm:text-base font-semibold text-card-foreground line-clamp-1 group-hover:text-primary transition-colors duration-300">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2 hidden sm:block">{product.description}</p>
          )}
          {product.rating !== null && product.rating !== undefined && product.rating > 0 && (
            <div className="flex items-center gap-0.5 sm:gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 sm:h-4 sm:w-4 transition-all duration-300 ${
                    i < Math.round(product.rating || 0)
                      ? "fill-accent text-accent"
                      : "fill-transparent text-muted-foreground/30"
                  }`}
                  style={{ transitionDelay: `${i * 50}ms` }}
                />
              ))}
              <span className="text-xs sm:text-sm font-medium ml-0.5 sm:ml-1">{product.rating}</span>
            </div>
          )}
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <span
              className={`font-bold text-sm sm:text-lg text-primary transition-all duration-300 ${
                isHovered ? "scale-105 sm:scale-110" : "scale-100"
              }`}
            >
              {formatPrice(product.price)}
            </span>
            {product.original_price && (
              <span className="text-[10px] sm:text-sm text-muted-foreground line-through">
                {formatPrice(product.original_price)}
              </span>
            )}
          </div>
          {!product.in_stock && (
            <Badge variant="secondary" className="mt-1 sm:mt-2 text-[10px] sm:text-xs">
              Esgotado
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
