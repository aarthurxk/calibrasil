# =====================================================
# SECURITY CHECKLIST - E-Commerce Produção
# =====================================================

Este documento descreve as medidas de segurança implementadas
e como executar os testes.

## 🔒 Medidas Implementadas

### 1. Supabase RLS (Row Level Security)

Todas as tabelas sensíveis têm RLS habilitado:
- ✅ `products` - Leitura pública, escrita Admin/Manager
- ✅ `product_variants` - Leitura pública, escrita Admin/Manager  
- ✅ `orders` - Leitura própria ou Admin/Manager
- ✅ `order_items` - Segue permissão do pedido pai
- ✅ `profiles` - Leitura/escrita própria, Admin vê tudo
- ✅ `user_roles` - Admin gerencia, usuário vê próprio
- ✅ `coupons` - Admin gerencia, Manager limitado
- ✅ `audit_logs` - Apenas Admin lê, inserção via service
- ✅ `webhook_events` - Apenas Admin lê
- ✅ `import_jobs` - Apenas Admin
- ✅ `import_job_items` - Apenas Admin

### 2. RBAC (Role-Based Access Control)

- Tabela `user_roles` com enum `app_role`
- Função `has_role()` com SECURITY DEFINER
- Roles: admin, manager, customer

### 3. Arquitetura de Chaves

- ✅ Frontend usa apenas ANON_KEY
- ✅ SERVICE_ROLE apenas em Edge Functions
- ✅ Secrets em Supabase Secrets (não no código)

### 4. Idempotência de Webhooks

- ✅ Tabela `webhook_events` para rastrear eventos
- ✅ `check_webhook_processed()` antes de processar
- ✅ `mark_webhook_processed()` após processar
- ✅ Protege contra duplicatas Stripe/MercadoPago

### 5. Auditoria

- ✅ Tabela `audit_logs` com RLS
- ✅ Função `log_audit()` para registro
- ✅ Registra: logins, webhooks, imports, rollbacks

### 6. Headers de Segurança (vercel.json)

- ✅ HSTS (Strict-Transport-Security)
- ✅ X-Content-Type-Options: nosniff
- ✅ X-Frame-Options: DENY
- ✅ X-XSS-Protection
- ✅ Referrer-Policy
- ✅ Permissions-Policy
- ✅ CSP com allowlist para Stripe/MercadoPago

### 7. Validação de Input

- ✅ Validação de código de produto (C-XXX)
- ✅ Validação de arquivos de importação
- ✅ Mensagens de erro em PT-BR

## 🧪 Como Executar os Testes

### Verificação de Segurança Local

```bash
# Tornar scripts executáveis
chmod +x scripts/*.sh

# Executar scan completo (SAST + deps + secrets)
./scripts/security-scan.sh
```

### Testes de Autorização RLS

```bash
# Testar se RLS está bloqueando acessos não autorizados
./scripts/test-authorization.sh
```

### DAST com OWASP ZAP (requer Docker)

```bash
# Executar baseline scan contra staging
./scripts/zap-baseline.sh https://seu-staging.lovable.app

# Relatórios gerados em ./reports/
```

### CI/CD (GitHub Actions)

O workflow `.github/workflows/security.yml` executa:
- npm audit
- Gitleaks (secrets)
- Semgrep (SAST)
- Verificação de padrões críticos
- OWASP ZAP (semanal ou manual)

## 📋 Configurações Adicionais

### CSP para Provedores de Pagamento

Em `vercel.json`, a CSP inclui:
- `script-src`: js.stripe.com, sdk.mercadopago.com
- `frame-src`: js.stripe.com, checkout.mercadopago.com
- `connect-src`: api.stripe.com, api.mercadopago.com

### Instalação de Ferramentas (Opcional)

```bash
# Semgrep (SAST)
pip install semgrep

# Gitleaks (secrets scan)
brew install gitleaks  # macOS
# ou
sudo apt install gitleaks  # Linux

# OWASP ZAP (DAST)
docker pull ghcr.io/zaproxy/zaproxy:stable
```

## ⚠️ Itens Pendentes / Recomendações

1. **2FA para Admin**: Implementar TOTP quando possível
2. **Rate Limiting**: Adicionar em Edge Functions críticas
3. **WAF**: Considerar Cloudflare ou similar para produção
4. **Backup Automatizado**: Configurar backups do Supabase
5. **Monitoramento**: Configurar alertas para logs de auditoria

## 🔗 Links Úteis

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security](https://supabase.com/docs/guides/auth/auth-policies)
- [Semgrep Rules](https://semgrep.dev/explore)
- [OWASP ZAP](https://www.zaproxy.org/)
