import { Search, Mail, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const mockCustomers = [
  {
    id: '1',
    name: 'João Silva',
    email: 'joao@exemplo.com',
    orders: 12,
    totalSpent: 6499.90,
    joined: '2024-01-15',
  },
  {
    id: '2',
    name: 'Maria Santos',
    email: 'maria@exemplo.com',
    orders: 8,
    totalSpent: 4499.90,
    joined: '2024-02-20',
  },
  {
    id: '3',
    name: 'Pedro Oliveira',
    email: 'pedro@exemplo.com',
    orders: 5,
    totalSpent: 2299.90,
    joined: '2024-03-10',
  },
  {
    id: '4',
    name: 'Ana Costa',
    email: 'ana@exemplo.com',
    orders: 3,
    totalSpent: 1449.90,
    joined: '2024-04-05',
  },
];

const formatPrice = (price: number) => {
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const Customers = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Clientes</h1>
        <p className="text-muted-foreground">Gerencie o relacionamento com seus clientes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5.678</div>
            <p className="text-sm text-green-600">+15% desde o mês passado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clientes Recorrentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.345</div>
            <p className="text-sm text-muted-foreground">41% do total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Valor Médio por Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 937,50</div>
            <p className="text-sm text-green-600">+8% desde o mês passado</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar clientes..." className="pl-10" />
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Todos os Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Cliente
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Pedidos
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Total Gasto
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Membro Desde
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockCustomers.map((customer) => (
                  <tr key={customer.id} className="border-b border-border last:border-0">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-ocean flex items-center justify-center">
                          <User className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {customer.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">{customer.orders}</td>
                    <td className="py-3 px-4 font-medium">
                      {formatPrice(customer.totalSpent)}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(customer.joined).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="icon">
                        <Mail className="h-4 w-4" />
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

export default Customers;
