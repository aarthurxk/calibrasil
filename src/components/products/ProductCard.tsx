import { Link } from 'react-router-dom';
import { ShoppingCart, Star } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { Product } from '@/types/product';

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const { addItem } = useCart();
  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image || '/placeholder.svg',
    });
    toast.success(`${product.name} adicionado à sacola! 🛍️`);
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Get the main image (first from images array or fallback to image field)
  const mainImage = product.images?.[0] || product.image || '/placeholder.svg';

  return (
    <Link to={`/product/${product.id}`} className="group block">
      <div className="relative overflow-hidden rounded-xl bg-card border border-border shadow-soft transition-all duration-300 hover:shadow-glow hover:-translate-y-1">
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={mainImage}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          {discount > 0 && (
            <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground">
              -{discount}%
            </Badge>
          )}
          {product.featured && (
            <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground">
              Destaque
            </Badge>
          )}
          
          {/* Quick Add Button */}
          <div className="absolute inset-x-0 bottom-0 translate-y-full transition-transform duration-300 group-hover:translate-y-0 p-3">
            <Button
              onClick={handleAddToCart}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Joga na Sacola
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {product.category}
            </p>
            {product.color && (
              <p className="text-xs text-muted-foreground">
                {product.color}
              </p>
            )}
          </div>
          <h3 className="font-semibold text-card-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          {product.model && (
            <p className="text-xs text-muted-foreground">
              Modelo: {product.model}
            </p>
          )}
          {product.rating && product.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-accent text-accent" />
              <span className="text-sm font-medium">{product.rating}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-primary">
              {formatPrice(product.price)}
            </span>
            {product.original_price && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.original_price)}
              </span>
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
