import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Loader2, Trash2, Package, Calendar, Phone, Shield, UserCog } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UserWithRole {
  user_id: string;
  role: 'admin' | 'manager' | 'customer';
  profile: {
    full_name: string | null;
    phone: string | null;
  } | null;
}

interface UserDetailsDialogProps {
  user: UserWithRole | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLE_CONFIG = {
  admin: { label: 'Admin', icon: Shield, variant: 'default' as const },
  manager: { label: 'Gerente', icon: UserCog, variant: 'secondary' as const },
  customer: { label: 'Cliente', icon: User, variant: 'outline' as const },
};

const formatPrice = (price: number) => {
  return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const getStatusLabel = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: 'Pendente',
    processing: 'Processando',
    shipped: 'Enviado',
    delivered: 'Entregue',
    cancelled: 'Cancelado',
    awaiting_payment: 'Aguardando Pagamento',
  };
  return statusMap[status] || status;
};

const getStatusVariant = (status: string) => {
  if (status === 'delivered') return 'default';
  if (status === 'cancelled') return 'destructive';
  if (status === 'shipped') return 'secondary';
  return 'outline';
};

export function UserDetailsDialog({ user, open, onOpenChange }: UserDetailsDialogProps) {
  const { isAdmin, user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [editedRole, setEditedRole] = useState<'admin' | 'manager' | 'customer'>('customer');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch user's profile from profiles table to get created_at
  const { data: profileData } = useQuery({
    queryKey: ['user-profile-details', user?.user_id],
    queryFn: async () => {
      if (!user?.user_id) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('user_id', user.user_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.user_id && open,
  });

  // Fetch user orders
  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['user-orders', user?.user_id],
    queryFn: async () => {
      if (!user?.user_id) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('user_id', user.user_id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.user_id && open,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async ({ fullName, phone }: { fullName: string; phone: string }) => {
      if (!user?.user_id) throw new Error('No user');
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: fullName,
          phone: phone || null 
        })
        .eq('user_id', user.user_id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Perfil atualizado!');
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
    },
    onError: () => {
      toast.error('Erro ao atualizar perfil');
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async (newRole: 'admin' | 'manager' | 'customer') => {
      if (!user?.user_id) throw new Error('No user');
      
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', user.user_id);
      
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

  // Delete user handler
  const handleDelete = async () => {
    if (!user?.user_id) return;
    
    // Prevent self-deletion
    if (user.user_id === currentUser?.id) {
      toast.error('Você não pode deletar sua própria conta');
      return;
    }
    
    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId: user.user_id }
      });
      
      if (error) throw error;
      
      toast.success('Usuário deletado com sucesso');
      setShowDeleteConfirm(false);
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Erro ao deletar usuário');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStartEdit = () => {
    setEditedName(user?.profile?.full_name || '');
    setEditedPhone(user?.profile?.phone || '');
    setEditedRole(user?.role || 'customer');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    await updateProfileMutation.mutateAsync({
      fullName: editedName,
      phone: editedPhone
    });
    
    if (editedRole !== user?.role) {
      await updateRoleMutation.mutateAsync(editedRole);
    }
    
    setIsEditing(false);
  };

  if (!user) return null;

  const roleConfig = ROLE_CONFIG[user.role];
  const RoleIcon = roleConfig.icon;
  const isSelf = user.user_id === currentUser?.id;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-ocean flex items-center justify-center">
                <RoleIcon className="h-5 w-5 text-primary-foreground" />
              </div>
              {isEditing ? 'Editar Usuário' : 'Detalhes do Usuário'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* User Info */}
            <div className="space-y-4">
              {isEditing ? (
                <>
                  <div>
                    <Label htmlFor="editUserName">Nome Completo</Label>
                    <Input
                      id="editUserName"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      placeholder="Nome do usuário"
                    />
                  </div>
                  <div>
                    <Label htmlFor="editUserPhone">Telefone</Label>
                    <Input
                      id="editUserPhone"
                      value={editedPhone}
                      onChange={(e) => setEditedPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div>
                    <Label>Permissão</Label>
                    <Select 
                      value={editedRole} 
                      onValueChange={(v: 'admin' | 'manager' | 'customer') => setEditedRole(v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Gerente</SelectItem>
                        <SelectItem value="customer">Cliente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Nome:</span>
                    <span className="font-medium">{user.profile?.full_name || 'Sem nome'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Telefone:</span>
                    <span className="font-medium">{user.profile?.phone || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Permissão:</span>
                    <Badge variant={roleConfig.variant} className="gap-1">
                      <RoleIcon className="h-3 w-3" />
                      {roleConfig.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Membro desde:</span>
                    <span className="font-medium">
                      {profileData?.created_at 
                        ? new Date(profileData.created_at).toLocaleDateString('pt-BR')
                        : '-'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Orders Section */}
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Package className="h-5 w-5" />
                Últimas Compras
              </h3>
              
              {loadingOrders ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : orders.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  Nenhuma compra realizada
                </p>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="p-3 border border-border rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            #{order.id.slice(0, 8)}
                          </span>
                          <Badge variant={getStatusVariant(order.status)}>
                            {getStatusLabel(order.status)}
                          </Badge>
                        </div>
                        <span className="font-semibold text-primary">
                          {formatPrice(Number(order.total))}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {new Date(order.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        <span>
                          {order.order_items?.length || 0} {order.order_items?.length === 1 ? 'item' : 'itens'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={updateProfileMutation.isPending || updateRoleMutation.isPending}
                >
                  {(updateProfileMutation.isPending || updateRoleMutation.isPending) ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </Button>
              </>
            ) : (
              <>
                {isAdmin && !isSelf && (
                  <Button
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="gap-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    Deletar
                  </Button>
                )}
                {isAdmin && (
                  <Button onClick={handleStartEdit}>Editar</Button>
                )}
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Fechar
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar "{user.profile?.full_name || 'este usuário'}"? 
              Esta ação não pode ser desfeita e todos os dados do usuário serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deletando...
                </>
              ) : (
                'Deletar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
