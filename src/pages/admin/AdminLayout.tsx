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
  Ticket,
  Layers,
  Mail,
  UserCheck,
  Activity,
  Bug,
  ChevronDown,
  Megaphone,
  Wallet,
  Cog,
  MailCheck,
  MessageSquare,
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
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import caliLogo from '@/assets/cali-logo.jpeg';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface SidebarSubItem {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: number;
  badgeType?: 'error' | 'warning';
}

interface SidebarItem {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  showFor: ('admin' | 'manager')[];
  badge?: number;
  badgeType?: 'error' | 'warning';
  subItems?: SidebarSubItem[];
}

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<string[]>(['Pedidos', 'Sistema']);
  const { user, role, signOut, isAdmin } = useAuth();

  // Fetch order monitor stats for badge
  const { data: monitorStats } = useQuery({
    queryKey: ['monitor-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, status, payment_status, guest_email')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) return { errors: 0, pending: 0 };
      
      let errors = 0;
      let pending = 0;
      
      data?.forEach(order => {
        const isPaid = order.payment_status === 'paid' || order.payment_status === 'approved';
        if (isPaid && order.status === 'pending') errors++;
        else if (isPaid && !order.guest_email) errors++;
        else if (order.payment_status === 'failed') errors++;
        else if (!isPaid && order.payment_status !== 'failed') pending++;
      });
      
      return { errors, pending };
    },
    refetchInterval: 60000,
  });

  const toggleMenu = (name: string) => {
    setOpenMenus(prev => 
      prev.includes(name) ? prev.filter(m => m !== name) : [...prev, name]
    );
  };

  // Simplified sidebar structure with grouped items
  const sidebarItems: SidebarItem[] = [
    { 
      name: 'Painel', 
      icon: LayoutDashboard, 
      path: '/admin', 
      showFor: ['admin', 'manager'] 
    },
    { 
      name: 'Catálogo', 
      icon: Package, 
      showFor: ['admin', 'manager'],
      subItems: [
        { name: 'Produtos', icon: Package, path: '/admin/products' },
        { name: 'Categorias', icon: Layers, path: '/admin/categories' },
      ]
    },
    { 
      name: 'Pedidos', 
      icon: ShoppingCart, 
      showFor: ['admin', 'manager'],
      subItems: [
        { name: 'Todos', icon: ShoppingCart, path: '/admin/orders' },
        { 
          name: 'Monitor', 
          icon: Activity, 
          path: '/admin/monitor',
          badge: monitorStats?.errors || 0,
          badgeType: monitorStats?.errors ? 'error' : 'warning'
        },
      ]
    },
    { 
      name: 'Clientes', 
      icon: Users, 
      path: '/admin/customers', 
      showFor: ['admin', 'manager'] 
    },
    { 
      name: 'Avaliações', 
      icon: MessageSquare, 
      path: '/admin/reviews', 
      showFor: ['admin', 'manager'] 
    },
    { 
      name: 'Marketing', 
      icon: Megaphone, 
      showFor: ['admin', 'manager'],
      subItems: [
        { name: 'Cupons', icon: Ticket, path: '/admin/coupons' },
        { name: 'Vendedores', icon: UserCheck, path: '/admin/sellers' },
      ]
    },
    { 
      name: 'Financeiro', 
      icon: Wallet, 
      showFor: ['admin', 'manager'],
      subItems: [
        { name: 'Pagamentos', icon: CreditCard, path: '/admin/payments' },
        { name: 'Relatórios', icon: BarChart3, path: '/admin/reports' },
      ]
    },
    { 
      name: 'Comunicação', 
      icon: Mail, 
      path: '/admin/email-templates', 
      showFor: ['admin'] 
    },
    { 
      name: 'Sistema', 
      icon: Cog, 
      showFor: ['admin'],
      subItems: [
        { name: 'Configurações', icon: Settings, path: '/admin/settings' },
        { name: 'Testes de Email', icon: MailCheck, path: '/admin/email-tests' },
        { name: 'Diagnóstico', icon: Bug, path: '/admin/diagnostic' },
      ]
    },
  ];

  const visibleItems = sidebarItems.filter(item => {
    if (!role || !item.showFor.includes(role as 'admin' | 'manager')) return false;
    // Filter subItems for managers (no categories, monitor, etc.)
    if (item.subItems && role === 'manager') {
      const adminOnlyPaths = ['/admin/categories', '/admin/monitor'];
      item.subItems = item.subItems.filter(sub => !adminOnlyPaths.includes(sub.path));
      if (item.subItems.length === 0) return false;
    }
    return true;
  });

  const isPathActive = (path?: string) => path && location.pathname === path;
  const isGroupActive = (item: SidebarItem) => 
    item.subItems?.some(sub => location.pathname === sub.path);

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

  const renderMenuItem = (item: SidebarItem, index: number) => {
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isOpen = openMenus.includes(item.name);
    const isActive = isPathActive(item.path) || isGroupActive(item);

    if (hasSubItems) {
      return (
        <Collapsible 
          key={item.name} 
          open={isOpen} 
          onOpenChange={() => toggleMenu(item.name)}
        >
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                "w-full group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <item.icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
              <span className="font-medium flex-1 text-left">{item.name}</span>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform duration-200",
                isOpen && "rotate-180"
              )} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 pt-1 space-y-1">
            {item.subItems?.map((subItem) => {
              const subIsActive = isPathActive(subItem.path);
              return (
                <Link
                  key={subItem.path}
                  to={subItem.path}
                  className={cn(
                    "group flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200",
                    subIsActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:translate-x-1"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <subItem.icon className="h-4 w-4" />
                  <span className="text-sm flex-1">{subItem.name}</span>
                  {subItem.badge !== undefined && subItem.badge > 0 && (
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-xs px-1.5 py-0 animate-bounce-subtle",
                        subItem.badgeType === 'error' 
                          ? "bg-destructive text-destructive-foreground border-destructive" 
                          : "bg-yellow-500 text-white border-yellow-500"
                      )}
                    >
                      {subItem.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    // Regular menu item without subItems
    return (
      <Link
        key={item.name}
        to={item.path!}
        className={cn(
          "group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 animate-fade-in",
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:translate-x-1"
        )}
        style={{ animationDelay: `${index * 50}ms` }}
        onClick={() => setSidebarOpen(false)}
      >
        <item.icon className={cn(
          "h-5 w-5 transition-transform duration-200",
          !isActive && "group-hover:scale-110"
        )} />
        <span className="font-medium flex-1">{item.name}</span>
        {item.badge !== undefined && item.badge > 0 && (
          <Badge 
            variant="outline" 
            className={cn(
              "animate-bounce-subtle text-xs px-1.5 py-0",
              item.badgeType === 'error' 
                ? "bg-destructive text-destructive-foreground border-destructive" 
                : "bg-yellow-500 text-white border-yellow-500"
            )}
          >
            {item.badge}
          </Badge>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar transform transition-all duration-300 ease-out lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-sidebar-border">
            <Link to="/admin" className="flex items-center gap-3 group">
              <img
                src={caliLogo}
                alt="Cali"
                className="h-10 w-10 rounded-lg transition-transform duration-300 group-hover:scale-110"
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
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {visibleItems.map((item, index) => renderMenuItem(item, index))}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-sidebar-border space-y-2">
            <Link
              to="/"
              className="group flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200 hover:translate-x-1"
            >
              <Store className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
              <span className="font-medium">Ver Loja</span>
            </Link>
            <button
              onClick={handleLogout}
              className="w-full group flex items-center gap-3 px-4 py-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-200 hover:translate-x-1"
            >
              <LogOut className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/50 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-4 transition-all duration-200">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden hover:scale-105 transition-transform"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-4 cursor-pointer hover:opacity-80 transition-all duration-200 group">
                  <div className="text-right">
                    <p className="text-sm font-medium">{user?.email}</p>
                    <div className="flex items-center gap-2 justify-end">
                      {getRoleBadge()}
                    </div>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gradient-ocean flex items-center justify-center text-primary-foreground font-bold transition-transform duration-200 group-hover:scale-105">
                    {user?.email?.charAt(0).toUpperCase()}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-popover animate-scale-in">
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
        <main className="flex-1 p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
