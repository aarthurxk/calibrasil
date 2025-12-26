# Documentação: Recurso "Confirmar Recebimento" v2

## 📋 Visão Geral

O recurso permite que clientes confirmem o recebimento de pedidos através de um link enviado por e-mail. A implementação v2 resolve os problemas de tela branca e incompatibilidade com clientes de e-mail.

## 🏗️ Arquitetura

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   E-mail        │────>│  Página React        │────>│  Edge Function  │
│   (botão link)  │     │  /confirmar-recebimento │  │  confirm-order- │
│                 │     │                      │     │  received-v2    │
└─────────────────┘     └──────────────────────┘     └─────────────────┘
                                                              │
                                                              v
                                                     ┌─────────────────┐
                                                     │  Supabase DB    │
                                                     │  - orders       │
                                                     │  - tokens       │
                                                     │  - audit_logs   │
                                                     └─────────────────┘
```

### Fluxo:
1. **E-mail** contém link para `https://calibrasil.com/confirmar-recebimento?orderId=...&token=...`
2. **Página React** (`/confirmar-recebimento`) é carregada
3. Página chama **Edge Function** (`confirm-order-received-v2`) via `supabase.functions.invoke()`
4. Edge Function valida token e atualiza pedido
5. Página exibe resultado (sucesso/erro/já confirmado)

## 📁 Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/ConfirmarRecebimento.tsx` | Página pública que exibe status |
| `supabase/functions/confirm-order-received-v2/index.ts` | Edge Function nova |
| `src/components/ErrorBoundary.tsx` | Previne tela branca |
| `supabase/functions/send-order-status-email/index.ts` | Gera link correto |

## 🔐 Segurança

1. **Tokens seguros**: SHA256 hash armazenado, nunca o token puro
2. **Uso único**: `used_at` marca quando foi usado
3. **Expiração**: 7 dias por padrão
4. **Idempotência**: Se já confirmado, retorna sucesso
5. **Auditoria**: Todas as tentativas são logadas

## 📊 Status de Resposta

| Status | `ok` | Descrição |
|--------|------|-----------|
| `confirmed` | ✅ | Recebimento confirmado |
| `already_confirmed` | ✅ | Já estava confirmado |
| `used` | ✅ | Token usado, mas pedido confirmado |
| `invalid_token` | ❌ | Token inválido |
| `expired` | ❌ | Token expirado |
| `not_found` | ❌ | Pedido não encontrado |
| `error` | ❌ | Erro inesperado |

## 🧪 Testes

### Testes Unitários (Casos da Edge Function)

```bash
# 1. Token válido -> confirmed
curl -X POST https://vbnazlnwudhewjgftxce.supabase.co/functions/v1/confirm-order-received-v2 \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ORDER_ID", "token": "VALID_TOKEN"}'
# Esperado: {"ok":true,"status":"confirmed","message_pt":"..."}

# 2. Token usado -> used
# Repetir o mesmo request
# Esperado: {"ok":true,"status":"used","message_pt":"..."}

# 3. Token inválido -> invalid_token
curl -X POST https://vbnazlnwudhewjgftxce.supabase.co/functions/v1/confirm-order-received-v2 \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ORDER_ID", "token": "INVALID"}'
# Esperado: {"ok":false,"status":"invalid_token","message_pt":"..."}

# 4. Pedido inexistente -> not_found
curl -X POST https://vbnazlnwudhewjgftxce.supabase.co/functions/v1/confirm-order-received-v2 \
  -H "Content-Type: application/json" \
  -d '{"orderId": "00000000-0000-0000-0000-000000000000", "token": "TOKEN"}'
# Esperado: {"ok":false,"status":"not_found","message_pt":"..."}

# 5. Já confirmado (idempotência) -> already_confirmed
# Chamar para pedido com status 'delivered' e received_at preenchido
# Esperado: {"ok":true,"status":"already_confirmed","message_pt":"..."}
```

