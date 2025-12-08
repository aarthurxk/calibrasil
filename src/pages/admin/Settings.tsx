import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

const Settings = () => {
  const handleSave = () => {
    toast.info('Gerenciamento de configurações requer backend. Conecte o Lovable Cloud pra ativar essa função.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações da sua loja</p>
      </div>

      {/* Store Information */}
      <Card>
        <CardHeader>
          <CardTitle>Informações da Loja</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="storeName">Nome da Loja</Label>
              <Input id="storeName" defaultValue="Cali Beach Tech" />
            </div>
            <div>
              <Label htmlFor="storeEmail">E-mail da Loja</Label>
              <Input id="storeEmail" type="email" defaultValue="oi@cali.com.br" />
            </div>
          </div>
          <div>
            <Label htmlFor="storeDescription">Descrição da Loja</Label>
            <Input
              id="storeDescription"
              defaultValue="Produtos beach-tech premium pro lifestyle praiano moderno"
            />
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Notificações</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Notificações de Pedidos</p>
              <p className="text-sm text-muted-foreground">
                Receba notificações por e-mail para novos pedidos
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Alertas de Estoque Baixo</p>
              <p className="text-sm text-muted-foreground">
                Seja notificado quando produtos estiverem acabando
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Mensagens de Clientes</p>
              <p className="text-sm text-muted-foreground">
                Receba notificações de dúvidas dos clientes
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">E-mails de Carrinho Abandonado</p>
              <p className="text-sm text-muted-foreground">
                Envie automaticamente e-mails de recuperação pros clientes
              </p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Payment Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="currency">Moeda</Label>
              <Input id="currency" defaultValue="BRL" />
            </div>
            <div>
              <Label htmlFor="taxRate">Taxa de Impostos (%)</Label>
              <Input id="taxRate" type="number" defaultValue="12" />
            </div>
          </div>
          <div className="p-4 bg-cali-teal-light rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong className="text-primary">Gateway de Pagamento:</strong> Conecte o Lovable Cloud 
              e ative o Stripe ou PagSeguro pra configurar o processamento de pagamentos.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Shipping */}
      <Card>
        <CardHeader>
          <CardTitle>Entrega</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="freeShipping">Frete Grátis a partir de (R$)</Label>
              <Input id="freeShipping" type="number" defaultValue="250" />
            </div>
            <div>
              <Label htmlFor="standardShipping">Taxa de Frete Padrão (R$)</Label>
              <Input id="standardShipping" type="number" defaultValue="29.90" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} className="bg-gradient-ocean text-primary-foreground">
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
};

export default Settings;
