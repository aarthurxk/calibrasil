import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Shield, User, UserCog, Plus, Truck, Store, Bug } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { UserDetailsDialog } from '@/components/admin/UserDetailsDialog';

interface UserWithRole {
  user_id: string;
  role: 'admin' | 'manager' | 'customer';
  profile: {
    full_name: string | null;
    phone: string | null;
  } | null;
}

interface StoreSettings {
  id: string;
  store_name: string;
  store_email: string;
  store_description: string;
  currency: string;
  tax_rate: number;
  free_shipping_threshold: number;
  standard_shipping_rate: number;
  delivery_min_days: number;
  delivery_max_days: number;
  shipping_mode: 'correios' | 'free' | 'fixed';
  store_pickup_enabled: boolean;
  store_pickup_address: string | null;
  notify_orders: boolean;
  notify_low_stock: boolean;
  notify_messages: boolean;
  notify_abandoned_cart: boolean;
  diagnostic_test_email: string;
}

const ROLE_CONFIG = {
  admin: { label: 'Admin', icon: Shield, variant: 'default' as const },
  manager: { label: 'Gerente', icon: UserCog, variant: 'secondary' as const },
  customer: { label: 'Cliente', icon: User, variant: 'outline' as const },
};

const SHIPPING_MODE_OPTIONS = [
  { value: 'correios', label: '📦 Correios (API)', description: 'Calcular frete via API dos Correios' },
  { value: 'free', label: '🎁 Frete Grátis (Teste)', description: 'Todos os pedidos com frete grátis' },
  { value: 'fixed', label: '💰 Taxa Fixa', description: 'Usar valor fixo configurado' },
];

