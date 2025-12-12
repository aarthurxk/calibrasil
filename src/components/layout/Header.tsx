import { Link } from 'react-router-dom';
import { ShoppingCart, Menu, X, User, Search, Heart } from 'lucide-react';
import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import caliLogo from '@/assets/cali-logo.jpeg';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { itemCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { user } = useAuth();

  const navLinks = [
    { name: 'Início', path: '/' },
    { name: 'Loja', path: '/shop' },
    { name: 'Nossa Vibe', path: '/about' },
    { name: 'Fala com a Gente', path: '/contact' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <img src={caliLogo} alt="Cali" className="h-10 w-10 rounded-lg object-cover" />
          <span className="text-xl font-bold text-primary">Cali</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              {link.name}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="hidden md:flex" aria-label="Pesquisar">
            <Search className="h-5 w-5" />
          </Button>
          {/* Wishlist - only show if logged in */}
          {user && (
            <Link to="/wishlist" className="relative" aria-label="Lista de desejos">
              <Button variant="ghost" size="icon" aria-label="Lista de desejos">
                <Heart className="h-5 w-5" />
                {wishlistCount > 0 && (
                  <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-500 text-white">
                    {wishlistCount}
                  </Badge>
                )}
              </Button>
            </Link>
          )}
          <Link to="/auth" aria-label="Entrar na conta">
            <Button variant="ghost" size="icon" aria-label="Entrar na conta">
              <User className="h-5 w-5" />
            </Button>
          </Link>
          <Link to="/cart" className="relative" aria-label="Carrinho de compras">
            <Button variant="ghost" size="icon" aria-label="Carrinho de compras">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-accent text-accent-foreground">
                  {itemCount}
                </Badge>
              )}
            </Button>
          </Link>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border bg-background animate-fade-in">
          <nav className="container py-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
