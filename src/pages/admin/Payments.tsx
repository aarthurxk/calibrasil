import { DollarSign, CreditCard, ArrowUpRight, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const mockPayments = [
  {
    id: 'PAY-001',
    orderId: '#ORD-1234',
    customer: 'John Doe',
    amount: 459.99,
    method: 'Credit Card',
    status: 'Completed',
    date: '2024-12-07',
  },
  {
    id: 'PAY-002',
    orderId: '#ORD-1235',
    customer: 'Jane Smith',
    amount: 149.99,
    method: 'Credit Card',
    status: 'Pending',
    date: '2024-12-07',
  },
  {
    id: 'PAY-003',
    orderId: '#ORD-1236',
    customer: 'Bob Wilson',
    amount: 299.99,
    method: 'PayPal',
    status: 'Completed',
    date: '2024-12-06',
  },
  {
    id: 'PAY-004',
    orderId: '#ORD-1237',
    customer: 'Alice Brown',
    amount: 589.99,
    method: 'Credit Card',
    status: 'Failed',
    date: '2024-12-06',
  },
];

const Payments = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-muted-foreground">Monitor and manage payment transactions</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue (This Month)
            </CardTitle>
            <DollarSign className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$45,231.89</div>
            <div className="flex items-center text-sm text-green-600">
              <ArrowUpRight className="h-4 w-4" />
              +12.5% from last month
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Successful Payments
            </CardTitle>
            <CreditCard className="h-5 w-5 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,156</div>
            <p className="text-sm text-muted-foreground">98.2% success rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Payments
            </CardTitle>
            <CreditCard className="h-5 w-5 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23</div>
            <p className="text-sm text-muted-foreground">$3,456.00 pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Payment ID
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Order
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Customer
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Amount
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Method
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-border last:border-0">
                    <td className="py-3 px-4 font-medium">{payment.id}</td>
                    <td className="py-3 px-4 text-primary">{payment.orderId}</td>
                    <td className="py-3 px-4">{payment.customer}</td>
                    <td className="py-3 px-4 font-medium">${payment.amount.toFixed(2)}</td>
                    <td className="py-3 px-4">{payment.method}</td>
                    <td className="py-3 px-4">
                      <Badge
                        className={
                          payment.status === 'Completed'
                            ? 'bg-green-100 text-green-800'
                            : payment.status === 'Pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {payment.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(payment.date).toLocaleDateString()}
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
              <h3 className="font-semibold text-primary">Payment Processing</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Connect Lovable Cloud and enable Stripe to process real payments, manage subscriptions, and automate refunds.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Payments;
