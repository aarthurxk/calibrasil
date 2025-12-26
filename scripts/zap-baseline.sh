#!/bin/bash
# =====================================================
# Script DAST com OWASP ZAP Baseline
# Executa scan de segurança contra ambiente staging
# =====================================================

set -e

# URL padrão do staging (pode ser sobrescrita via argumento)
STAGING_URL="${1:-https://seu-staging.lovable.app}"

echo "🔍 OWASP ZAP Baseline Scan"
echo "==========================================="
echo "Target: $STAGING_URL"
echo ""

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
  echo "❌ Docker não está instalado. Instale o Docker primeiro."
  exit 1
fi

# Criar diretório para relatórios
mkdir -p reports

echo "📥 Baixando/atualizando imagem OWASP ZAP..."
docker pull ghcr.io/zaproxy/zaproxy:stable

echo ""
echo "🚀 Iniciando baseline scan..."
echo ""

# Executar ZAP baseline scan
# -t: URL alvo
# -r: Relatório HTML
# -w: Relatório Markdown
# -J: Relatório JSON
# -I: Incluir alertas informativos
# --hook: Script hook personalizado (opcional)
docker run --rm \
  -v "$(pwd)/reports:/zap/wrk/:rw" \
  -t ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py \
  -t "$STAGING_URL" \
  -r zap-report.html \
  -w zap-report.md \
  -J zap-report.json \
  -I \
  --auto \
  || true  # Não falhar em alertas

echo ""
echo "==========================================="
echo "📊 Relatórios gerados em ./reports/"
echo "  - zap-report.html (visual)"
echo "  - zap-report.md (markdown)"  
echo "  - zap-report.json (CI/CD)"
echo "==========================================="

# Verificar se há alertas de alto risco
if [ -f "reports/zap-report.json" ]; then
  HIGH_ALERTS=$(cat reports/zap-report.json | grep -o '"riskcode":"3"' | wc -l || echo "0")
  
  if [ "$HIGH_ALERTS" -gt 0 ]; then
    echo ""
    echo "⚠️ ATENÇÃO: $HIGH_ALERTS alertas de ALTO RISCO encontrados!"
    echo "Revise o relatório antes de ir para produção."
    exit 1
  else
    echo ""
    echo "✅ Nenhum alerta de alto risco encontrado."
  fi
fi
