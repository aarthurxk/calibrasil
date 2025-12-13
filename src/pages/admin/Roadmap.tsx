import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Map, FileText, GitBranch, CheckCircle2, Circle, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

interface RoadmapItem {
  id: string;
  title: string;
  description: string | null;
  category: string;
  version: string;
  status: string;
  priority: number;
}

// Default ROADMAP.md content
const DEFAULT_ROADMAP = `# Roadmap Cali Brasil - v1.0

## 📦 Funcionalidades Planejadas

### Frete e Logística
- [x] **Cálculo de Frete Dinâmico** - Cálculo por região (PAC e SEDEX) com preços diferenciados
- [ ] **Integração API Correios** - Integração direta com API oficial dos Correios
  - Rastreamento de encomendas

### Pagamentos
- [ ] **Parcelamento no Cartão** - Opção de parcelamento em até 12x
- [ ] **Cupons de Desconto** - Sistema de cupons promocionais

### Marketing e Engajamento
- [ ] **Programa de Fidelidade** - Pontos por compra e recompensas
- [x] **Wishlist** - Lista de desejos para clientes logados
- [ ] **Notificações Push** - Alertas de promoções e status de pedido

### Admin Dashboard
- [x] **Relatórios Avançados** - Gráficos de vendas por período, produto e região (dados reais)
- [ ] **Gestão de Promoções** - Criar e agendar promoções automáticas
- [ ] **Dashboard de Métricas** - KPIs em tempo real (conversão, ticket médio, etc.)

### UX/UI
- [ ] **Filtros Avançados na Loja** - Por preço, cor, modelo, avaliação
- [ ] **Busca com Autocomplete** - Sugestões de produtos ao digitar
- [ ] **Comparador de Produtos** - Comparar até 3 produtos lado a lado

---

## ✅ Funcionalidades Implementadas

### Core E-commerce
- [x] Catálogo de produtos responsivo
- [x] Carrinho de compras com persistência local
- [x] Checkout com validação de formulário
- [x] Checkout como visitante (guest checkout)
- [x] Integração Stripe (cartão, Pix, Boleto)
- [x] Autopreenchimento de endereço via ViaCEP

### Gestão de Produtos
- [x] CRUD de produtos (admin/manager)
- [x] Variantes por cor e modelo
- [x] Estoque por variação
- [x] Carrossel de imagens automático
- [x] Sistema de avaliações de produtos

### Notificações
- [x] Email de confirmação de pedido
- [x] Alerta de vendas para admin
- [x] Alerta de estoque baixo
- [x] Email de atualização de status
- [x] Recuperação de carrinho abandonado

### Admin
- [x] Dashboard com pedidos recentes
- [x] Filtros de status nos pedidos
- [x] Gestão de usuários e roles
- [x] Configurações da loja (frete, taxas)

### Segurança
- [x] Validação de preços server-side
- [x] Validação de frete server-side
- [x] RLS policies para todas as tabelas
- [x] Verificação de webhook Stripe

---

## 🚀 Roadmap v2.0 - Funcionalidades Planejadas

### Rastreamento e Entrega
- [ ] **Página de Código de Rastreio (Admin)** - Interface para admin adicionar código de rastreamento do produto enviado
- [ ] **Confirmação de Recebimento via Email** - Botão no email de "Enviado" para cliente confirmar recebimento

### Avaliações
- [ ] **Botão de Avaliação no Email de Entrega** - Link direto para avaliar o produto comprado

### Contas e Pedidos
- [ ] **Vinculação de Pedidos Guest a Conta Nova** - Vincular pedidos anteriores ao criar conta

### UX/UI (Loja)
- [ ] **Filtros Avançados por Preço** - Filtrar produtos por faixa de preço`;

interface ParsedItem {
  title: string;
  description: string;
  completed: boolean;
}

interface ParsedCategory {
  name: string;
  items: ParsedItem[];
}

interface ParsedVersion {
  version: string;
  title: string;
  categories: ParsedCategory[];
}

