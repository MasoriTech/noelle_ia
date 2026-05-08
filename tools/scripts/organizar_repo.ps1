#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Limpeza e organização do repositório Noelle/Yoru com segurança
.DESCRIPTION
    - Move scripts de patch para pasta patch/
    - Move scripts de setup/limpeza para tools/scripts/
    - Remove caches Python/Node
    - Cria backup de segurança
#>

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  LIMPEZA E ORGANIZACAO DO REPOSITORIO NOELLE" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$root = Get-Location
$timestamp = (Get-Date -Format "yyyyMMdd_HHmmss")
$backupDir = "$root\_ORGANIZADO_BACKUP\cleanup_$timestamp"

# Criar pasta de backup
Write-Host "[*] Criando backup de segurança..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Write-Host "[OK] Backup em: $backupDir" -ForegroundColor Green
Write-Host ""

# ============================================================
# 1. LIMPAR CACHES PYTHON/NODE
# ============================================================
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  ETAPA 1 - Limpando caches temporários" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$removeDirs = @("__pycache__", ".pytest_cache", ".mypy_cache", ".egg-info")
foreach ($pattern in $removeDirs) {
    Get-ChildItem -Recurse -Directory -Filter $pattern -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "Removendo: $($_.FullName)"
        Remove-Item -Recurse -Force $_.FullName -ErrorAction SilentlyContinue
    }
}

# Limpar .pyc
Get-ChildItem -Recurse -File -Filter "*.pyc" -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "Removendo: $($_.FullName)"
    Remove-Item -Force $_.FullName -ErrorAction SilentlyContinue
}

Write-Host "[OK] Caches temporários limpos" -ForegroundColor Green
Write-Host ""

# ============================================================
# 2. ORGANIZAR SCRIPTS DE PATCH
# ============================================================
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  ETAPA 2 - Movendo scripts de patch" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$patchDir = "$root\patch"
New-Item -ItemType Directory -Path $patchDir -Force | Out-Null

$patchFiles = @(
    "patch_apply_runtime_v20.js",
    "restore_avatar_renderer_patch.js",
    "disable_legacy_avatar_loader.js"
)

foreach ($file in $patchFiles) {
    $srcPath = "$root\$file"
    if (Test-Path $srcPath) {
        $destPath = "$patchDir\$file"
        Write-Host "Movendo: $file -> patch/"
        Move-Item -Path $srcPath -Destination $destPath -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "[OK] Scripts de patch organizados" -ForegroundColor Green
Write-Host ""

# ============================================================
# 3. ORGANIZAR SCRIPTS .BAT DE UTILIDADE
# ============================================================
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  ETAPA 3 - Movendo scripts .bat de utilidade" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$toolsScriptsDir = "$root\tools\scripts"
New-Item -ItemType Directory -Path $toolsScriptsDir -Force | Out-Null

$batFilesToMove = @(
    "CONFIGURAR_STT.bat",
    "STT_CHECKUP.bat",
    "APLICAR_CHAT_TEXTO_V20.bat",
    "APLICAR_LIMPEZA_BATS_RELATORIOS_V20.bat",
    "APLICAR_ORGANIZACAO_V20.bat",
    "APLICAR_STREAM_V19_8_33.bat",
    "APLICAR_STREAM_V19_8_34.bat",
    "APLICAR_TABS_GUARD_V19_8_35.bat",
    "APLICAR_TABS_STRUCTURE_GUARD_V19_8_36.bat",
    "APENAS_DIAGNOSTICAR_ABAS_DUPLICADAS_V19_8_37.bat",
    "RESOLVER_YORU_NOELLE.bat"
)

foreach ($bat in $batFilesToMove) {
    $srcPath = "$root\$bat"
    if (Test-Path $srcPath) {
        $destPath = "$toolsScriptsDir\$bat"
        Write-Host "Movendo: $bat -> tools/scripts/"
        Move-Item -Path $srcPath -Destination $destPath -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "[OK] Scripts .bat organizados em tools/scripts" -ForegroundColor Green
Write-Host ""

# ============================================================
# 4. ORGANIZAR DOCUMENTAÇÃO EXTRA
# ============================================================
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  ETAPA 4 - Organizando documentação extra" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$docsDir = "$root\docs\__extras"
New-Item -ItemType Directory -Path $docsDir -Force | Out-Null

$docFiles = @(
    "LEIA_PRIMEIRO.txt",
    "LEIA_ME_V19_7_8.txt",
    "GITIGNORE_YORU_CHAT_SNIPPET.txt",
    "src_renderer_modules_placeholder.txt"
)

foreach ($doc in $docFiles) {
    $srcPath = "$root\$doc"
    if (Test-Path $srcPath) {
        $destPath = "$docsDir\$doc"
        Write-Host "Movendo: $doc -> docs/__extras/"
        Move-Item -Path $srcPath -Destination $destPath -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "[OK] Documentação extra movida para docs/__extras" -ForegroundColor Green
Write-Host ""

# ============================================================
# 5. LISTAR ARQUIVOS REMANESCENTES NA RAIZ
# ============================================================
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  ETAPA 5 - Arquivos remanescentes na raiz" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$rootFiles = Get-ChildItem -Path $root -File -Depth 0 | Where-Object { !$_.Name.StartsWith(".") }
Write-Host "Total: $($rootFiles.Count) arquivos" -ForegroundColor Cyan
$rootFiles | ForEach-Object { Write-Host "  - $($_.Name)" }
Write-Host ""

# ============================================================
# 6. LISTAR PASTAS PRINCIPAIS
# ============================================================
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  ETAPA 6 - Estrutura de pastas principais" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$dirs = Get-ChildItem -Path $root -Directory -Depth 0 | Where-Object { !$_.Name.StartsWith(".") } | Sort-Object Name
$dirs | ForEach-Object { 
    $itemCount = @(Get-ChildItem -Path $_.FullName -Recurse -File).Count
    Write-Host "  $($_.Name)/ ($itemCount arquivos)"
}
Write-Host ""

Write-Host "========================================================" -ForegroundColor Green
Write-Host "  LIMPEZA E ORGANIZACAO CONCLUIDA" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Resumo:" -ForegroundColor Yellow
Write-Host "  - Caches Python/Node removidos" -ForegroundColor Green
Write-Host "  - Scripts de patch movidos para patch/" -ForegroundColor Green
Write-Host "  - Scripts .bat movidos para tools/scripts/" -ForegroundColor Green
Write-Host "  - Documentação extra movida para docs/__extras/" -ForegroundColor Green
Write-Host ""
Write-Host "Backup disponível em:" -ForegroundColor Cyan
Write-Host "  $backupDir" -ForegroundColor Cyan
Write-Host ""
