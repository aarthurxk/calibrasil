import { DollarSign, CreditCard, ArrowUpRight, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const mockPayments = [
  {
    id: 'PAG-001',
    orderId: '#PED-1234',
    customer: 'João Silva',
    amount: 2299.90,
    method: 'Cartão de Crédito',
    status: 'Aprovado',
    date: '2024-12-07',
  },
  {
    id: 'PAG-002',
    orderId: '#PED-1235',
    customer: 'Maria Santos',
    amount: 749.90,
    method: 'Cartão de Crédito',
    status: 'Pendente',
    date: '2024-12-07',
  },
  {
    id: 'PAG-003',
    orderId: '#PED-1236',
    customer: 'Pedro Oliveira',
    amount: 1499.90,
    method: 'PIX',
    status: 'Aprovado',
    date: '2024-12-06',
  },
  {
    id: 'PAG-004',
    orderId: '#PED-1237',
    customer: 'Ana Costa',
    amount: 2949.90,
    method: 'Cartão de Crédito',
    status: 'Recusado',
    date: '2024-12-06',
  },
];

const formatPrice = (price: number) => {
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const Payments = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Pagamentos</h1>
          <p className="text-muted-foreground">Monitore e gerencie as transações de pagamento</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar Relatório
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receita Total (Este Mês)
            </CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 226.159,45</div>
            <div className="flex items-center text-sm text-green-600">
              <ArrowUpRight className="h-4 w-4" />
              +12.5% desde o mês passado
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pagamentos Aprovados
            </CardTitle>
            <CreditCard className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.156</div>
            <p className="text-sm text-muted-foreground">98.2% de aprovação</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pagamentos Pendentes
            </CardTitle>
            <CreditCard className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-sm text-muted-foreground">R$ 17.280,00 pendente</p>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    ID do Pagamento
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Pedido
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Cliente
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Valor
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Método
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Data
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-border last:border-0">
                    <td className="py-3 px-4 font-medium">{payment.id}</td>
                    <td className="py-3 px-4 text-primary">{payment.orderId}</td>
                    <td className="py-3 px-4">{payment.customer}</td>
                    <td className="py-3 px-4 font-medium">{formatPrice(payment.amount)}</td>
                    <td className="py-3 px-4">{payment.method}</td>
                    <td className="py-3 px-4">
                      <Badge
                        className={
                          payment.status === 'Aprovado'
                            ? 'bg-green-100 text-green-800'
                            : payment.status === 'Pendente'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {payment.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(payment.date).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Note about Stripe Integration */}
      <Card className="border-primary/50 bg-cali-teal-light">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <CreditCard className="h-6 w-6 text-primary mt-1" />
            <div>
              <h3 className="font-semibold text-primary">Processamento de Pagamentos</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Conecte o Lovable Cloud e ative o Stripe para processar pagamentos reais, gerenciar assinaturas e automatizar reembolsos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Payments;