const Settings = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  
  // User details dialog state
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [isUserDetailsOpen, setIsUserDetailsOpen] = useState(false);
  
  // New user form state
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'manager' | 'customer'>('customer');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // Store settings state
  const [settings, setSettings] = useState<StoreSettings | null>(null);

  // Fetch users with roles
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .order('role');
      
      if (rolesError) throw rolesError;
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone');
      
      if (profilesError) throw profilesError;
      
      const combined: UserWithRole[] = (roles || []).map(role => ({
        user_id: role.user_id,
        role: role.role as 'admin' | 'manager' | 'customer',
        profile: profiles?.find(p => p.user_id === role.user_id) || null
      }));
      
      return combined;
    },
    enabled: isAdmin,
  });

  // Fetch store settings
  const { data: storeSettings, isLoading: loadingSettings } = useQuery({
    queryKey: ['store-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as StoreSettings | null;
    },
    enabled: isAdmin,
  });

  // Update local state when store settings are fetched
  useEffect(() => {
    if (storeSettings) {
      setSettings(storeSettings);
    }
  }, [storeSettings]);

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: 'admin' | 'manager' | 'customer' }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Permissão atualizada!');
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
    },
    onError: () => {
      toast.error('Erro ao atualizar permissão');
    },
  });

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<StoreSettings>) => {
      if (!settings?.id) throw new Error('Settings not loaded');
      
      const { error } = await supabase
        .from('store_settings')
        .update(newSettings)
        .eq('id', settings.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Configurações salvas!');
      queryClient.invalidateQueries({ queryKey: ['store-settings'] });
      queryClient.invalidateQueries({ queryKey: ['store-settings-public'] });
    },
    onError: () => {
      toast.error('Erro ao salvar configurações');
    },
  });

  // Create user handler
  const handleCreateUser = async () => {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (newUserPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsCreatingUser(true);
    try {
      const response = await supabase.functions.invoke('create-user', {
        body: {
          email: newUserEmail.trim(),
          password: newUserPassword,
          full_name: newUserName.trim(),
          role: newUserRole
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast.success('Usuário criado com sucesso!');
      setIsAddUserOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('customer');
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Erro ao criar usuário');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleSave = () => {
    if (!settings) return;
    
    saveSettingsMutation.mutate({
      store_name: settings.store_name,
      store_email: settings.store_email,
      store_description: settings.store_description,
      currency: settings.currency,
      tax_rate: settings.tax_rate,
      free_shipping_threshold: settings.free_shipping_threshold,
      standard_shipping_rate: settings.standard_shipping_rate,
      delivery_min_days: settings.delivery_min_days,
      delivery_max_days: settings.delivery_max_days,
      shipping_mode: settings.shipping_mode,
      store_pickup_enabled: settings.store_pickup_enabled,
      store_pickup_address: settings.store_pickup_address,
      notify_orders: settings.notify_orders,
      notify_low_stock: settings.notify_low_stock,
      notify_messages: settings.notify_messages,
      notify_abandoned_cart: settings.notify_abandoned_cart,
      diagnostic_test_email: settings.diagnostic_test_email,
    });
  };

  const updateSetting = <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) => {
    setSettings(prev => prev ? { ...prev, [key]: value } : null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">Gerencie as configurações da sua loja</p>
      </div>

      {/* User Management - Admin Only */}
      {isAdmin && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Gestão de Usuários
            </CardTitle>
            <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Adicionar Usuário
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="newUserName">Nome Completo *</Label>
                    <Input
                      id="newUserName"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Nome do usuário"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newUserEmail">E-mail *</Label>
                    <Input
                      id="newUserEmail"
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newUserPassword">Senha Inicial *</Label>
                    <Input
                      id="newUserPassword"
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  <div>
                    <Label>Permissão</Label>
                    <Select value={newUserRole} onValueChange={(v: 'admin' | 'manager' | 'customer') => setNewUserRole(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">Cliente</SelectItem>
                        <SelectItem value="manager">Gerente</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateUser} disabled={isCreatingUser}>
                    {isCreatingUser ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Criando...
                      </>
                    ) : (
                      'Cadastrar'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhum usuário cadastrado.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Permissão Atual</TableHead>
                    <TableHead>Alterar Para</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => {
                    const roleConfig = ROLE_CONFIG[user.role];
                    const RoleIcon = roleConfig.icon;
                    
                    return (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <button
                            className="font-medium text-primary hover:underline cursor-pointer text-left"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsUserDetailsOpen(true);
                            }}
                          >
                            {user.profile?.full_name || 'Sem nome'}
                          </button>
                          <div className="text-xs text-muted-foreground">
                            {user.user_id.slice(0, 8)}...
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.profile?.phone || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={roleConfig.variant} className="gap-1">
                            <RoleIcon className="h-3 w-3" />
                            {roleConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(value: 'admin' | 'manager' | 'customer') => {
                              updateRoleMutation.mutate({ userId: user.user_id, newRole: value });
                            }}
                            disabled={updateRoleMutation.isPending}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="manager">Gerente</SelectItem>
                              <SelectItem value="customer">Cliente</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Store Information */}
      <Card>
        <CardHeader>
          <CardTitle>Informações da Loja</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingSettings ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="storeName">Nome da Loja</Label>
                  <Input 
                    id="storeName" 
                    value={settings?.store_name || ''} 
                    onChange={(e) => updateSetting('store_name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="storeEmail">E-mail da Loja</Label>
                  <Input 
                    id="storeEmail" 
                    type="email" 
                    value={settings?.store_email || ''} 
                    onChange={(e) => updateSetting('store_email', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="storeDescription">Descrição da Loja</Label>
                <Input
                  id="storeDescription"
                  value={settings?.store_description || ''}
                  onChange={(e) => updateSetting('store_description', e.target.value)}
                />
              </div>
            </>
          )}
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
            <Switch 
              checked={settings?.notify_orders ?? true} 
              onCheckedChange={(checked) => updateSetting('notify_orders', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Alertas de Estoque Baixo</p>
              <p className="text-sm text-muted-foreground">
                Seja notificado quando produtos estiverem acabando
              </p>
            </div>
            <Switch 
              checked={settings?.notify_low_stock ?? true} 
              onCheckedChange={(checked) => updateSetting('notify_low_stock', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Mensagens de Clientes</p>
              <p className="text-sm text-muted-foreground">
                Receba notificações de dúvidas dos clientes
              </p>
            </div>
            <Switch 
              checked={settings?.notify_messages ?? true} 
              onCheckedChange={(checked) => updateSetting('notify_messages', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">E-mails de Carrinho Abandonado</p>
              <p className="text-sm text-muted-foreground">
                Envie automaticamente e-mails de recuperação pros clientes
              </p>
            </div>
            <Switch 
              checked={settings?.notify_abandoned_cart ?? false} 
              onCheckedChange={(checked) => updateSetting('notify_abandoned_cart', checked)}
            />
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
              <Input 
                id="currency" 
                value={settings?.currency || 'BRL'} 
                onChange={(e) => updateSetting('currency', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="taxRate">Taxa de Impostos (%)</Label>
              <Input 
                id="taxRate" 
                type="number" 
                value={settings?.tax_rate ?? 12} 
                onChange={(e) => updateSetting('tax_rate', Number(e.target.value))}
              />
            </div>
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong className="text-primary">Gateway de Pagamento:</strong> Stripe e Mercado Pago estão configurados.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Shipping Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Configurações de Frete
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Shipping Mode */}
          <div>
            <Label htmlFor="shippingMode" className="text-base font-medium">Modo de Frete</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Escolha como o frete será calculado para os clientes
            </p>
            <Select 
              value={settings?.shipping_mode || 'correios'} 
              onValueChange={(v: 'correios' | 'free' | 'fixed') => updateSetting('shipping_mode', v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHIPPING_MODE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {settings?.shipping_mode === 'free' && (
              <div className="mt-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-sm text-primary font-medium">🎉 Modo de teste ativo!</p>
                <p className="text-xs text-muted-foreground">
                  Todos os pedidos terão frete grátis. Ideal para testar a loja.
                </p>
              </div>
            )}
          </div>

          {/* Fixed Rate Settings (only show when mode is fixed or correios) */}
          {(settings?.shipping_mode === 'fixed' || settings?.shipping_mode === 'correios') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="freeShipping">Frete Grátis a partir de (R$)</Label>
                <Input 
                  id="freeShipping" 
                  type="number" 
                  value={settings?.free_shipping_threshold ?? 250} 
                  onChange={(e) => updateSetting('free_shipping_threshold', Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Pedidos acima deste valor terão frete grátis
                </p>
              </div>
              <div>
                <Label htmlFor="standardShipping">Taxa de Frete Padrão (R$)</Label>
                <Input 
                  id="standardShipping" 
                  type="number" 
                  step="0.01"
                  value={settings?.standard_shipping_rate ?? 29.90} 
                  onChange={(e) => updateSetting('standard_shipping_rate', Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {settings?.shipping_mode === 'fixed' 
                    ? 'Valor fixo cobrado quando abaixo do limite de frete grátis'
                    : 'Valor usado como fallback quando API dos Correios falha'}
                </p>
              </div>
            </div>
          )}

          {/* Delivery Time Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="deliveryMinDays">Prazo Mínimo (dias úteis)</Label>
              <Input 
                id="deliveryMinDays" 
                type="number" 
                value={settings?.delivery_min_days ?? 5} 
                onChange={(e) => updateSetting('delivery_min_days', Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="deliveryMaxDays">Prazo Máximo (dias úteis)</Label>
              <Input 
                id="deliveryMaxDays" 
                type="number" 
                value={settings?.delivery_max_days ?? 10} 
                onChange={(e) => updateSetting('delivery_max_days', Number(e.target.value))}
              />
            </div>
          </div>

          {/* Store Pickup */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Retirada na Loja</p>
                  <p className="text-sm text-muted-foreground">
                    Permitir que clientes retirem pedidos na loja física
                  </p>
                </div>
              </div>
              <Switch 
                checked={settings?.store_pickup_enabled ?? true} 
                onCheckedChange={(checked) => updateSetting('store_pickup_enabled', checked)}
              />
            </div>
            
            {settings?.store_pickup_enabled && (
              <div>
                <Label htmlFor="storePickupAddress">Endereço da Loja para Retirada</Label>
                <Textarea 
                  id="storePickupAddress" 
                  value={settings?.store_pickup_address || ''} 
                  onChange={(e) => updateSetting('store_pickup_address', e.target.value)}
                  placeholder="Ex: Shopping RioMar, Av. República do Líbano, 251 - Piso L1, Recife - PE"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Este endereço será exibido aos clientes que escolherem retirar na loja
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* System / Diagnostic Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Sistema e Diagnóstico
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="diagnosticTestEmail">Email para Testes de Diagnóstico</Label>
            <Input 
              id="diagnosticTestEmail" 
              type="email" 
              value={settings?.diagnostic_test_email || 'teste-diag@cali.com.br'} 
              onChange={(e) => updateSetting('diagnostic_test_email', e.target.value)}
              placeholder="email@exemplo.com"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Os emails de teste do diagnóstico serão enviados para este endereço
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saveSettingsMutation.isPending}>
          {saveSettingsMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Salvando...
            </>
          ) : (
            'Salvar Configurações'
          )}
        </Button>
      </div>

      {/* User Details Dialog */}
      <UserDetailsDialog
        user={selectedUser}
        open={isUserDetailsOpen}
        onOpenChange={setIsUserDetailsOpen}
      />
    </div>
  );
};

export default Settings;
