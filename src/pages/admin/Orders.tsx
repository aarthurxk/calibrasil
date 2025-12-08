import { Search, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const mockOrders = [
  {
    id: '#PED-1234',
    customer: 'João Silva',
    email: 'joao@exemplo.com',
    items: 3,
    total: 2299.90,
    status: 'Entregue',
    date: '2024-12-07',
  },
  {
    id: '#PED-1235',
    customer: 'Maria Santos',
    email: 'maria@exemplo.com',
    items: 1,
    total: 749.90,
    status: 'Processando',
    date: '2024-12-07',
  },
  {
    id: '#PED-1236',
    customer: 'Pedro Oliveira',
    email: 'pedro@exemplo.com',
    items: 2,
    total: 1499.90,
    status: 'Enviado',
    date: '2024-12-06',
  },
  {
    id: '#PED-1237',
    customer: 'Ana Costa',
    email: 'ana@exemplo.com',
    items: 4,
    total: 2949.90,
    status: 'Pendente',
    date: '2024-12-06',
  },
  {
    id: '#PED-1238',
    customer: 'Carlos Souza',
    email: 'carlos@exemplo.com',
    items: 1,
    total: 449.90,
    status: 'Cancelado',
    date: '2024-12-05',
  },
];

const getStatusBadge = (status: string) => {
  const styles: Record<string, string> = {
    Entregue: 'bg-green-100 text-green-800',
    Processando: 'bg-blue-100 text-blue-800',
    Enviado: 'bg-purple-100 text-purple-800',
    Pendente: 'bg-yellow-100 text-yellow-800',
    Cancelado: 'bg-red-100 text-red-800',
  };
  return styles[status] || 'bg-gray-100 text-gray-800';
};

const formatPrice = (price: number) => {
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const Orders = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pedidos</h1>
        <p className="text-muted-foreground">Gerencie e acompanhe os pedidos dos clientes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.234</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">23</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Processando
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">45</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Enviados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">67</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar pedidos por ID ou cliente..." className="pl-10" />
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pedidos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    ID do Pedido
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Cliente
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Itens
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Total
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Data
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockOrders.map((order) => (
                  <tr key={order.id} className="border-b border-border last:border-0">
                    <td className="py-3 px-4 font-medium">{order.id}</td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{order.customer}</p>
                        <p className="text-sm text-muted-foreground">{order.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">{order.items}</td>
                    <td className="py-3 px-4 font-medium">{formatPrice(order.total)}</td>
                    <td className="py-3 px-4">
                      <Badge className={getStatusBadge(order.status)}>
                        {order.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(order.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Orders;