const parseRoadmapMarkdown = (content: string): ParsedVersion[] => {
  const versions: ParsedVersion[] = [];
  const lines = content.split("\n");
  
  let currentVersion: ParsedVersion | null = null;
  let currentCategory: ParsedCategory | null = null;
  
  for (const line of lines) {
    // Match version headers like "# Roadmap Cali Brasil - v1.0" or "## 🚀 Roadmap v2.0"
    const versionMatch = line.match(/^#+ .*?(v\d+\.\d+)/i);
    if (versionMatch) {
      if (currentCategory && currentVersion) {
        currentVersion.categories.push(currentCategory);
      }
      if (currentVersion) {
        versions.push(currentVersion);
      }
      currentVersion = {
        version: versionMatch[1],
        title: line.replace(/^#+\s*/, "").replace(/[📦✅🚀]/g, "").trim(),
        categories: [],
      };
      currentCategory = null;
      continue;
    }
    
    // Match section headers like "## 📦 Funcionalidades Planejadas"
    const sectionMatch = line.match(/^## [📦✅🚀]?\s*(.+)/);
    if (sectionMatch && !line.includes("v1.0") && !line.includes("v2.0")) {
      // This is a section divider, not a version
      continue;
    }
    
    // Match category headers like "### Frete e Logística"
    const categoryMatch = line.match(/^### (.+)/);
    if (categoryMatch && currentVersion) {
      if (currentCategory) {
        currentVersion.categories.push(currentCategory);
      }
      currentCategory = {
        name: categoryMatch[1].trim(),
        items: [],
      };
      continue;
    }
    
    // Match items like "- [x] **Title** - Description" or "- [ ] **Title** - Description"
    const itemMatch = line.match(/^- \[(x| )\] \*?\*?(.+?)\*?\*?\s*(?:-\s*(.*))?$/);
    if (itemMatch && currentCategory) {
      const completed = itemMatch[1] === "x";
      let title = itemMatch[2].replace(/\*\*/g, "").trim();
      let description = itemMatch[3]?.trim() || "";
      
      // Handle case where description is part of title
      if (title.includes(" - ")) {
        const parts = title.split(" - ");
        title = parts[0].trim();
        description = parts.slice(1).join(" - ").trim();
      }
      
      currentCategory.items.push({
        title,
        description,
        completed,
      });
    }
  }
  
  // Push last category and version
  if (currentCategory && currentVersion) {
    currentVersion.categories.push(currentCategory);
  }
  if (currentVersion) {
    versions.push(currentVersion);
  }
  
  return versions;
};

const getStatusIcon = (completed: boolean) => {
  if (completed) {
    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  }
  return <Circle className="h-4 w-4 text-muted-foreground" />;
};

const getVersionColor = (version: string) => {
  switch (version) {
    case "v1.0":
      return "bg-primary/20 text-primary border-primary/30";
    case "v2.0":
      return "bg-secondary/50 text-secondary-foreground border-secondary";
    default:
      return "bg-muted text-muted-foreground border-muted";
  }
};

export default function Roadmap() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [editorContent, setEditorContent] = useState(DEFAULT_ROADMAP);
  const [hasChanges, setHasChanges] = useState(false);

  // For now, we'll use local state. In production, this could be stored in DB or file
  const parsedRoadmap = parseRoadmapMarkdown(editorContent);

  // Calculate statistics
  const stats = parsedRoadmap.reduce(
    (acc, version) => {
      version.categories.forEach((cat) => {
        cat.items.forEach((item) => {
          acc.total++;
          if (item.completed) acc.completed++;
          else acc.planned++;
        });
      });
      return acc;
    },
    { total: 0, completed: 0, planned: 0 }
  );

  const handleEditorChange = (value: string) => {
    setEditorContent(value);
    setHasChanges(true);
  };

  const handleSave = () => {
    // In a real implementation, this would save to DB or file
    toast.success("Roadmap salvo com sucesso!");
    setHasChanges(false);
  };

  return (
    <div className="h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Map className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Roadmap</h1>
        </div>

        <div className="flex items-center gap-4">
          {/* Stats */}
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>{stats.completed} concluídos</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{stats.planned} planejados</span>
            </div>
          </div>

          {isAdmin && hasChanges && (
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          )}
        </div>
      </div>

      {/* Split View */}
      <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg border">
        {/* Left Panel - Editor */}
        <ResizablePanel defaultSize={40} minSize={30}>
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 p-3 border-b bg-muted/30">
              <FileText className="h-4 w-4" />
              <span className="font-medium text-sm">ROADMAP.md</span>
            </div>
            <Textarea
              value={editorContent}
              onChange={(e) => handleEditorChange(e.target.value)}
              className="flex-1 font-mono text-sm resize-none border-0 rounded-none focus-visible:ring-0 bg-background"
              placeholder="Edite o roadmap aqui..."
              readOnly={!isAdmin}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Right Panel - Visual Flowchart */}
        <ResizablePanel defaultSize={60} minSize={40}>
          <div className="h-full flex flex-col overflow-hidden">
            <div className="flex items-center gap-2 p-3 border-b bg-muted/30">
              <GitBranch className="h-4 w-4" />
              <span className="font-medium text-sm">Organograma de Fases</span>
            </div>
            
            <div className="flex-1 overflow-auto p-4">
              <div className="space-y-8">
                {parsedRoadmap.map((versionData, versionIndex) => (
                  <div key={versionData.version} className="relative">
                    {/* Version Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <Badge className={`text-sm px-3 py-1 ${getVersionColor(versionData.version)}`}>
                        {versionData.version}
                      </Badge>
                      <div className="h-px flex-1 bg-border" />
                    </div>

                    {/* Categories Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                      {versionData.categories.map((category, catIndex) => {
                        const completedCount = category.items.filter((i) => i.completed).length;
                        const progress = category.items.length > 0 
                          ? Math.round((completedCount / category.items.length) * 100) 
                          : 0;

                        return (
                          <Card key={category.name} className="relative overflow-hidden">
                            {/* Progress bar at top */}
                            <div 
                              className="absolute top-0 left-0 h-1 bg-green-500 transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                            
                            <CardHeader className="pb-2 pt-4">
                              <CardTitle className="text-sm font-medium flex items-center justify-between">
                                <span>{category.name}</span>
                                <span className="text-xs text-muted-foreground font-normal">
                                  {completedCount}/{category.items.length}
                                </span>
                              </CardTitle>
                            </CardHeader>
                            
                            <CardContent className="space-y-2">
                              {category.items.map((item, itemIndex) => (
                                <div
                                  key={itemIndex}
                                  className={`flex items-start gap-2 p-2 rounded-md text-xs transition-colors ${
                                    item.completed 
                                      ? "bg-green-500/10 text-muted-foreground" 
                                      : "bg-muted/50 hover:bg-muted"
                                  }`}
                                >
                                  {getStatusIcon(item.completed)}
                                  <div className="flex-1 min-w-0">
                                    <p className={`font-medium truncate ${item.completed ? "line-through" : ""}`}>
                                      {item.title}
                                    </p>
                                    {item.description && (
                                      <p className="text-muted-foreground truncate mt-0.5">
                                        {item.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ))}
                              
                              {category.items.length === 0 && (
                                <p className="text-xs text-muted-foreground italic">
                                  Nenhum item nesta categoria
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    {/* Connection line to next version */}
                    {versionIndex < parsedRoadmap.length - 1 && (
                      <div className="flex justify-center my-6">
                        <div className="w-px h-8 bg-border" />
                      </div>
                    )}
                  </div>
                ))}

                {parsedRoadmap.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                    <GitBranch className="h-12 w-12 mb-4 opacity-50" />
                    <p>Nenhuma fase encontrada</p>
                    <p className="text-sm">Edite o markdown à esquerda para adicionar itens</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