### Teste E2E (Playwright exemplo)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Confirmar Recebimento', () => {
  test('exibe página de loading e depois resultado', async ({ page }) => {
    await page.goto('/confirmar-recebimento?orderId=test&token=test');
    
    // Deve exibir algo, nunca tela branca
    await expect(page.locator('body')).not.toBeEmpty();
    
    // Título deve aparecer
    await expect(page.locator('h1')).toBeVisible();
  });

  test('token inválido mostra erro amigável', async ({ page }) => {
    await page.goto('/confirmar-recebimento?orderId=invalid&token=invalid');
    
    // Aguardar resposta
    await page.waitForSelector('h1');
    
    // Não deve ter tela branca
    const content = await page.textContent('body');
    expect(content?.length).toBeGreaterThan(50);
  });

  test('sem parâmetros mostra erro', async ({ page }) => {
    await page.goto('/confirmar-recebimento');
    
    // Deve mostrar mensagem de link incompleto
    await expect(page.locator('text=Link de confirmação incompleto')).toBeVisible();
  });
});
```

### Checklist Manual

| Teste | Gmail Desktop | Gmail Mobile | Zoho | Outlook |
|-------|--------------|--------------|------|---------|
| Link abre corretamente | ⬜ | ⬜ | ⬜ | ⬜ |
| Página renderiza | ⬜ | ⬜ | ⬜ | ⬜ |
| Mostra loading | ⬜ | ⬜ | ⬜ | ⬜ |
| Mostra resultado | ⬜ | ⬜ | ⬜ | ⬜ |
| Botões funcionam | ⬜ | ⬜ | ⬜ | ⬜ |
| Sem tela branca | ⬜ | ⬜ | ⬜ | ⬜ |

### Verificação no Banco de Dados

```sql
-- 1. Verificar se pedido foi atualizado
SELECT id, status, received_at 
FROM orders 
WHERE id = 'ORDER_ID';

-- 2. Verificar se token foi marcado como usado
SELECT order_id, used_at, expires_at 
FROM order_confirm_tokens 
WHERE order_id = 'ORDER_ID';

-- 3. Ver logs de auditoria
SELECT action, entity_id, metadata, created_at 
FROM audit_logs 
WHERE entity_type = 'order_confirmation' 
ORDER BY created_at DESC 
LIMIT 10;
```

## 🐛 Diagnóstico de Problemas

### Causa Raiz do Bug Original

O bug de "tela branca" tinha múltiplas causas:

1. **Link apontava para Edge Function diretamente**: Clientes de e-mail podem interpretar redirecionamentos 302 como problemas.

2. **SPA sem rewrite**: Rotas como `/confirmacao-recebimento` não tinham fallback para `index.html` no deploy.

3. **Redirect para rota protegida**: Usuário não logado era redirecionado para login.

4. **Falta de ErrorBoundary**: Erros de JS causavam tela branca sem feedback.

### Correções Aplicadas

1. ✅ Link agora aponta para domínio do site (não Edge Function)
2. ✅ Página React chama API via fetch (melhor compatibilidade)
3. ✅ Rota `/confirmar-recebimento` é pública (sem auth)
4. ✅ ErrorBoundary captura erros e mostra UI amigável
5. ✅ vercel.json tem rewrites para SPA
6. ✅ Resposta JSON padronizada com mensagens em PT-BR

## 🔧 Manutenção

### Para Regenerar Token de um Pedido

```sql
SELECT create_order_confirm_token('ORDER_UUID');
```

### Para Verificar Tokens Expirados

```sql
SELECT order_id, expires_at, used_at 
FROM order_confirm_tokens 
WHERE expires_at < NOW() 
AND used_at IS NULL;
```

### Para Limpar Tokens Antigos

```sql
DELETE FROM order_confirm_tokens 
WHERE expires_at < NOW() - INTERVAL '30 days';
```

## 📝 Changelog

### v2.0.0 (2025-12-26)
- Nova arquitetura: link aponta para página do site
- Edge Function retorna JSON padronizado
- Página React com estados de loading/sucesso/erro
- ErrorBoundary global
- Auditoria completa de tentativas
- Documentação e testes
