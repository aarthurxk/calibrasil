import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Loader2, Trash2, Package, Calendar, Phone, Mail } from 'lucide-react';
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

interface Customer {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
}

interface CustomerDetailsDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

export function CustomerDetailsDialog({ customer, open, onOpenChange }: CustomerDetailsDialogProps) {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [editedEmail, setEditedEmail] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch customer email
  const { data: customerEmail, isLoading: loadingEmail } = useQuery({
    queryKey: ['customer-email', customer?.user_id],
    queryFn: async () => {
      if (!customer?.user_id) return null;
      
      const { data, error } = await supabase.functions.invoke('get-user-email', {
        body: { userId: customer.user_id }
      });
      
      if (error) throw error;
      return data?.email || null;
    },
    enabled: !!customer?.user_id && open,
  });

  // Fetch customer orders
  const { data: orders = [], isLoading: loadingOrders } = useQuery({
    queryKey: ['customer-orders', customer?.user_id],
    queryFn: async () => {
      if (!customer?.user_id) return [];
      
      const { data, error } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('user_id', customer.user_id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!customer?.user_id && open,
  });

  // Update user mutation (uses edge function for email updates)
  const updateUserMutation = useMutation({
    mutationFn: async ({ email, fullName, phone }: { email: string; fullName: string; phone: string }) => {
      if (!customer?.user_id) throw new Error('No customer');
      
      const { data, error } = await supabase.functions.invoke('update-user', {
        body: { 
          userId: customer.user_id,
          email,
          fullName,
          phone: phone || null 
        }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success('Cliente atualizado!');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer-email', customer?.user_id] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar cliente');
    },
  });

  // Delete user handler
  const handleDelete = async () => {
    if (!customer?.user_id) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-user', {
        body: { userId: customer.user_id }
      });
      
      if (error) throw error;
      
      toast.success('Cliente deletado com sucesso');
      setShowDeleteConfirm(false);
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Erro ao deletar cliente');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStartEdit = () => {
    setEditedName(customer?.full_name || '');
    setEditedPhone(customer?.phone || '');
    setEditedEmail(customerEmail || '');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!editedEmail) {
      toast.error('Email é obrigatório');
      return;
    }
    
    updateUserMutation.mutate({
      email: editedEmail,
      fullName: editedName,
      phone: editedPhone
    });
  };

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setIsEditing(false);
    }
  }, [open]);

  if (!customer) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-gradient-ocean flex items-center justify-center">
                <User className="h-5 w-5 text-primary-foreground" />
              </div>
              {isEditing ? 'Editar Cliente' : 'Detalhes do Cliente'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Customer Info */}
            <div className="space-y-4">
              {isEditing ? (
                <>
                  <div>
                    <Label htmlFor="editName">Nome Completo</Label>
                    <Input
                      id="editName"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      placeholder="Nome do cliente"
                    />
                  </div>
                  <div>
                    <Label htmlFor="editEmail">Email</Label>
                    <Input
                      id="editEmail"
                      type="email"
                      value={editedEmail}
                      onChange={(e) => setEditedEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="editPhone">Telefone</Label>
                    <Input
                      id="editPhone"
                      value={editedPhone}
                      onChange={(e) => setEditedPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Nome:</span>
                    <span className="font-medium">{customer.full_name || 'Sem nome'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-medium">
                      {loadingEmail ? (
                        <Loader2 className="h-3 w-3 animate-spin inline" />
                      ) : (
                        customerEmail || '-'
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Telefone:</span>
                    <span className="font-medium">{customer.phone || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Membro desde:</span>
                    <span className="font-medium">
                      {new Date(customer.created_at).toLocaleDateString('pt-BR')}
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
                  disabled={updateUserMutation.isPending}
                >
                  {updateUserMutation.isPending ? (
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
                {isAdmin && (
                  <>
                    <Button
                      variant="destructive"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="gap-1"
                    >
                      <Trash2 className="h-4 w-4" />
                      Deletar
                    </Button>
                    <Button onClick={handleStartEdit}>Editar</Button>
                  </>
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
            <AlertDialogTitle>Deletar Cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar "{customer.full_name || 'este cliente'}"? 
              Esta ação não pode ser desfeita e todos os dados do cliente serão perdidos.
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