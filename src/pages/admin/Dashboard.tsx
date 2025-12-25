import { useEffect, useState } from 'react';
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Percent,
  ShoppingBag,
  Radio,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const formatPrice = (price: number) => {
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const Dashboard = () => {
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);

  // Fetch orders for stats
  const { data: orders = [], isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
    queryKey: ['admin-orders-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Realtime subscription for orders
  useEffect(() => {
    const channel = supabase
      .channel('orders-status-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          refetchOrders();
        }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchOrders]);

  // Fetch customers count
  const { data: customersCount = 0, isLoading: customersLoading } = useQuery({
    queryKey: ['admin-customers-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch products by category
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['admin-products-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('category, price');
      if (error) throw error;
      return data;
    },
  });

  // Fetch abandoned carts for conversion metrics
  const { data: abandonedCarts = [], isLoading: cartsLoading } = useQuery({
    queryKey: ['admin-abandoned-carts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('abandoned_carts')
        .select('*');
      if (error) throw error;
      return data;
    },
  });

  const isLoading = ordersLoading || customersLoading || productsLoading || cartsLoading;

  // Calculate stats - only paid orders for revenue
  const paidOrders = orders.filter(order => order.payment_status === 'paid');
  const totalRevenue = paidOrders.reduce((sum, order) => sum + Number(order.total), 0);
  const totalOrders = paidOrders.length;
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'awaiting_payment').length;
  const completedOrders = orders.filter(o => o.status === 'delivered' || o.status === 'completed').length;

  // Calculate conversion rate and average ticket
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalCarts = abandonedCarts.length + totalOrders;
  const conversionRate = totalCarts > 0 ? (totalOrders / totalCarts) * 100 : 0;
  const abandonmentRate = totalCarts > 0 ? (abandonedCarts.filter(c => !c.recovered).length / totalCarts) * 100 : 0;

  // Group orders by month for chart - only paid orders
  const monthlyData = paidOrders.reduce((acc, order) => {
    const date = new Date(order.created_at);
    const month = date.toLocaleString('pt-BR', { month: 'short' });
    const existing = acc.find(item => item.name === month);
    if (existing) {
      existing.sales += Number(order.total);
      existing.orders += 1;
    } else {
      acc.push({ name: month, sales: Number(order.total), orders: 1 });
    }
    return acc;
  }, [] as { name: string; sales: number; orders: number }[]).slice(-7);

  // Group by category
  const categoryData = products.reduce((acc, product) => {
    const existing = acc.find(item => item.name === product.category);
    if (existing) {
      existing.sales += Number(product.price);
    } else {
      acc.push({ name: product.category, sales: Number(product.price) });
    }
    return acc;
  }, [] as { name: string; sales: number }[]);

  // Recent orders (last 5)
  const recentOrders = orders.slice(0, 5);

  // Calculate order status counts for the status table
  const statusCounts = [
    {
      key: 'awaiting_payment',
      label: 'Aguardando Pagamento',
      count: orders.filter(o => o.payment_status === 'pending' || o.status === 'awaiting_payment').length,
      icon: Clock,
      priority: 'critical',
      bgClass: 'bg-red-500/10',
      textClass: 'text-red-600',
      borderClass: 'border-red-500/20',
    },
    {
      key: 'paid_no_tracking',
      label: 'Pagos sem Rastreio',
      count: orders.filter(o => 
        o.payment_status === 'paid' && 
        !o.tracking_code && 
        o.status !== 'delivered' &&
        o.shipping_method !== 'pickup'
      ).length,
      icon: AlertCircle,
      priority: 'high',
      bgClass: 'bg-orange-500/10',
      textClass: 'text-orange-600',
      borderClass: 'border-orange-500/20',
    },
    {
      key: 'processing',
      label: 'Processando',
      count: orders.filter(o => o.status === 'processing').length,
      icon: Package,
      priority: 'medium',
      bgClass: 'bg-yellow-500/10',
      textClass: 'text-yellow-600',
      borderClass: 'border-yellow-500/20',
    },
    {
      key: 'shipped',
      label: 'Enviado',
      count: orders.filter(o => o.status === 'shipped').length,
      icon: Truck,
      priority: 'normal',
      bgClass: 'bg-blue-500/10',
      textClass: 'text-blue-600',
      borderClass: 'border-blue-500/20',
    },
    {
      key: 'delivered',
      label: 'Entregue',
      count: orders.filter(o => o.status === 'delivered').length,
      icon: CheckCircle,
      priority: 'done',
      bgClass: 'bg-green-500/10',
      textClass: 'text-green-600',
      borderClass: 'border-green-500/20',
    },
    {
      key: 'cancelled',
      label: 'Cancelado',
      count: orders.filter(o => o.status === 'cancelled').length,
      icon: XCircle,
      priority: 'archived',
      bgClass: 'bg-muted',
      textClass: 'text-muted-foreground',
      borderClass: 'border-border',
    },
  ];

  const stats = [
    {
      title: 'Receita Total',
      value: formatPrice(totalRevenue),
      change: `${completedOrders} entregues`,
      trend: 'up' as const,
      icon: DollarSign,
    },
    {
      title: 'Ticket Médio',
      value: formatPrice(avgTicket),
      change: `${totalOrders} pedidos`,
      trend: 'up' as const,
      icon: ShoppingBag,
    },
    {
      title: 'Taxa de Conversão',
      value: `${conversionRate.toFixed(1)}%`,
      change: `${abandonmentRate.toFixed(1)}% abandono`,
      trend: conversionRate > 5 ? 'up' as const : 'down' as const,
      icon: Percent,
    },
    {
      title: 'Clientes',
      value: customersCount.toString(),
      change: `${pendingOrders} pedidos pendentes`,
      trend: pendingOrders > 5 ? 'down' as const : 'up' as const,
      icon: Users,
    },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      delivered: 'bg-green-100 text-green-800',
      completed: 'bg-green-100 text-green-800',
      processing: 'bg-blue-100 text-blue-800',
      shipped: 'bg-purple-100 text-purple-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return styles[status] || 'bg-muted text-muted-foreground';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      delivered: 'Entregue',
      completed: 'Concluído',
      processing: 'Processando',
      shipped: 'Enviado',
      pending: 'Pendente',
      cancelled: 'Cancelado',
    };
    return labels[status] || status;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Painel</h1>
        <p className="text-muted-foreground">Bem-vindo de volta ao Admin da Cali! 🤙</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card 
            key={stat.title}
            className="animate-fade-in transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className="p-2 rounded-lg bg-primary/10">
                <stat.icon className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div
                className={`flex items-center text-sm transition-colors ${
                  stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {stat.trend === 'up' ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                {stat.change}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Order Status Table */}
      <Card className="animate-fade-in" style={{ animationDelay: '400ms' }}>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle>Status dos Pedidos</CardTitle>
            {isRealtimeConnected && (
              <div className="flex items-center gap-1.5 text-xs text-green-600">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span>Ao vivo</span>
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" asChild className="hover:scale-105 transition-transform">
            <Link to="/admin/orders">Ver todos</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {statusCounts.map((status, index) => (
              <Link
                key={status.key}
                to={`/admin/orders?status=${status.key}`}
                className={`p-4 rounded-lg border ${status.bgClass} ${status.borderClass} transition-all duration-200 cursor-pointer hover:scale-105 hover:shadow-md animate-fade-in`}
                style={{ animationDelay: `${500 + index * 50}ms` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <status.icon className={`h-4 w-4 ${status.textClass}`} />
                  <span className={`text-xs font-medium ${status.textClass}`}>
                    {status.label}
                  </span>
                </div>
                <div className={`text-2xl font-bold ${status.textClass}`}>
                  {status.count}
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Visão Geral de Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value) => [formatPrice(value as number), 'Vendas']}
                    />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Sem dados de vendas ainda
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value) => [formatPrice(value as number), 'Vendas']}
                    />
                    <Bar
                      dataKey="sales"
                      fill="hsl(var(--accent))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Sem dados de categorias ainda
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card className="animate-fade-in" style={{ animationDelay: '800ms' }}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pedidos Recentes</CardTitle>
          <Button variant="outline" size="sm" asChild className="hover:scale-105 transition-transform">
            <Link to="/admin/orders">Ver todos</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">ID</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Total</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Data</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.length > 0 ? (
                  recentOrders.map((order, index) => (
                    <tr 
                      key={order.id} 
                      className="border-b border-border last:border-0 transition-colors hover:bg-muted/50 animate-fade-in"
                      style={{ animationDelay: `${900 + index * 50}ms` }}
                    >
                      <td className="py-3 px-4 font-medium">#{order.id.slice(0, 8)}</td>
                      <td className="py-3 px-4">{formatPrice(Number(order.total))}</td>
                      <td className="py-3 px-4">
                        <Badge className={getStatusBadge(order.status)}>
                          {getStatusLabel(order.status)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      Nenhum pedido ainda
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
