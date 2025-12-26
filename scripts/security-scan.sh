#!/bin/bash
# =====================================================
# Script de Verificação de Segurança
# Executa SAST, análise de dependências e scan de secrets
# =====================================================

set -e

echo "🔒 Iniciando verificação de segurança..."
echo "==========================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# 1. Verificar dependências com vulnerabilidades conhecidas
echo ""
echo "📦 Verificando dependências (npm audit)..."
if npm audit --audit-level=high 2>/dev/null; then
  echo -e "${GREEN}✓ Sem vulnerabilidades altas/críticas nas dependências${NC}"
else
  echo -e "${YELLOW}⚠ Vulnerabilidades encontradas nas dependências${NC}"
  WARNINGS=$((WARNINGS + 1))
fi

# 2. Verificar secrets expostos com gitleaks (se instalado)
echo ""
echo "🔑 Verificando secrets expostos..."
if command -v gitleaks &> /dev/null; then
  if gitleaks detect --source . --no-git --redact -v 2>/dev/null; then
    echo -e "${GREEN}✓ Nenhum secret exposto encontrado${NC}"
  else
    echo -e "${RED}✗ Possíveis secrets expostos!${NC}"
    ERRORS=$((ERRORS + 1))
  fi
else
  echo -e "${YELLOW}⚠ gitleaks não instalado. Instale com: brew install gitleaks${NC}"
  
  # Fallback: verificação básica com grep
  echo "Executando verificação básica..."
  SECRETS_FOUND=$(grep -rn --include="*.ts" --include="*.tsx" --include="*.js" \
    -E "(sk_live_|pk_live_|AKIA[A-Z0-9]{16}|AIza[0-9A-Za-z_-]{35})" src/ 2>/dev/null || true)
  
  if [ -z "$SECRETS_FOUND" ]; then
    echo -e "${GREEN}✓ Verificação básica: nenhum padrão suspeito encontrado${NC}"
  else
    echo -e "${RED}✗ Padrões suspeitos encontrados:${NC}"
    echo "$SECRETS_FOUND"
    ERRORS=$((ERRORS + 1))
  fi
fi

# 3. Verificar uso de service_role key no frontend
echo ""
echo "🔐 Verificando uso de service_role key no frontend..."
SERVICE_ROLE_USAGE=$(grep -rn --include="*.ts" --include="*.tsx" \
  "SUPABASE_SERVICE_ROLE_KEY\|service_role" src/ 2>/dev/null || true)

if [ -z "$SERVICE_ROLE_USAGE" ]; then
  echo -e "${GREEN}✓ Nenhum uso de service_role no frontend${NC}"
else
  echo -e "${RED}✗ CRÍTICO: service_role encontrado no frontend!${NC}"
  echo "$SERVICE_ROLE_USAGE"
  ERRORS=$((ERRORS + 1))
fi

# 4. Verificar dangerouslySetInnerHTML
echo ""
echo "🛡️ Verificando uso de dangerouslySetInnerHTML..."
DANGEROUS_HTML=$(grep -rn --include="*.tsx" --include="*.jsx" \
  "dangerouslySetInnerHTML" src/ 2>/dev/null || true)

if [ -z "$DANGEROUS_HTML" ]; then
  echo -e "${GREEN}✓ Nenhum uso de dangerouslySetInnerHTML${NC}"
else
  echo -e "${YELLOW}⚠ dangerouslySetInnerHTML encontrado (verificar se é seguro):${NC}"
  echo "$DANGEROUS_HTML"
  WARNINGS=$((WARNINGS + 1))
fi

# 5. Verificar eval() e Function()
echo ""
echo "⚠️ Verificando uso de eval() e Function()..."
EVAL_USAGE=$(grep -rn --include="*.ts" --include="*.tsx" --include="*.js" \
  -E "\beval\s*\(|\bnew\s+Function\s*\(" src/ 2>/dev/null || true)

if [ -z "$EVAL_USAGE" ]; then
  echo -e "${GREEN}✓ Nenhum uso de eval() ou Function()${NC}"
else
  echo -e "${RED}✗ eval() ou Function() encontrado!${NC}"
  echo "$EVAL_USAGE"
  ERRORS=$((ERRORS + 1))
fi

# 6. Verificar localStorage com tokens sensíveis
echo ""
echo "💾 Verificando armazenamento de tokens..."
TOKEN_STORAGE=$(grep -rn --include="*.ts" --include="*.tsx" \
  -E "localStorage\.(set|get)Item.*token|sessionStorage\.(set|get)Item.*token" src/ 2>/dev/null || true)

if [ -z "$TOKEN_STORAGE" ]; then
  echo -e "${GREEN}✓ Nenhum armazenamento manual de tokens${NC}"
else
  echo -e "${YELLOW}⚠ Possível armazenamento de tokens (Supabase gerencia automaticamente):${NC}"
  echo "$TOKEN_STORAGE"
  WARNINGS=$((WARNINGS + 1))
fi

# 7. Semgrep (se instalado)
echo ""
echo "🔍 Executando análise SAST com Semgrep..."
if command -v semgrep &> /dev/null; then
  semgrep --config "p/react" --config "p/typescript" --config "p/owasp-top-ten" \
    --quiet --json src/ 2>/dev/null | head -100 || true
  echo -e "${GREEN}✓ Semgrep executado${NC}"
else
  echo -e "${YELLOW}⚠ Semgrep não instalado. Instale com: pip install semgrep${NC}"
fi

# Resumo
echo ""
echo "==========================================="
echo "📊 RESUMO DA VERIFICAÇÃO"
echo "==========================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ Nenhum problema de segurança encontrado!${NC}"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠ $WARNINGS avisos encontrados${NC}"
  exit 0
else
  echo -e "${RED}❌ $ERRORS erros críticos e $WARNINGS avisos${NC}"
  exit 1
fi
