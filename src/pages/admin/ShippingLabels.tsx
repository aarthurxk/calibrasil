import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Printer, Package, Search, Loader2, Tag, CheckCircle2, AlertTriangle, Shield, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { ShippingLabelPrint, ShippingLabelPrintData } from '@/components/shipping/ShippingLabelPrint';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ShippingAddress {
  firstName?: string;
  lastName?: string;
  name?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip?: string;
  cep?: string;
}

interface Order {
  id: string;
  created_at: string;
  status: string;
  payment_status: string | null;
  total: number;
  shipping_address: ShippingAddress | null;
  shipping_method: string | null;
  tracking_code: string | null;
  label_generated: boolean | null;
  user_id: string | null;
  guest_email: string | null;
  phone: string | null;
}

interface CredentialStatus {
  configured: boolean;
  environment: string;
  details: {
    user: boolean;
    password: boolean;
    cnpj: boolean;
    contractCode: boolean;
    cardCode: boolean;
    adminCode: boolean;
  };
}

interface ConnectionTestResult {
  success: boolean;
  test: boolean;
  connected: boolean;
  credentialStatus: CredentialStatus;
  sigepResponse?: string;
  environment?: string;
  wsdlUrl?: string;
}

const ShippingLabels = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [serviceType, setServiceType] = useState<'PAC' | 'SEDEX'>('PAC');
  const [labelDialogOpen, setLabelDialogOpen] = useState(false);
  const [currentLabelData, setCurrentLabelData] = useState<ShippingLabelPrintData | null>(null);
  const [sigepEnvironment, setSigepEnvironment] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionTestResult | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Test SIGEP connection on mount
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('generate-sigep-label', {
        body: { test: true },
      });

      if (error) throw error;
      return data as ConnectionTestResult;
    },
    onSuccess: (data) => {
      setConnectionStatus(data);
      setSigepEnvironment(data.environment || 'simulated');
      
      if (data.connected) {
        toast.success('Conexão SIGEP OK!');
      } else if (data.credentialStatus?.configured) {
        toast.warning(`Credenciais configuradas, mas conexão falhou: ${data.sigepResponse}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro ao testar conexão: ${error.message}`);
      setConnectionStatus(null);
    },
  });

  // Test connection on mount
  useEffect(() => {
    testConnectionMutation.mutate();
  }, []);

  // Fetch orders ready for shipping
  const { data: orders, isLoading } = useQuery({
    queryKey: ['shipping-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['processing', 'paid', 'pending'])
        .in('payment_status', ['paid', 'approved'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Order[];
    },
  });

  // Generate label mutation
  const generateLabelMutation = useMutation({
    mutationFn: async ({ orderId, serviceType, weight }: { orderId: string; serviceType: 'PAC' | 'SEDEX'; weight: number }) => {
      const { data, error } = await supabase.functions.invoke('generate-sigep-label', {
        body: { orderId, serviceType, weight, declaredValue: undefined },
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erro ao gerar etiqueta');

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shipping-orders'] });
      setLastError(null);
      
      // Track environment
      if (data.environment) {
        setSigepEnvironment(data.environment);
      }
      
      // Open label dialog with data
      setCurrentLabelData({
        trackingCode: data.trackingCode,
        etiquetaNumber: data.etiquetaNumber,
        serviceType: data.orderData.serviceType,
        sender: data.sender,
        receiver: data.receiver,
        orderData: data.orderData,
      });
      setLabelDialogOpen(true);
      
      const envLabel = data.isSimulated ? ' (SIMULADA)' : data.environment === 'homologation' ? ' (HOMOLOGAÇÃO)' : '';
      
      if (data.errorDetails) {
        toast.warning(`Etiqueta gerada em modo fallback${envLabel}: ${data.errorDetails}`);
      } else {
        toast.success(`Etiqueta gerada: ${data.trackingCode}${envLabel}`);
      }
    },
    onError: (error: Error) => {
      setLastError(error.message);
      toast.error(`Erro ao gerar etiqueta: ${error.message}`);
    },
  });

  const handleGenerateLabel = (orderId: string) => {
    generateLabelMutation.mutate({ orderId, serviceType, weight: 0.5 });
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrders([...selectedOrders, orderId]);
    } else {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && filteredOrders) {
      setSelectedOrders(filteredOrders.filter(o => !o.label_generated).map(o => o.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const getRecipientName = (address: ShippingAddress | null) => {
    if (!address) return 'N/A';
    return address.name || `${address.firstName || ''} ${address.lastName || ''}`.trim() || 'N/A';
  };

  const getRecipientAddress = (address: ShippingAddress | null) => {
    if (!address) return 'N/A';
    return `${address.street || ''}, ${address.number || ''} - ${address.city || ''} / ${address.state || ''}`;
  };

  // Filter orders
  const filteredOrders = orders?.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getRecipientName(order.shipping_address).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'pending' && !order.label_generated) ||
      (statusFilter === 'generated' && order.label_generated);

    return matchesSearch && matchesStatus;
  });

  const pendingCount = orders?.filter(o => !o.label_generated).length || 0;
  const generatedCount = orders?.filter(o => o.label_generated).length || 0;

  const getEnvironmentBadge = () => {
    if (!sigepEnvironment) return null;
    
    const config = {
      production: { label: 'PRODUÇÃO', className: 'bg-green-500 hover:bg-green-600' },
      homologation: { label: 'HOMOLOGAÇÃO', className: 'bg-orange-500 hover:bg-orange-600' },
      simulated: { label: 'SIMULADO', className: 'bg-red-500 hover:bg-red-600' },
    }[sigepEnvironment] || { label: sigepEnvironment.toUpperCase(), className: 'bg-muted' };

    return (
      <Badge variant="secondary" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Connection Status Alert */}
      {connectionStatus && (
        <Alert 
          variant={connectionStatus.connected ? 'default' : 'destructive'} 
          className={
            connectionStatus.connected 
              ? 'border-green-500/50 bg-green-500/10'
              : connectionStatus.credentialStatus?.configured 
                ? 'border-orange-500/50 bg-orange-500/10'
                : 'border-red-500/50 bg-red-500/10'
          }
        >
          {connectionStatus.connected ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-orange-500" />
          )}
          <AlertTitle className={connectionStatus.connected ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}>
            {connectionStatus.connected 
              ? `Conectado ao SIGEP (${connectionStatus.environment?.toUpperCase()})` 
              : connectionStatus.credentialStatus?.configured 
                ? 'Credenciais configuradas, mas conexão falhou'
                : 'Modo Simulado'}
          </AlertTitle>
          <AlertDescription className={connectionStatus.connected ? 'text-green-600/80 dark:text-green-400/80' : 'text-orange-600/80 dark:text-orange-400/80'}>
            {connectionStatus.connected 
              ? 'Etiquetas serão geradas através do SIGEP dos Correios.'
              : connectionStatus.sigepResponse || 'Configure as credenciais SIGEP para gerar etiquetas válidas.'}
          </AlertDescription>
          
          {/* Debug Info Collapsible */}
          <Collapsible open={showDebugInfo} onOpenChange={setShowDebugInfo} className="mt-3">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                {showDebugInfo ? 'Ocultar' : 'Ver'} detalhes técnicos
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-1 text-xs font-mono">
              <div className="grid grid-cols-2 gap-1 p-2 rounded bg-muted/50">
                <span>SIGEP_USER:</span>
                <span>{connectionStatus.credentialStatus?.details.user ? '✓' : '✗'}</span>
                <span>SIGEP_PASSWORD:</span>
                <span>{connectionStatus.credentialStatus?.details.password ? '✓' : '✗'}</span>
                <span>SIGEP_CNPJ:</span>
                <span>{connectionStatus.credentialStatus?.details.cnpj ? '✓' : '✗'}</span>
                <span>SIGEP_CONTRACT_CODE:</span>
                <span>{connectionStatus.credentialStatus?.details.contractCode ? '✓' : '✗'}</span>
                <span>SIGEP_CARD_CODE:</span>
                <span>{connectionStatus.credentialStatus?.details.cardCode ? '✓' : '✗'}</span>
                <span>SIGEP_ADMINISTRATIVE_CODE:</span>
                <span>{connectionStatus.credentialStatus?.details.adminCode ? '✓' : '✗'}</span>
              </div>
              {connectionStatus.wsdlUrl && (
                <div className="p-2 rounded bg-muted/50">
                  <span className="text-muted-foreground">URL: </span>
                  <span className="break-all">{connectionStatus.wsdlUrl}</span>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </Alert>
      )}

      {/* Last Error Alert */}
      {lastError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro na última operação</AlertTitle>
          <AlertDescription className="font-mono text-xs">{lastError}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold">Etiquetas de Envio</h1>
            <p className="text-muted-foreground">Gerencie etiquetas dos Correios para envio de pedidos</p>
          </div>
          {getEnvironmentBadge()}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => testConnectionMutation.mutate()}
          disabled={testConnectionMutation.isPending}
        >
          {testConnectionMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Testar Conexão SIGEP
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Pedidos</p>
              <p className="text-2xl font-bold">{orders?.length || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <Tag className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Aguardando Etiqueta</p>
              <p className="text-2xl font-bold">{pendingCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Etiquetas Geradas</p>
              <p className="text-2xl font-bold">{generatedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col lg:flex-row gap-4 justify-between">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por ID ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Sem etiqueta</SelectItem>
                  <SelectItem value="generated">Com etiqueta</SelectItem>
                </SelectContent>
              </Select>

              <Select value={serviceType} onValueChange={(v) => setServiceType(v as 'PAC' | 'SEDEX')}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Serviço" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAC">PAC</SelectItem>
                  <SelectItem value="SEDEX">SEDEX</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedOrders.length > 0 && (
              <Button 
                onClick={() => {
                  selectedOrders.forEach(id => handleGenerateLabel(id));
                }}
                disabled={generateLabelMutation.isPending}
              >
                {generateLabelMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4 mr-2" />
                )}
                Gerar {selectedOrders.length} Etiqueta(s)
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredOrders?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum pedido encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">
                      <Checkbox 
                        checked={selectedOrders.length === filteredOrders?.filter(o => !o.label_generated).length && selectedOrders.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="text-left py-3 px-2 font-medium">Pedido</th>
                    <th className="text-left py-3 px-2 font-medium">Data</th>
                    <th className="text-left py-3 px-2 font-medium">Cliente</th>
                    <th className="text-left py-3 px-2 font-medium">Endereço</th>
                    <th className="text-left py-3 px-2 font-medium">Total</th>
                    <th className="text-left py-3 px-2 font-medium">Status</th>
                    <th className="text-left py-3 px-2 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders?.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <Checkbox 
                          checked={selectedOrders.includes(order.id)}
                          onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                          disabled={order.label_generated === true}
                        />
                      </td>
                      <td className="py-3 px-2 font-mono text-xs">
                        #{order.id.slice(0, 8)}
                      </td>
                      <td className="py-3 px-2 text-xs text-muted-foreground">
                        {formatDate(order.created_at)}
                      </td>
                      <td className="py-3 px-2">
                        {getRecipientName(order.shipping_address)}
                      </td>
                      <td className="py-3 px-2 text-xs max-w-48 truncate">
                        {getRecipientAddress(order.shipping_address)}
                      </td>
                      <td className="py-3 px-2 font-medium">
                        {formatPrice(order.total)}
                      </td>
                      <td className="py-3 px-2">
                        {order.label_generated ? (
                          <Badge variant="default" className="bg-green-500">
                            Gerada
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            Pendente
                          </Badge>
                        )}
                        {order.tracking_code && (
                          <p className="text-xs text-muted-foreground mt-1 font-mono">
                            {order.tracking_code}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <Button
                          size="sm"
                          variant={order.label_generated ? "outline" : "default"}
                          onClick={() => handleGenerateLabel(order.id)}
                          disabled={generateLabelMutation.isPending}
                        >
                          {generateLabelMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Printer className="h-4 w-4" />
                          )}
                          <span className="ml-2 hidden sm:inline">
                            {order.label_generated ? 'Reimprimir' : 'Gerar'}
                          </span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Label Preview Dialog */}
      <Dialog open={labelDialogOpen} onOpenChange={setLabelDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Etiqueta Gerada</DialogTitle>
          </DialogHeader>
          {currentLabelData && (
            <ShippingLabelPrint 
              data={currentLabelData} 
              onClose={() => setLabelDialogOpen(false)} 
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShippingLabels;
