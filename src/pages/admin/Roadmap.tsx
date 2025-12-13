import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Map } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface RoadmapItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  version: string;
  status: string;
  priority: number;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  "Frete e Logística",
  "Pagamentos",
  "Marketing e Engajamento",
  "Admin Dashboard",
  "UX/UI",
  "Rastreamento e Entrega",
  "Avaliações",
  "Contas e Pedidos",
  "Core E-commerce",
  "Gestão de Produtos",
  "Notificações",
  "Segurança",
];

const VERSIONS = ["v1.0", "v2.0", "v3.0"];

const STATUS_OPTIONS = [
  { value: "planned", label: "Planejado" },
  { value: "in_progress", label: "Em Progresso" },
  { value: "completed", label: "Concluído" },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Concluído</Badge>;
    case "in_progress":
      return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">Em Progresso</Badge>;
    default:
      return <Badge variant="outline">Planejado</Badge>;
  }
};

export default function Roadmap() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null);
  const [filterVersion, setFilterVersion] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [version, setVersion] = useState("v1.0");
  const [status, setStatus] = useState("planned");
  const [priority, setPriority] = useState(0);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["roadmap-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("roadmap_items")
        .select("*")
        .order("category")
        .order("priority");
      if (error) throw error;
      return data as RoadmapItem[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (item: Omit<RoadmapItem, "id" | "created_at" | "updated_at">) => {
      const { error } = await supabase.from("roadmap_items").insert(item);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap-items"] });
      toast.success("Item adicionado com sucesso!");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => toast.error("Erro ao adicionar item"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...item }: Partial<RoadmapItem> & { id: string }) => {
      const { error } = await supabase.from("roadmap_items").update(item).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap-items"] });
      toast.success("Item atualizado!");
      resetForm();
      setIsDialogOpen(false);
      setEditingItem(null);
    },
    onError: () => toast.error("Erro ao atualizar item"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("roadmap_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roadmap-items"] });
      toast.success("Item removido!");
    },
    onError: () => toast.error("Erro ao remover item"),
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("");
    setVersion("v1.0");
    setStatus("planned");
    setPriority(0);
  };

  const openEditDialog = (item: RoadmapItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setDescription(item.description || "");
    setCategory(item.category);
    setVersion(item.version);
    setStatus(item.status);
    setPriority(item.priority);
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!title.trim() || !category) {
      toast.error("Título e categoria são obrigatórios");
      return;
    }

    const itemData = { title, description, category, version, status, priority };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, ...itemData });
    } else {
      createMutation.mutate(itemData);
    }
  };

  const toggleStatus = (item: RoadmapItem) => {
    const newStatus = item.status === "completed" ? "planned" : "completed";
    updateMutation.mutate({ id: item.id, status: newStatus });
  };

  // Filter and group items
  const filteredItems = items.filter((item) => {
    if (filterVersion !== "all" && item.version !== filterVersion) return false;
    if (filterStatus !== "all" && item.status !== filterStatus) return false;
    return true;
  });

  const groupedItems = filteredItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, RoadmapItem[]>);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <Map className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Roadmap</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={filterVersion} onValueChange={setFilterVersion}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Versão" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {VERSIONS.map((v) => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingItem(null);
                resetForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Item
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{editingItem ? "Editar Item" : "Novo Item"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium">Título *</label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ex: Integração API Correios"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Descrição</label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Detalhes sobre o item..."
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Categoria *</label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Versão</label>
                      <Select value={version} onValueChange={setVersion}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VERSIONS.map((v) => (
                            <SelectItem key={v} value={v}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Status</label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Prioridade</label>
                      <Input
                        type="number"
                        value={priority}
                        onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <Button onClick={handleSubmit} className="w-full">
                    {editingItem ? "Salvar Alterações" : "Adicionar"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {Object.keys(groupedItems).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Map className="h-12 w-12 mb-4 opacity-50" />
            <p>Nenhum item no roadmap ainda</p>
            {isAdmin && <p className="text-sm">Clique em "Adicionar Item" para começar</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([categoryName, categoryItems]) => (
            <Card key={categoryName}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{categoryName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {categoryItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {isAdmin && (
                        <Checkbox
                          checked={item.status === "completed"}
                          onCheckedChange={() => toggleStatus(item)}
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={item.status === "completed" ? "line-through text-muted-foreground" : ""}>
                            {item.title}
                          </span>
                          {getStatusBadge(item.status)}
                          <Badge variant="outline" className="text-xs">{item.version}</Badge>
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        )}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Remover este item?")) {
                              deleteMutation.mutate(item.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
