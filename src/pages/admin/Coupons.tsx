import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2, Pencil, Trash2, ToggleLeft, ToggleRight, Ticket } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

interface Coupon {
  id: string;
  code: string;
  discount_percent: number;
  min_purchase: number;
  max_uses: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
}

const Coupons = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [code, setCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(10);
  const [minPurchase, setMinPurchase] = useState(0);
  const [maxUses, setMaxUses] = useState<number | ''>('');
  const [validUntil, setValidUntil] = useState('');

  const maxDiscount = isAdmin ? 100 : 40;

  // Fetch coupons
  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['admin-coupons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
  });

  // Create/Update coupon
  const saveMutation = useMutation({
    mutationFn: async (couponData: {
      code: string;
      discount_percent: number;
      min_purchase: number;
      max_uses: number | null;
      valid_until: string | null;
      is_active: boolean;
    }) => {
      if (editingCoupon) {
        const { error } = await supabase
          .from('coupons')
          .update(couponData)
          .eq('id', editingCoupon.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('coupons')
          .insert([couponData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success(editingCoupon ? 'Cupom atualizado!' : 'Cupom criado!');
      handleCloseForm();
    },
    onError: (error: any) => {
      if (error.message?.includes('duplicate')) {
        toast.error('Já existe um cupom com esse código');
      } else {
        toast.error('Erro ao salvar cupom');
      }
    },
  });

  // Toggle active status
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('coupons')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success('Status atualizado!');
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    },
  });

  // Delete coupon
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
      toast.success('Cupom excluído!');
      setDeleteId(null);
    },
    onError: () => {
      toast.error('Erro ao excluir cupom');
    },
  });

  const handleOpenForm = (coupon?: Coupon) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setCode(coupon.code);
      setDiscountPercent(coupon.discount_percent);
      setMinPurchase(coupon.min_purchase);
      setMaxUses(coupon.max_uses ?? '');
      setValidUntil(coupon.valid_until ? coupon.valid_until.split('T')[0] : '');
    } else {
      setEditingCoupon(null);
      setCode('');
      setDiscountPercent(10);
      setMinPurchase(0);
      setMaxUses('');
      setValidUntil('');
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCoupon(null);
    setCode('');
    setDiscountPercent(10);
    setMinPurchase(0);
    setMaxUses('');
    setValidUntil('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      toast.error('Código do cupom é obrigatório');
      return;
    }

    if (discountPercent > maxDiscount) {
      toast.error(`Desconto máximo permitido: ${maxDiscount}%`);
      return;
    }

    saveMutation.mutate({
      code: code.toUpperCase().trim(),
      discount_percent: discountPercent,
      min_purchase: minPurchase,
      max_uses: maxUses === '' ? null : Number(maxUses),
      valid_until: validUntil || null,
      is_active: editingCoupon?.is_active ?? true,
    });
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const isExpired = (validUntil: string | null) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Ticket className="h-8 w-8" />
            Cupons de Desconto
          </h1>
          <p className="text-muted-foreground">
            Gerencie cupons de desconto da loja
            {!isAdmin && <span className="text-primary"> (máx. 40%)</span>}
          </p>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Cupom
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead>Mín. Compra</TableHead>
                <TableHead>Usos</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum cupom cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{coupon.discount_percent}%</Badge>
                    </TableCell>
                    <TableCell>
                      {coupon.min_purchase > 0 ? formatPrice(coupon.min_purchase) : '-'}
                    </TableCell>
                    <TableCell>
                      {coupon.used_count}/{coupon.max_uses ?? '∞'}
                    </TableCell>
                    <TableCell>
                      {coupon.valid_until ? (
                        <span className={isExpired(coupon.valid_until) ? 'text-destructive' : ''}>
                          {new Date(coupon.valid_until).toLocaleDateString('pt-BR')}
                        </span>
                      ) : (
                        'Sem limite'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={coupon.is_active && !isExpired(coupon.valid_until) ? 'default' : 'secondary'}>
                        {isExpired(coupon.valid_until) ? 'Expirado' : coupon.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleMutation.mutate({ id: coupon.id, is_active: !coupon.is_active })}
                          title={coupon.is_active ? 'Desativar' : 'Ativar'}
                        >
                          {coupon.is_active ? (
                            <ToggleRight className="h-4 w-4 text-primary" />
                          ) : (
                            <ToggleLeft className="h-4 w-4" />
                          )}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenForm(coupon)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(coupon.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCoupon ? 'Editar Cupom' : 'Criar Cupom'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="code">Código do Cupom *</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="VERAO20"
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label>Desconto: {discountPercent}%</Label>
              <Slider
                value={[discountPercent]}
                onValueChange={(v) => setDiscountPercent(v[0])}
                min={1}
                max={maxDiscount}
                step={1}
              />
              <p className="text-xs text-muted-foreground">
                {!isAdmin && 'Gerentes podem aplicar até 40% de desconto'}
              </p>
            </div>

            <div>
              <Label htmlFor="minPurchase">Valor Mínimo de Compra (R$)</Label>
              <Input
                id="minPurchase"
                type="number"
                value={minPurchase}
                onChange={(e) => setMinPurchase(Number(e.target.value))}
                min={0}
                step={0.01}
              />
            </div>

            <div>
              <Label htmlFor="maxUses">Limite de Usos (vazio = ilimitado)</Label>
              <Input
                id="maxUses"
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value === '' ? '' : Number(e.target.value))}
                min={1}
                placeholder="Ilimitado"
              />
            </div>

            <div>
              <Label htmlFor="validUntil">Válido até (opcional)</Label>
              <Input
                id="validUntil"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseForm}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingCoupon ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cupom?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O cupom será permanentemente excluído.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Coupons;
