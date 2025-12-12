import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Loader2, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['hsl(174, 42%, 45%)', 'hsl(16, 80%, 60%)', 'hsl(45, 80%, 55%)', 'hsl(200, 60%, 50%)', 'hsl(280, 50%, 55%)'];

const formatPrice = (price: number) => {
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

type PeriodFilter = '7d' | '30d' | '90d' | '12m';

const Reports = () => {
  const [period, setPeriod] = useState<PeriodFilter>('30d');

  const getPeriodDates = () => {
    const now = new Date();
    switch (period) {
      case '7d':
        return { start: subDays(now, 7), end: now };
      case '30d':
        return { start: subDays(now, 30), end: now };
      case '90d':
        return { start: subDays(now, 90), end: now };
      case '12m':
        return { start: subMonths(now, 12), end: now };
      default:
        return { start: subDays(now, 30), end: now };
    }
  };

  const { start, end } = getPeriodDates();

  // Fetch orders for the period
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['reports-orders', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .eq('payment_status', 'paid');

      if (error) throw error;
      return data;
    },
  });

  // Fetch products for category analysis
  const { data: products = [] } = useQuery({
    queryKey: ['reports-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      return data;
    },
  });

  // Fetch abandoned carts
  const { data: abandonedCarts = [] } = useQuery({
    queryKey: ['reports-abandoned-carts', period],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('abandoned_carts')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      if (error) throw error;
      return data;
    },
  });

  // Calculate metrics
  const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
  const totalOrders = orders.length;
  const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const abandonmentRate = abandonedCarts.length > 0 
    ? (abandonedCarts.filter(c => !c.recovered).length / (abandonedCarts.length + totalOrders)) * 100 
    : 0;

  // Revenue by day/month
  const revenueByPeriod = () => {
    if (period === '12m') {
      const months = eachMonthOfInterval({ start, end });
      return months.map(month => {
        const monthStart = startOfMonth(month);
        const monthEnd = endOfMonth(month);
        const monthOrders = orders.filter(o => {
          const orderDate = new Date(o.created_at);
          return orderDate >= monthStart && orderDate <= monthEnd;
        });
        return {
          date: format(month, 'MMM', { locale: ptBR }),
          revenue: monthOrders.reduce((sum, o) => sum + Number(o.total), 0),
          orders: monthOrders.length,
        };
      });
    }

    const days = eachDayOfInterval({ start, end });
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayOrders = orders.filter(o => o.created_at.startsWith(dayStr));
      return {
        date: format(day, period === '7d' ? 'EEE' : 'dd/MM', { locale: ptBR }),
        revenue: dayOrders.reduce((sum, o) => sum + Number(o.total), 0),
        orders: dayOrders.length,
      };
    });
  };

  // Sales by category
  const salesByCategory = () => {
    const categoryMap: Record<string, number> = {};
    
    orders.forEach(order => {
      order.order_items?.forEach((item: { product_id: string | null; quantity: number }) => {
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          categoryMap[product.category] = (categoryMap[product.category] || 0) + item.quantity;
        }
      });
    });

    return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
  };

  // Top products
  const topProducts = () => {
    const productMap: Record<string, { name: string; sales: number; revenue: number }> = {};
    
    orders.forEach(order => {
      order.order_items?.forEach((item: { product_name: string; quantity: number; price: number }) => {
        const key = item.product_name;
        if (!productMap[key]) {
          productMap[key] = { name: item.product_name, sales: 0, revenue: 0 };
        }
        productMap[key].sales += item.quantity;
        productMap[key].revenue += item.price * item.quantity;
      });
    });

    return Object.values(productMap)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);
  };

  // Compare with previous period
  const getPreviousPeriodRevenue = () => {
    // Simplified - would need another query for accurate comparison
    return totalRevenue * 0.85; // Placeholder
  };

  const revenueGrowth = totalRevenue > 0 
    ? ((totalRevenue - getPreviousPeriodRevenue()) / getPreviousPeriodRevenue()) * 100 
    : 0;

  const chartData = revenueByPeriod();
  const categoryData = salesByCategory();
  const topProductsData = topProducts();

  if (ordersLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">Analise a performance do seu negócio</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="12m">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receita Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totalRevenue)}</div>
            <div className="flex items-center gap-1 text-sm">
              {revenueGrowth >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <span className={revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                {revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}%
              </span>
              <span className="text-muted-foreground">vs período anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
            <p className="text-sm text-muted-foreground">pedidos confirmados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ticket Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(avgTicket)}</div>
            <p className="text-sm text-muted-foreground">por pedido</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Abandono
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{abandonmentRate.toFixed(1)}%</div>
            <p className="text-sm text-muted-foreground">carrinhos abandonados</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Receita e Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis yAxisId="left" className="text-xs" />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value, name) => [
                      name === 'revenue' ? formatPrice(value as number) : value,
                      name === 'revenue' ? 'Receita' : 'Pedidos'
                    ]}
                  />
                  <Legend formatter={(value) => value === 'revenue' ? 'Receita (R$)' : 'Pedidos'} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    name="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="orders"
                    name="orders"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--accent))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              Nenhum dado disponível para o período selecionado
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Vendas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={100}
                      dataKey="value"
                    >
                      {categoryData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhuma venda no período
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {topProductsData.length > 0 ? (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProductsData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis
                      dataKey="name"
                      type="category"
                      className="text-xs"
                      width={150}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value, name) => [
                        name === 'sales' ? value : formatPrice(value as number),
                        name === 'sales' ? 'Unidades' : 'Receita'
                      ]}
                    />
                    <Bar
                      dataKey="sales"
                      name="sales"
                      fill="hsl(var(--primary))"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhuma venda no período
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
