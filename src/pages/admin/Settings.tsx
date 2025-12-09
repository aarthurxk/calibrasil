import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Shield, User, UserCog } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface UserWithRole {
  user_id: string;
  role: 'admin' | 'manager' | 'customer';
  profile: {
    full_name: string | null;
    phone: string | null;
  } | null;
}

const ROLE_CONFIG = {
  admin: { label: 'Admin', icon: Shield, variant: 'default' as const },
  manager: { label: 'Gerente', icon: UserCog, variant: 'secondary' as const },
  customer: { label: 'Cliente', icon: User, variant: 'outline' as const },
};

const Settings = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  // Fetch users with roles
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          role,
          profile:profiles!user_roles_user_id_fkey(full_name, phone)
        `)
        .order('role');
      
      if (error) throw error;
      return data as unknown as UserWithRole[];
    },
    enabled: isAdmin,
  });

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

  const handleSave = () => {
    toast.info('Gerenciamento de configurações requer backend. Conecte o Lovable Cloud pra ativar essa função.');
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Gestão de Usuários
            </CardTitle>
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
                          <div className="font-medium">
                            {user.profile?.full_name || 'Sem nome'}
                          </div>
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
          <div className="p-4 bg-muted rounded-lg">
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
        <Button onClick={handleSave}>
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
};

export default Settings;
