import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  UserCircle,
  Store,
  Map,
  Ticket,
  Layers,
  Mail,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';
import caliLogo from '@/assets/cali-logo.jpeg';

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, role, signOut, isAdmin, canManageRoles } = useAuth();

  // Define menu items based on role
  const sidebarItems = [
    { name: 'Painel', icon: LayoutDashboard, path: '/admin', showFor: ['admin', 'manager'] },
    { name: 'Produtos', icon: Package, path: '/admin/products', showFor: ['admin', 'manager'] },
    { name: 'Pedidos', icon: ShoppingCart, path: '/admin/orders', showFor: ['admin', 'manager'] },
    { name: 'Clientes', icon: Users, path: '/admin/customers', showFor: ['admin', 'manager'] },
    { name: 'Pagamentos', icon: CreditCard, path: '/admin/payments', showFor: ['admin', 'manager'] },
    { name: 'Relatórios', icon: BarChart3, path: '/admin/reports', showFor: ['admin', 'manager'] },
    { name: 'Cupons', icon: Ticket, path: '/admin/coupons', showFor: ['admin', 'manager'] },
    { name: 'Categorias', icon: Layers, path: '/admin/categories', showFor: ['admin'] },
    { name: 'Templates de Email', icon: Mail, path: '/admin/email-templates', showFor: ['admin'] },
    { name: 'Roadmap', icon: Map, path: '/admin/roadmap', showFor: ['admin'] },
    { name: 'Configurações', icon: Settings, path: '/admin/settings', showFor: ['admin'] },
  ];

  const visibleItems = sidebarItems.filter(item => 
    role && item.showFor.includes(role)
  );

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const getRoleBadge = () => {
    if (isAdmin) {
      return <Badge variant="default" className="bg-primary">Admin</Badge>;
    }
    return <Badge variant="secondary">Manager</Badge>;
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar transform transition-transform duration-300 lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-sidebar-border">
            <Link to="/admin" className="flex items-center gap-3">
              <img
                src={caliLogo}
                alt="Cali"
                className="h-10 w-10 rounded-lg"
              />
              <div>
                <span className="font-bold text-sidebar-foreground">Cali</span>
                <span className="text-xs block text-sidebar-foreground/60">
                  Painel Admin
                </span>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {visibleItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-sidebar-border space-y-2">
            <Link
              to="/"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <Package className="h-5 w-5" />
              <span className="font-medium">Ver Loja</span>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-opacity">
                  <div className="text-right">
                    <p className="text-sm font-medium">{user?.email}</p>
                    <div className="flex items-center gap-2 justify-end">
                      {getRoleBadge()}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-ocean flex items-center justify-center text-primary-foreground font-bold">
                    {user?.email?.charAt(0).toUpperCase()}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover">
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                    <UserCircle className="h-4 w-4" />
                    Meu Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/" className="flex items-center gap-2 cursor-pointer">
                    <Store className="h-4 w-4" />
                    Ver Loja
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleLogout} 
                  className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
