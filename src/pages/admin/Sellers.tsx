import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trophy, TrendingUp, Users, DollarSign, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Seller {
  id: string;
  name: string;
  code: string;
  discount_percent: number;
  commission_percent: number;
  is_active: boolean;
  total_sales: number;
  total_orders: number;
  created_at: string;
}

interface SellerFormData {
  name: string;
  code: string;
  discount_percent: number;
  commission_percent: number;
  is_active: boolean;
}

const Sellers = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [period, setPeriod] = useState('30d');
  const [formData, setFormData] = useState<SellerFormData>({
    name: '',
    code: '',
    discount_percent: 0,
    commission_percent: 0,
    is_active: true,
  });

  // Fetch sellers
  const { data: sellers = [], isLoading } = useQuery({
    queryKey: ['sellers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sellers')
        .select('*')
        .order('total_sales', { ascending: false });
      if (error) throw error;
      return data as Seller[];
    },
  });

  // Fetch orders with seller codes for dashboard
  const { data: sellerOrders = [] } = useQuery({
    queryKey: ['seller-orders', period],
    queryFn: async () => {
      const daysAgo = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data, error } = await supabase
        .from('orders')
        .select('seller_code, total, seller_discount_amount, created_at')
        .not('seller_code', 'is', null)
        .eq('payment_status', 'paid')
        .gte('created_at', startDate.toISOString());
      
      if (error) throw error;
      return data;
    },
  });

  // Create/Update seller mutation
  const saveMutation = useMutation({
    mutationFn: async (data: SellerFormData) => {
      const payload = {
        ...data,
        code: data.code.toUpperCase().trim(),
      };

      if (editingSeller) {
        const { error } = await supabase
          .from('sellers')
          .update(payload)
          .eq('id', editingSeller.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('sellers')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
      toast.success(editingSeller ? 'Vendedor atualizado!' : 'Vendedor criado!');
      handleCloseDialog();
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast.error('Já existe um vendedor com este código');
      } else {
        toast.error('Erro ao salvar vendedor');
      }
    },
  });

  // Delete seller mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sellers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sellers'] });
      toast.success('Vendedor removido!');
    },
    onError: () => {
      toast.error('Erro ao remover vendedor');
    },
  });

  const handleOpenDialog = (seller?: Seller) => {
    if (seller) {
      setEditingSeller(seller);
      setFormData({
        name: seller.name,
        code: seller.code,
        discount_percent: seller.discount_percent,
        commission_percent: seller.commission_percent,
        is_active: seller.is_active,
      });
    } else {
      setEditingSeller(null);
      setFormData({
        name: '',
        code: '',
        discount_percent: 0,
        commission_percent: 0,
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSeller(null);
    setFormData({
      name: '',
      code: '',
      discount_percent: 0,
      commission_percent: 0,
      is_active: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
      toast.error('Preencha nome e código');
      return;
    }
    saveMutation.mutate(formData);
  };

  // Calculate dashboard metrics
  const calculateMetrics = () => {
    const sellerStats: Record<string, { sales: number; orders: number; name: string }> = {};
    
    sellerOrders.forEach((order) => {
      if (order.seller_code) {
        if (!sellerStats[order.seller_code]) {
          const seller = sellers.find(s => s.code === order.seller_code);
          sellerStats[order.seller_code] = { 
            sales: 0, 
            orders: 0, 
            name: seller?.name || order.seller_code 
          };
        }
        sellerStats[order.seller_code].sales += Number(order.total);
        sellerStats[order.seller_code].orders += 1;
      }
    });

    return Object.entries(sellerStats)
      .map(([code, data]) => ({ code, ...data }))
      .sort((a, b) => b.sales - a.sales);
  };

  const sellerStats = calculateMetrics();
  const totalSalesBySellers = sellerStats.reduce((sum, s) => sum + s.sales, 0);
  const totalOrdersBySellers = sellerStats.reduce((sum, s) => sum + s.orders, 0);
  const avgTicket = totalOrdersBySellers > 0 ? totalSalesBySellers / totalOrdersBySellers : 0;

  const chartData = sellerStats.slice(0, 10).map(s => ({
    name: s.name.split(' ')[0],
    vendas: s.sales,
  }));

  const formatPrice = (price: number) => 
    price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Vendedores</h1>
          <p className="text-muted-foreground">Gerencie os vendedores da loja física</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
              <SelectItem value="90d">90 dias</SelectItem>
            </SelectContent>
          </Select>

          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Vendedor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingSeller ? 'Editar Vendedor' : 'Novo Vendedor'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nome do Vendedor *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: João Silva"
                    />
                  </div>
                  <div>
                    <Label htmlFor="code">Código *</Label>
                    <Input
                      id="code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="Ex: JOAO10"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Código que o cliente digita no checkout
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="discount">Desconto (%)</Label>
                      <Input
                        id="discount"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.discount_percent}
                        onChange={(e) => setFormData({ ...formData, discount_percent: Number(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        0 = só rastreia vendas
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="commission">Comissão (%)</Label>
                      <Input
                        id="commission"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.commission_percent}
                        onChange={(e) => setFormData({ ...formData, commission_percent: Number(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Para cálculo de comissões
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="active">Ativo</Label>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={handleCloseDialog}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas por Vendedores</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(totalSalesBySellers)}</div>
            <p className="text-xs text-muted-foreground">
              {period === '7d' ? 'Últimos 7 dias' : period === '30d' ? 'Últimos 30 dias' : 'Últimos 90 dias'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrdersBySellers}</div>
            <p className="text-xs text-muted-foreground">Via códigos de vendedor</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(avgTicket)}</div>
            <p className="text-xs text-muted-foreground">Por pedido</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendedores Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sellers.filter(s => s.is_active).length}</div>
            <p className="text-xs text-muted-foreground">De {sellers.length} cadastrados</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ranking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Ranking de Vendedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sellerStats.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma venda no período</p>
            ) : (
              <div className="space-y-3">
                {sellerStats.slice(0, 5).map((seller, index) => (
                  <div key={seller.code} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-yellow-500 text-yellow-950' :
                      index === 1 ? 'bg-gray-300 text-gray-800' :
                      index === 2 ? 'bg-orange-400 text-orange-950' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{seller.name}</p>
                      <p className="text-xs text-muted-foreground">{seller.orders} pedidos</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatPrice(seller.sales)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Vendas por Vendedor</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum dado para exibir</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} tickFormatter={(v) => `R$${v/1000}k`} />
                  <Tooltip formatter={(value) => formatPrice(Number(value))} />
                  <Bar dataKey="vendas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sellers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Vendedores</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : sellers.length === 0 ? (
            <p className="text-muted-foreground">Nenhum vendedor cadastrado</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead className="text-center">Desconto</TableHead>
                    <TableHead className="text-center">Comissão</TableHead>
                    <TableHead className="text-right">Vendas Totais</TableHead>
                    <TableHead className="text-center">Pedidos</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellers.map((seller) => (
                    <TableRow key={seller.id}>
                      <TableCell className="font-medium">{seller.name}</TableCell>
                      <TableCell>
                        <code className="bg-muted px-2 py-1 rounded text-sm">{seller.code}</code>
                      </TableCell>
                      <TableCell className="text-center">
                        {seller.discount_percent > 0 ? (
                          <Badge variant="secondary">{seller.discount_percent}%</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {seller.commission_percent > 0 ? (
                          <span>{seller.commission_percent}%</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatPrice(seller.total_sales)}
                      </TableCell>
                      <TableCell className="text-center">{seller.total_orders}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={seller.is_active ? 'default' : 'secondary'}>
                          {seller.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(seller)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Sellers;
