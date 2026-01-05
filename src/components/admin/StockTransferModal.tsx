import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ArrowRight, Loader2 } from 'lucide-react';

interface Store {
  id: string;
  name: string;
  code: string;
  display_order: number;
}

interface StoreStock {
  id: string;
  store_id: string;
  quantity: number;
  reserved_quantity: number;
}

interface StockItem {
  variant_id: string;
  product_id: string;
  product_name: string;
  color: string | null;
  model: string | null;
  codigo_variacao: string | null;
  stocks: StoreStock[];
}

interface StockTransferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: StockItem | null;
  stores: Store[];
}

export function StockTransferModal({
  open,
  onOpenChange,
  variant,
  stores,
}: StockTransferModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [fromStoreId, setFromStoreId] = useState<string>('');
  const [toStoreId, setToStoreId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');

  // Reset form when modal opens
  useEffect(() => {
    if (open && variant) {
      setFromStoreId('');
      setToStoreId('');
      setQuantity(1);
      setNotes('');
    }
  }, [open, variant]);

  const getAvailableStock = (storeId: string) => {
    if (!variant) return 0;
    const stock = variant.stocks.find((s) => s.store_id === storeId);
    return (stock?.quantity || 0) - (stock?.reserved_quantity || 0);
  };

  const createTransferMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('create_stock_transfer', {
        p_variant_id: variant!.variant_id,
        p_from_store_id: fromStoreId,
        p_to_store_id: toStoreId,
        p_quantity: quantity,
        p_user_id: user?.id || null,
        p_notes: notes || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-stock'] });
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      toast.success('Transferência criada com sucesso');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar transferência');
    },
  });

  const handleSubmit = () => {
    if (!fromStoreId || !toStoreId || !quantity || quantity < 1) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (fromStoreId === toStoreId) {
      toast.error('Selecione lojas diferentes');
      return;
    }
    const available = getAvailableStock(fromStoreId);
    if (quantity > available) {
      toast.error(`Quantidade máxima disponível: ${available}`);
      return;
    }
    createTransferMutation.mutate();
  };

  const fromStoreName = stores.find((s) => s.id === fromStoreId)?.name || '';
  const toStoreName = stores.find((s) => s.id === toStoreId)?.name || '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Nova Transferência</DialogTitle>
          <DialogDescription>
            {variant && (
              <span>
                {variant.product_name}
                {variant.color && ` - ${variant.color}`}
                {variant.model && ` - ${variant.model}`}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Loja de Origem</Label>
            <Select value={fromStoreId} onValueChange={setFromStoreId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a loja de origem" />
              </SelectTrigger>
              <SelectContent>
                {stores.map((store) => {
                  const available = getAvailableStock(store.id);
                  return (
                    <SelectItem 
                      key={store.id} 
                      value={store.id}
                      disabled={available <= 0}
                    >
                      {store.name} ({available} disponíveis)
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-center">
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <Label>Loja de Destino</Label>
            <Select value={toStoreId} onValueChange={setToStoreId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a loja de destino" />
              </SelectTrigger>
              <SelectContent>
                {stores
                  .filter((s) => s.id !== fromStoreId)
                  .map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Quantidade</Label>
            <Input
              type="number"
              min={1}
              max={fromStoreId ? getAvailableStock(fromStoreId) : 999}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
            />
            {fromStoreId && (
              <p className="text-xs text-muted-foreground">
                Disponível: {getAvailableStock(fromStoreId)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Textarea
              placeholder="Motivo da transferência..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={createTransferMutation.isPending}
          >
            {createTransferMutation.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {fromStoreName && toStoreName 
              ? `Transferir de ${fromStoreName} para ${toStoreName}` 
              : 'Transferir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
