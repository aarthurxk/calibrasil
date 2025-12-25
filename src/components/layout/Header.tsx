import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Menu, X, User, Search, Heart, LayoutDashboard, LogOut, UserCircle, Package } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import SearchModal from '@/components/search/SearchModal';
import caliLogo from '@/assets/cali-logo.jpeg';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [cartBounce, setCartBounce] = useState(false);
  const [wishlistBounce, setWishlistBounce] = useState(false);
  const { itemCount } = useCart();
  const { wishlistCount } = useWishlist();
  const { user, role, signOut } = useAuth();
  const location = useLocation();

  const isAdminOrManager = role === 'admin' || role === 'manager';

  const navLinks = [
    { name: 'Início', path: '/' },
    { name: 'Loja', path: '/shop' },
    { name: 'Nossa Vibe', path: '/about' },
    { name: 'Fala com a Gente', path: '/contact' },
  ];

  // Handle scroll behavior - hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      setIsScrolled(currentScrollY > 20);
      
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Bounce animation when cart count changes
  useEffect(() => {
    if (itemCount > 0) {
      setCartBounce(true);
      const timer = setTimeout(() => setCartBounce(false), 500);
      return () => clearTimeout(timer);
    }
  }, [itemCount]);

  // Bounce animation when wishlist count changes
  useEffect(() => {
    if (wishlistCount > 0) {
      setWishlistBounce(true);
      const timer = setTimeout(() => setWishlistBounce(false), 500);
      return () => clearTimeout(timer);
    }
  }, [wishlistCount]);

  const isActiveLink = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b transition-all duration-300 ${
        isScrolled
          ? 'bg-background/95 backdrop-blur-md border-border shadow-soft'
          : 'bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-transparent'
      } ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}
    >
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <img
            src={caliLogo}
            alt="Cali"
            className="h-10 w-10 rounded-lg object-cover transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3"
          />
          <span className="text-xl font-bold text-primary transition-colors group-hover:text-primary/80">
            Cali
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className={`relative text-sm font-medium transition-colors hover:text-primary py-1 ${
                isActiveLink(link.path) ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {link.name}
              {/* Animated underline */}
              <span
                className={`absolute bottom-0 left-0 h-0.5 bg-primary transition-all duration-300 ${
                  isActiveLink(link.path) ? 'w-full' : 'w-0 group-hover:w-full'
                }`}
              />
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="hidden md:flex hover:bg-primary/10 transition-colors" 
            aria-label="Pesquisar"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="h-5 w-5" />
          </Button>
          
          {/* Wishlist - only show if logged in */}
          {user && (
            <Link to="/wishlist" className="relative" aria-label="Lista de desejos">
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-primary/10 transition-colors"
                aria-label="Lista de desejos"
              >
                <Heart className={`h-5 w-5 transition-transform ${wishlistBounce ? 'scale-125' : 'scale-100'}`} />
                {wishlistCount > 0 && (
                  <Badge
                    className={`absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-500 text-white transition-transform ${
                      wishlistBounce ? 'animate-bounce-subtle' : ''
                    }`}
                  >
                    {wishlistCount}
                  </Badge>
                )}
              </Button>
            </Link>
          )}
          
          {/* User Menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-primary/10 transition-colors"
                  aria-label="Menu do usuário"
                >
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover animate-scale-in">
                {isAdminOrManager && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center gap-2 cursor-pointer">
                        <LayoutDashboard className="h-4 w-4" />
                        Painel Admin
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                    <UserCircle className="h-4 w-4" />
                    Meu Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/orders" className="flex items-center gap-2 cursor-pointer">
                    <Package className="h-4 w-4" />
                    Meus Pedidos
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => signOut()} 
                  className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth" aria-label="Entrar na conta">
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-primary/10 transition-colors"
                aria-label="Entrar na conta"
              >
                <User className="h-5 w-5" />
              </Button>
            </Link>
          )}

          <Link to="/cart" className="relative" aria-label="Carrinho de compras">
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-primary/10 transition-colors"
              aria-label="Carrinho de compras"
            >
              <ShoppingCart className={`h-5 w-5 transition-transform ${cartBounce ? 'scale-125' : 'scale-100'}`} />
              {itemCount > 0 && (
                <Badge
                  className={`absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-accent text-accent-foreground transition-transform ${
                    cartBounce ? 'animate-bounce-subtle' : ''
                  }`}
                >
                  {itemCount}
                </Badge>
              )}
            </Button>
          </Link>

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden hover:bg-primary/10 transition-colors"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? "Fechar menu" : "Abrir menu"}
          >
            {isMenuOpen ? (
              <X className="h-5 w-5 animate-scale-in" />
            ) : (
              <Menu className="h-5 w-5 animate-scale-in" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div
        className={`md:hidden border-t border-border bg-background/95 backdrop-blur-md overflow-hidden transition-all duration-300 ${
          isMenuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <nav className="container py-4 flex flex-col gap-2">
          {navLinks.map((link, index) => (
            <Link
              key={link.name}
              to={link.path}
              className={`text-sm font-medium transition-all duration-300 p-2 rounded-lg hover:bg-primary/10 ${
                isActiveLink(link.path) ? 'text-primary bg-primary/5' : 'text-muted-foreground'
              }`}
              style={{
                transitionDelay: isMenuOpen ? `${index * 50}ms` : '0ms',
                transform: isMenuOpen ? 'translateX(0)' : 'translateX(-20px)',
                opacity: isMenuOpen ? 1 : 0,
              }}
              onClick={() => setIsMenuOpen(false)}
            >
              {link.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* Search Modal */}
      <SearchModal open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </header>
  );
};

export default Header;
