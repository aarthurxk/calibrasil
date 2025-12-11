import { Link } from 'react-router-dom';
import { Instagram, Twitter, Facebook, Mail } from 'lucide-react';
import caliLogo from '@/assets/cali-logo.jpeg';
const Footer = () => {
  return <footer className="bg-cali-ocean-dark text-sidebar-foreground mt-auto">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img src={caliLogo} alt="Cali" className="h-10 w-10 rounded-lg object-cover" />
              <span className="text-xl font-bold text-sidebar-primary">Cali</span>
            </div>
            <p className="text-sm text-sidebar-foreground/70">
               Onde estilo encontra tecnologia. Produtos sustentáveis e inovadores criados para quem vive com liberdade, conforto e autenticidade. 
 
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
            <h3 className="font-semibold mb-4">Loja</h3>
            <ul className="space-y-2 text-sm text-sidebar-foreground/70">
              <li><Link to="/shop" className="hover:text-sidebar-primary transition-colors">Todos os Produtos</Link></li>
              <li><Link to="/shop?category=tech" className="hover:text-sidebar-primary transition-colors">Tech</Link></li>
              <li><Link to="/shop?category=acessorios" className="hover:text-sidebar-primary transition-colors">Acessórios</Link></li>
              <li><Link to="/shop?sale=true" className="hover:text-sidebar-primary transition-colors">Promoções</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-4">Suporte</h3>
            <ul className="space-y-2 text-sm text-sidebar-foreground/70">
              <li><Link to="/contact" className="hover:text-sidebar-primary transition-colors">Fala com a Gente</Link></li>
              <li><Link to="/faq" className="hover:text-sidebar-primary transition-colors">Dúvidas Frequentes</Link></li>
              <li><Link to="/shipping" className="hover:text-sidebar-primary transition-colors">Entrega</Link></li>
              <li><Link to="/returns" className="hover:text-sidebar-primary transition-colors">Trocas e Devoluções</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-semibold mb-4">Fica Ligado!</h3>
            <p className="text-sm text-sidebar-foreground/70 mb-4">
              Cadastra aí e recebe ofertas exclusivas e novidades quentinhas direto no seu e-mail!
            </p>
            <div className="flex gap-2">
              <input type="email" placeholder="Seu melhor e-mail" className="flex-1 px-3 py-2 text-sm rounded-lg bg-sidebar-accent text-sidebar-foreground placeholder:text-sidebar-foreground/50 border border-sidebar-border focus:outline-none focus:ring-2 focus:ring-sidebar-primary" />
              <button className="px-4 py-2 bg-gradient-ocean text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
                <Mail className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-sidebar-border text-center text-sm text-sidebar-foreground/50">
          <p>&copy; {new Date().getFullYear()} Cali. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>;
};
export default Footer;