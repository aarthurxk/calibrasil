# Roadmap Cali Brasil - v1.0

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
  - Ao inserir/atualizar código, enviar email automático ao cliente com link de rastreio
- [ ] **Confirmação de Recebimento via Email** - Botão no email de "Enviado" para cliente confirmar recebimento do pedido

### Avaliações
- [ ] **Botão de Avaliação no Email de Entrega** - Corrigir email de status "Entregue" para incluir link direto para avaliar o produto comprado

### UX/UI (Loja)
- [ ] **Filtros Avançados por Preço** - Filtrar produtos por faixa de preço (menor/maior valor)
  - Testar ordenação com produtos de preços variados

---

*Última atualização: Dezembro 2024*
