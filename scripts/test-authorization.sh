#!/bin/bash
# =====================================================
# Testes de Autorização RLS
# Verifica se políticas RLS estão funcionando corretamente
# =====================================================

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔐 Testes de Autorização RLS"
echo "==========================================="

# Configurações (use variáveis de ambiente ou .env)
SUPABASE_URL="${SUPABASE_URL:-https://vbnazlnwudhewjgftxce.supabase.co}"
ANON_KEY="${SUPABASE_ANON_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZibmF6bG53dWRoZXdqZ2Z0eGNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyMzY5MjYsImV4cCI6MjA4MDgxMjkyNn0.vbARNoCjAEbcauQQsE4xK2S7Oi3SLle1EBHYbra0qSQ}"

ERRORS=0

# Helper function para testar endpoint
test_table() {
  local table=$1
  local expected_status=$2
  local description=$3
  
  response=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY" \
    "$SUPABASE_URL/rest/v1/$table?limit=1")
  
  if [ "$response" = "$expected_status" ]; then
    echo -e "${GREEN}✓${NC} $description (HTTP $response)"
  else
    echo -e "${RED}✗${NC} $description - Esperado $expected_status, recebeu $response"
    ERRORS=$((ERRORS + 1))
  fi
}

# Helper para testar INSERT
test_insert() {
  local table=$1
  local data=$2
  local expected_status=$3
  local description=$4
  
  response=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=minimal" \
    -d "$data" \
    "$SUPABASE_URL/rest/v1/$table")
  
  if [ "$response" = "$expected_status" ]; then
    echo -e "${GREEN}✓${NC} $description (HTTP $response)"
  else
    echo -e "${RED}✗${NC} $description - Esperado $expected_status, recebeu $response"
    ERRORS=$((ERRORS + 1))
  fi
}

echo ""
echo "📖 Testando acesso anônimo de LEITURA..."
echo ""

# Tabelas que devem permitir leitura pública
test_table "products" "200" "products: leitura pública permitida"
test_table "categories?is_active=eq.true" "200" "categories: leitura de ativos permitida"
test_table "product_variants" "200" "product_variants: leitura pública permitida"
test_table "product_reviews" "200" "product_reviews: leitura pública permitida"

echo ""
echo "🔒 Testando acesso anônimo a tabelas RESTRITAS..."
echo ""

# Tabelas que NÃO devem permitir leitura anônima
test_table "orders" "200" "orders: deve retornar vazio (RLS)"
test_table "profiles" "200" "profiles: deve retornar vazio (RLS)"
test_table "user_roles" "200" "user_roles: deve retornar vazio (RLS)"
test_table "audit_logs" "200" "audit_logs: deve retornar vazio (RLS)"
test_table "webhook_events" "200" "webhook_events: deve retornar vazio (RLS)"
test_table "import_jobs" "200" "import_jobs: deve retornar vazio (RLS)"
test_table "coupons" "200" "coupons: deve retornar vazio (RLS)"
test_table "store_settings" "200" "store_settings: deve retornar vazio (RLS)"

echo ""
echo "✏️ Testando INSERT anônimo (deve ser bloqueado)..."
echo ""

# Tentar inserir dados (deve falhar)
test_insert "products" '{"name":"Teste","category":"Tech","price":99}' "403" "products: INSERT bloqueado"
test_insert "orders" '{"total":100}' "403" "orders: INSERT bloqueado"
test_insert "profiles" '{"full_name":"Hacker"}' "403" "profiles: INSERT bloqueado"
test_insert "user_roles" '{"role":"admin"}' "403" "user_roles: INSERT bloqueado"

echo ""
echo "==========================================="

if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✅ Todos os testes de autorização passaram!${NC}"
  exit 0
else
  echo -e "${RED}❌ $ERRORS testes falharam!${NC}"
  echo "Revise as políticas RLS."
  exit 1
fi
