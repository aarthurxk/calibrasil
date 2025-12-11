import { Link } from "react-router-dom";
import { ShoppingCart, Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const { addItem } = useCart();
  const [selectedIndex, setSelectedIndex] = useState(0);

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

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: images[0],
    });
    toast.success(`${product.name} adicionado à sacola! 🛍️`);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  // Format colors display: "Cores Variadas" if > 2, otherwise comma-separated
  const displayColors = () => {
    if (!product.color || !Array.isArray(product.color) || product.color.length === 0) return null;
    if (product.color.length > 2) return "Cores Variadas";
    return product.color.join(", ");
  };

  const colorsText = displayColors();

  return (
    <Link to={`/product/${product.id}`} className="group block">
      <div className="relative overflow-hidden rounded-xl bg-card border border-border shadow-soft transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
        {/* Image Carousel Container */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          <div ref={emblaRef} className="overflow-hidden h-full">
            <div className="flex h-full">
              {images.map((img, index) => (
                <div key={index} className="flex-[0_0_100%] min-w-0 h-full">
                  <img
                    src={img}
                    alt={`${product.name} - Imagem ${index + 1}`}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Carousel Indicators */}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {images.map((_, index) => (
                <span
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === selectedIndex ? "bg-primary w-4" : "bg-background/60"
                  }`}
                />
              ))}
            </div>
          )}

          {discount > 0 && (
            <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground z-10">-{discount}%</Badge>
          )}
          {product.featured && (
            <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground z-10">Destaque</Badge>
          )}

          {/* Quick Add Button */}
          <div className="absolute inset-x-0 bottom-0 translate-y-full transition-transform duration-300 group-hover:translate-y-0 p-3 z-20">
            <Button onClick={handleAddToCart} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              <ShoppingCart className="mr-2 h-4 w-4" />
              Joga na Sacola
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{product.category}</p>
            {colorsText && <p className="text-xs text-muted-foreground">{colorsText}</p>}
          </div>
          <h3 className="font-semibold text-card-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          {product.description && <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>}
          {product.rating !== null && product.rating !== undefined && product.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-accent text-accent" />
              <span className="text-sm font-medium">{product.rating}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-primary">{formatPrice(product.price)}</span>
            {product.original_price && (
              <span className="text-sm text-muted-foreground line-through">{formatPrice(product.original_price)}</span>
            )}
          </div>
          {!product.in_stock && (
            <Badge variant="secondary" className="mt-2">
              Esgotado
            </Badge>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
