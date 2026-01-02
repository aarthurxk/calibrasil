import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Check, X, Search, Filter, Edit2, Trash2, MessageSquare, Loader2, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface Review {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  approved: boolean | null;
  admin_edited: boolean | null;
  admin_comment: string | null;
  created_at: string | null;
  updated_at: string | null;
  order_id: string | null;
  product?: { name: string; image: string | null };
}

const Reviews = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editComment, setEditComment] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [deleteReview, setDeleteReview] = useState<Review | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Fetch stats for dashboard cards
  const { data: stats } = useQuery({
    queryKey: ["admin-reviews-stats"],
    queryFn: async () => {
      const [pendingRes, approvedRes, lowRatingRes] = await Promise.all([
        supabase.from("product_reviews").select("id", { count: "exact", head: true }).eq("approved", false),
        supabase.from("product_reviews").select("id", { count: "exact", head: true }).eq("approved", true),
        supabase.from("product_reviews").select("id", { count: "exact", head: true }).lte("rating", 2),
      ]);
      return {
        pending: pendingRes.count || 0,
        approved: approvedRes.count || 0,
        lowRating: lowRatingRes.count || 0,
      };
    },
  });

  // Fetch reviews with product info
  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ["admin-reviews", statusFilter, ratingFilter, page],
    queryFn: async () => {
      let query = supabase
        .from("product_reviews")
        .select("*, product:products(name, image)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (statusFilter === "approved") {
        query = query.eq("approved", true);
      } else if (statusFilter === "pending") {
        query = query.eq("approved", false);
      }

      if (ratingFilter !== "all") {
        query = query.eq("rating", parseInt(ratingFilter));
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { reviews: data as Review[], total: count || 0 };
    },
  });

  const reviews = reviewsData?.reviews || [];
  const totalPages = Math.ceil((reviewsData?.total || 0) / pageSize);

  // Filter by search
  const filteredReviews = reviews.filter(review => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      review.product?.name?.toLowerCase().includes(searchLower) ||
      review.comment?.toLowerCase().includes(searchLower)
    );
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase
        .from("product_reviews")
        .update({ approved })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      toast.success("Status atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar status");
    },
  });

  // Edit mutation
  const editMutation = useMutation({
    mutationFn: async ({
      id,
      comment,
      adminComment,
    }: {
      id: string;
      comment: string;
      adminComment: string;
    }) => {
      const { error } = await supabase
        .from("product_reviews")
        .update({
          comment,
          admin_comment: adminComment || null,
          admin_edited: true,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      setEditingReview(null);
      toast.success("Avaliação editada!");
    },
    onError: () => {
      toast.error("Erro ao editar avaliação");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_reviews")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      setDeleteReview(null);
      toast.success("Avaliação excluída!");
    },
    onError: () => {
      toast.error("Erro ao excluir avaliação");
    },
  });

  const handleEdit = (review: Review) => {
    setEditingReview(review);
    setEditComment(review.comment || "");
    setAdminNote(review.admin_comment || "");
  };

  const handleSaveEdit = () => {
    if (!editingReview) return;
    editMutation.mutate({
      id: editingReview.id,
      comment: editComment,
      adminComment: adminNote,
    });
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: ptBR,
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Avaliações</h1>
        <p className="text-muted-foreground">
          Gerencie as avaliações de produtos da loja
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card 
          className={`cursor-pointer transition-all hover:border-primary/50 ${statusFilter === "pending" ? "border-primary ring-1 ring-primary/20" : ""}`}
          onClick={() => setStatusFilter("pending")}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pendentes</p>
              <p className="text-2xl font-bold">{stats?.pending || 0}</p>
            </div>
            {(stats?.pending || 0) > 0 && (
              <Badge variant="secondary" className="ml-auto bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                Requer ação
              </Badge>
            )}
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all hover:border-primary/50 ${statusFilter === "approved" ? "border-primary ring-1 ring-primary/20" : ""}`}
          onClick={() => setStatusFilter("approved")}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Aprovadas</p>
              <p className="text-2xl font-bold">{stats?.approved || 0}</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:border-primary/50"
          onClick={() => { setStatusFilter("all"); setRatingFilter("1"); }}
        >
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Notas Baixas (≤2)</p>
              <p className="text-2xl font-bold">{stats?.lowRating || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por produto ou comentário..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="approved">Aprovadas</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
          </SelectContent>
        </Select>
        <Select value={ratingFilter} onValueChange={setRatingFilter}>
          <SelectTrigger className="w-full md:w-[140px]">
            <Star className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Nota" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="5">5 estrelas</SelectItem>
            <SelectItem value="4">4 estrelas</SelectItem>
            <SelectItem value="3">3 estrelas</SelectItem>
            <SelectItem value="2">2 estrelas</SelectItem>
            <SelectItem value="1">1 estrela</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma avaliação encontrada</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Nota</TableHead>
                <TableHead className="hidden md:table-cell">Comentário</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReviews.map(review => (
                <TableRow key={review.id} className="group">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {review.product?.image && (
                        <img
                          src={review.product.image}
                          alt=""
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <p className="font-medium line-clamp-1">
                          {review.product?.name || "Produto removido"}
                        </p>
                        {review.admin_edited && (
                          <Badge variant="outline" className="text-xs">
                            Editado
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= review.rating
                              ? "fill-accent text-accent"
                              : "text-muted"
                          }`}
                        />
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell max-w-[300px]">
                    <p className="line-clamp-2 text-sm">
                      {review.comment || (
                        <span className="text-muted-foreground italic">
                          Sem comentário
                        </span>
                      )}
                    </p>
                  </TableCell>
                  <TableCell>
                    {review.approved ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <Check className="h-3 w-3 mr-1" />
                        Aprovada
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        Pendente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {formatDate(review.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {review.approved ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            approveMutation.mutate({ id: review.id, approved: false })
                          }
                          title="Reprovar"
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            approveMutation.mutate({ id: review.id, approved: true })
                          }
                          title="Aprovar"
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(review)}
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteReview(review)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Próxima
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingReview} onOpenChange={() => setEditingReview(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Avaliação</DialogTitle>
            <DialogDescription>
              Edite o comentário da avaliação. O usuário será notificado que foi editado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Comentário</label>
              <Textarea
                value={editComment}
                onChange={e => setEditComment(e.target.value)}
                rows={4}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                Nota do Admin <span className="text-muted-foreground font-normal">(interno)</span>
              </label>
              <Textarea
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                rows={2}
                className="mt-1"
                placeholder="Motivo da edição (não visível ao cliente)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingReview(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={editMutation.isPending}>
              {editMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteReview} onOpenChange={() => setDeleteReview(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir avaliação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A avaliação será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteReview && deleteMutation.mutate(deleteReview.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Reviews;
