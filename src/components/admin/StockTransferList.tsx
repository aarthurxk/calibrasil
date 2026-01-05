import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Check, X, Truck, ArrowRight, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';

interface Store {
  id: string;
  name: string;
  code: string;
  display_order: number;
}

interface Transfer {
  id: string;
  product_variant_id: string;
  from_store_id: string;
  to_store_id: string;
  quantity: number;
  status: string;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
  product_variants: {
    color: string | null;
    model: string | null;
    codigo_variacao: string | null;
    products: {
      name: string;
    };
  };
}

interface StockTransferListProps {
  stores: Store[];
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  in_transit: { label: 'Em trânsito', variant: 'default' },
  completed: { label: 'Concluída', variant: 'outline' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
};

export function StockTransferList({ stores }: StockTransferListProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: transfers = [], isLoading, refetch } = useQuery({
    queryKey: ['stock-transfers', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('stock_transfers')
        .select(`
          *,
          product_variants (
            color,
            model,
            codigo_variacao,
            products (name)
          )
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Transfer[];
    },
  });

  const completeTransferMutation = useMutation({
    mutationFn: async (transferId: string) => {
      const { error } = await supabase.rpc('complete_stock_transfer', {
        p_transfer_id: transferId,
        p_user_id: user?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['store-stock'] });
      toast.success('Transferência concluída');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao concluir transferência');
    },
  });

  const cancelTransferMutation = useMutation({
    mutationFn: async (transferId: string) => {
      const { error } = await supabase.rpc('cancel_stock_transfer', {
        p_transfer_id: transferId,
        p_user_id: user?.id || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      queryClient.invalidateQueries({ queryKey: ['store-stock'] });
      toast.success('Transferência cancelada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao cancelar transferência');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('stock_transfers')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-transfers'] });
      toast.success('Status atualizado');
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    },
  });

  const getStoreName = (storeId: string) => {
    return stores.find((s) => s.id === storeId)?.name || 'Loja desconhecida';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Transferências</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filtrar status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="in_transit">Em trânsito</SelectItem>
                <SelectItem value="completed">Concluídas</SelectItem>
                <SelectItem value="cancelled">Canceladas</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>De → Para</TableHead>
              <TableHead className="text-center">Qtd</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Observações</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : transfers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  Nenhuma transferência encontrada
                </TableCell>
              </TableRow>
            ) : (
              transfers.map((transfer) => {
                const status = statusConfig[transfer.status] || statusConfig.pending;
                return (
                  <TableRow key={transfer.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(transfer.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium truncate max-w-[150px]">
                          {transfer.product_variants?.products?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {transfer.product_variants?.color}
                          {transfer.product_variants?.model && ` / ${transfer.product_variants.model}`}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <span className="font-medium">{getStoreName(transfer.from_store_id)}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{getStoreName(transfer.to_store_id)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold">
                      {transfer.quantity}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground truncate max-w-[100px] block">
                        {transfer.notes || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {(transfer.status === 'pending' || transfer.status === 'in_transit') && (
                        <div className="flex items-center gap-1 justify-end">
                          {transfer.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateStatusMutation.mutate({ id: transfer.id, status: 'in_transit' })}
                              title="Marcar em trânsito"
                            >
                              <Truck className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => completeTransferMutation.mutate(transfer.id)}
                            title="Concluir"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => cancelTransferMutation.mutate(transfer.id)}
                            title="Cancelar"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {transfer.status === 'completed' && transfer.completed_at && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(transfer.completed_at), "dd/MM/yy", { locale: ptBR })}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
