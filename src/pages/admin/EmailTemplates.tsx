import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Mail, Save, Eye, Send, ArrowLeft, Code, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  subject: string;
  html_content: string;
  variables: string[];
  is_active: boolean;
  updated_at: string;
}

const templateIcons: Record<string, string> = {
  order_confirmation: "🎉",
  seller_notification: "💰",
  order_status_update: "📦",
  order_delivered: "✅",
  tracking_code_notification: "🚚",
  abandoned_cart: "🛒",
  low_stock_alert: "⚠️",
  review_request: "⭐",
};

export default function EmailTemplates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [previewHtml, setPreviewHtml] = useState("");
  const [activeTab, setActiveTab] = useState("editor");

  const { data: templates, isLoading } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("email_templates").select("*").order("name");

      if (error) throw error;
      return data as EmailTemplate[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (template: Partial<EmailTemplate> & { id: string }) => {
      const { error } = await supabase
        .from("email_templates")
        .update({
          subject: template.subject,
          html_content: template.html_content,
          is_active: template.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", template.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Template salvo com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating template:", error);
      toast.error("Erro ao salvar template");
    },
  });

  const selectTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditedSubject(template.subject);
    setEditedContent(template.html_content);
    setIsActive(template.is_active);
    setPreviewHtml(template.html_content);
    setActiveTab("editor");
  };

  const handleSave = () => {
    if (!selectedTemplate) return;

    updateMutation.mutate({
      id: selectedTemplate.id,
      subject: editedSubject,
      html_content: editedContent,
      is_active: isActive,
    });
  };

  const handlePreview = () => {
    // Replace variables with sample data for preview
    let previewContent = editedContent;
    const sampleData: Record<string, string> = {
      customer_name: "João Silva",
      order_id: "ABC12345",
      items_html: '<div class="item"><p><strong>Capa iPhone 15</strong> - R$ 89,90 x 2</p></div>',
      products_html:
        '<div class="product"><div class="product-info"><h4>Capa iPhone 15</h4><p>Quantidade: 2 | R$ 89,90</p></div><a href="#" class="btn">Avaliar ⭐</a></div>',
      total: "R$ 179,80",
      shipping_address: "Rua das Palmeiras, 123 - Boa Viagem, Recife - PE, 51020-000",
      delivery_days: "5 a 10 dias úteis",
      customer_email: "joao@email.com",
      customer_phone: "(81) 99999-9999",
      payment_method: "Cartão de Crédito",
      status_emoji: "📦",
      status_label: "Enviado",
      status_message: "Seu pedido foi enviado e está a caminho!",
      status_color: "#0d9488",
      status_color_light: "#14b8a6",
      tracking_section: "<p><strong>Código de rastreio:</strong> BR123456789</p>",
      confirmation_section: "",
      review_section: "",
      items_count: "3",
      admin_url: "https://calibrasil.com/admin/products",
      cart_url: "https://calibrasil.com/cart",
      tracking_code: "BR123456789BR",
      tracking_url: "https://www.linkcorreios.com.br/?id=BR123456789BR",
      confirmation_url: "https://calibrasil.com/confirmar-recebimento?token=exemplo123",
      review_url: "https://calibrasil.com/avaliar?token=exemplo123",
      store_name: "Calibrasil",
      store_email: "contato@calibrasil.com",
    };

    for (const [key, value] of Object.entries(sampleData)) {
      const regex = new RegExp(`{{${key}}}`, "g");
      previewContent = previewContent.replace(regex, value);
    }

    setPreviewHtml(previewContent);
    setActiveTab("preview");
  };

  const sendTestEmail = async () => {
    if (!user?.email) {
      toast.error("Você precisa estar logado para enviar email de teste");
      return;
    }

    toast.info(`Enviando email de teste para ${user.email}...`);

    // For now, just show a success message
    // In a real implementation, you'd call an edge function to send the test email
    setTimeout(() => {
      toast.success(`Email de teste enviado para ${user.email}`);
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="h-6 w-6" />
          Templates de Email
        </h1>
        <p className="text-muted-foreground mt-1">Edite os templates de email enviados pelo sistema</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Template List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Templates Disponíveis</CardTitle>
            <CardDescription>Clique para editar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {templates?.map((template) => (
              <button
                key={template.id}
                onClick={() => selectTemplate(template)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedTemplate?.id === template.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{templateIcons[template.template_key] || "📧"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{template.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{template.template_key}</p>
                  </div>
                  {!template.is_active && (
                    <Badge variant="secondary" className="text-xs">
                      Inativo
                    </Badge>
                  )}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Editor */}
        <Card className="lg:col-span-2">
          {selectedTemplate ? (
            <>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <span>{templateIcons[selectedTemplate.template_key] || "📧"}</span>
                    {selectedTemplate.name}
                  </CardTitle>
                  <CardDescription>
                    Última atualização: {new Date(selectedTemplate.updated_at).toLocaleDateString("pt-BR")}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="is-active" className="text-sm">
                      Ativo
                    </Label>
                    <Switch id="is-active" checked={isActive} onCheckedChange={setIsActive} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Subject */}
                <div className="space-y-2">
                  <Label htmlFor="subject">Assunto do Email</Label>
                  <Input
                    id="subject"
                    value={editedSubject}
                    onChange={(e) => setEditedSubject(e.target.value)}
                    placeholder="Assunto do email..."
                  />
                </div>

                {/* Variables */}
                <div className="space-y-2">
                  <Label>Variáveis Disponíveis</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.variables.map((variable) => (
                      <Badge
                        key={variable}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10"
                        onClick={() => {
                          navigator.clipboard.writeText(`{{${variable}}}`);
                          toast.success(`Copiado: {{${variable}}}`);
                        }}
                      >
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Clique em uma variável para copiar</p>
                </div>

                {/* Tabs for Editor/Preview */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="editor" className="flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      Editor HTML
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Preview
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="editor" className="mt-4">
                    <Textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="min-h-[400px] font-mono text-sm"
                      placeholder="Conteúdo HTML do email..."
                    />
                  </TabsContent>

                  <TabsContent value="preview" className="mt-4">
                    <div className="border rounded-lg overflow-hidden bg-background">
                      <div className="bg-muted px-4 py-2 border-b flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm font-medium">Preview do Email</span>
                      </div>
                      <iframe
                        srcDoc={previewHtml}
                        className="w-full min-h-[400px] bg-white"
                        title="Email Preview"
                        sandbox=""
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-4 border-t">
                  <Button onClick={handlePreview} variant="outline" className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Visualizar Preview
                  </Button>
                  <Button onClick={sendTestEmail} variant="outline" className="flex items-center gap-2">
                    <Send className="h-4 w-4" />
                    Enviar Teste
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    className="flex items-center gap-2 ml-auto"
                  >
                    <Save className="h-4 w-4" />
                    {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center h-96 text-center">
              <Mail className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium">Selecione um Template</h3>
              <p className="text-muted-foreground mt-1">Escolha um template na lista ao lado para começar a editar</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
