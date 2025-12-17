# Roadmap Cali Brasil - v1.0

## 📦 Funcionalidades Planejadas

### Frete e Logística
- [x] **Cálculo de Frete Dinâmico** - Cálculo por região (PAC e SEDEX) com preços diferenciados
- [ ] **Integração API Correios** - Integração direta com API oficial dos Correios
  - Rastreamento de encomendas
  - ⏳ *Aguardando contrato comercial ativo com Correios*
- [ ] **Geração de Etiquetas de Envio** - Sistema gratuito para gerar e imprimir etiquetas no padrão Correios
  - Código de barras Code 128 para rastreamento (JsBarcode - MIT License)
  - Configuração de dados do remetente no admin
  - Suporte a impressoras térmicas (10x15cm, 10x10cm) e comuns (A4)
  - Botão "Gerar Etiqueta" no detalhe do pedido (apenas pedidos pagos)

### Gestão de Produtos
- [ ] **Geração de Código de Barras EAN** - Sistema gratuito para gerar e imprimir códigos EAN-13/EAN-8
  - Geração automática ou manual de códigos EAN (JsBarcode - MIT License)
  - Impressão de etiquetas de preço com código de barras
  - Campo EAN no cadastro de produtos
  - Compatível com leitores de código de barras padrão

### Pagamentos
- [x] **Parcelamento no Cartão** - Opção de parcelamento em até 6x (configurável por faixa de valor)
- [x] **Cupons de Desconto** - Sistema completo de cupons promocionais com admin

### Marketing e Engajamento
- [ ] **Programa de Fidelidade** - Pontos por compra e recompensas
- [x] **Wishlist** - Lista de desejos para clientes logados
- [ ] **Notificações Push** - Alertas de promoções e status de pedido

### Admin Dashboard
- [x] **Relatórios Avançados** - Gráficos de vendas por período, produto e região (dados reais)
- [ ] **Gestão de Promoções** - Criar e agendar promoções automáticas
- [x] **Dashboard de Métricas** - KPIs em tempo real (conversão, ticket médio, abandono de carrinho)
- [x] **Gestão de Categorias** - CRUD completo de categorias (admin-only)

### UX/UI
- [x] **Filtros Avançados na Loja** - Filtro por faixa de preço com slider duplo
- [x] **Busca com Autocomplete** - Modal de busca com sugestões de produtos em tempo real
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

## ✅ Roadmap v2.0 - Implementado

### Rastreamento e Entrega
- [x] **Página de Código de Rastreio (Admin)** - Interface no modal de detalhes do pedido para admin adicionar código de rastreamento
  - Ao inserir/atualizar código, envia email automático ao cliente com link de rastreio
  - Status do pedido atualizado automaticamente para "Enviado"
- [x] **Confirmação de Recebimento via Email** - Botão "Recebi meu Pedido" no email de "Enviado" para cliente confirmar recebimento
  - Edge Function `confirm-order-received` processa confirmação via link seguro com token
  - Atualiza status para "Entregue" e registra `received_at`

### Avaliações
- [x] **Botão de Avaliação no Email de Entrega** - Email de status "Entregue" inclui botão "Avaliar minha Compra" com link para página de pedidos

### Contas e Pedidos
- [x] **Vinculação de Pedidos Guest a Conta Nova** - Trigger automático no signup vincula todos os pedidos anteriores feitos com o mesmo email
  - Função `handle_new_user` atualizada para vincular `orders.guest_email` ao novo `user_id`
  - Vinculação retroativa executada para usuários já existentes

---

*Última atualização: 13 de Dezembro de 2024*
