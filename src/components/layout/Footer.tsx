import { Link } from 'react-router-dom';
import { Instagram, Twitter, Facebook, Mail } from 'lucide-react';
import caliLogo from '@/assets/cali-logo.jpeg';

const Footer = () => {
  return (
    <footer className="bg-cali-ocean-dark text-sidebar-foreground mt-auto">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img src={caliLogo} alt="Cali" className="h-10 w-10 rounded-lg object-cover" />
              <span className="text-xl font-bold text-sidebar-primary">Cali</span>
            </div>
            <p className="text-sm text-sidebar-foreground/70">
              Where beach vibes meet cutting-edge technology. Sustainable, innovative gear for the modern coastal lifestyle.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-sidebar-foreground/70 hover:text-sidebar-primary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-sidebar-foreground/70 hover:text-sidebar-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-sidebar-foreground/70 hover:text-sidebar-primary transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="font-semibold mb-4">Shop</h3>
            <ul className="space-y-2 text-sm text-sidebar-foreground/70">
              <li><Link to="/shop" className="hover:text-sidebar-primary transition-colors">All Products</Link></li>
              <li><Link to="/shop?category=tech" className="hover:text-sidebar-primary transition-colors">Tech Gear</Link></li>
              <li><Link to="/shop?category=accessories" className="hover:text-sidebar-primary transition-colors">Accessories</Link></li>
              <li><Link to="/shop?sale=true" className="hover:text-sidebar-primary transition-colors">Sale</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm text-sidebar-foreground/70">
              <li><Link to="/contact" className="hover:text-sidebar-primary transition-colors">Contact Us</Link></li>
              <li><Link to="/faq" className="hover:text-sidebar-primary transition-colors">FAQ</Link></li>
              <li><Link to="/shipping" className="hover:text-sidebar-primary transition-colors">Shipping</Link></li>
              <li><Link to="/returns" className="hover:text-sidebar-primary transition-colors">Returns</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-semibold mb-4">Stay Connected</h3>
            <p className="text-sm text-sidebar-foreground/70 mb-4">
              Subscribe for exclusive deals and beach tech updates.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Your email"
                className="flex-1 px-3 py-2 text-sm rounded-lg bg-sidebar-accent text-sidebar-foreground placeholder:text-sidebar-foreground/50 border border-sidebar-border focus:outline-none focus:ring-2 focus:ring-sidebar-primary"
              />
              <button className="px-4 py-2 bg-gradient-ocean text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
                <Mail className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-sidebar-border text-center text-sm text-sidebar-foreground/50">
          <p>&copy; {new Date().getFullYear()} Cali. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
