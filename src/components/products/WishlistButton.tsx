import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useWishlist } from '@/hooks/useWishlist';
import { cn } from '@/lib/utils';

interface WishlistButtonProps {
  productId: string;
  variant?: 'icon' | 'default';
  className?: string;
}

const WishlistButton = ({ productId, variant = 'icon', className }: WishlistButtonProps) => {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isWishlisted = isInWishlist(productId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(productId);
  };

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-9 w-9 rounded-full bg-background/80 hover:bg-background backdrop-blur-sm transition-all",
          isWishlisted && "text-red-500 hover:text-red-600",
          className
        )}
        onClick={handleClick}
        aria-label={isWishlisted ? "Remover da wishlist" : "Adicionar à wishlist"}
      >
        <Heart
          className={cn(
            "h-5 w-5 transition-all",
            isWishlisted && "fill-current"
          )}
        />
      </Button>
    );
  }

  return (
    <Button
      variant={isWishlisted ? "default" : "outline"}
      className={cn(
        "gap-2",
        isWishlisted && "bg-red-500 hover:bg-red-600 text-white",
        className
      )}
      onClick={handleClick}
    >
      <Heart className={cn("h-4 w-4", isWishlisted && "fill-current")} />
      {isWishlisted ? "Na Wishlist" : "Adicionar à Wishlist"}
    </Button>
  );
};

export default WishlistButton;
