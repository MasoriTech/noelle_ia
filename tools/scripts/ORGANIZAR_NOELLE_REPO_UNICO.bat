@echo off
setlocal EnableExtensions
set "NOELLE_ORG_BAT_PATH=%~f0"
set "NOELLE_ORG_BAT_DIR=%~dp0"
set "NOELLE_ORG_TMP=%TEMP%\organizar_noelle_repo_%RANDOM%_%RANDOM%.ps1"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $bat=$env:NOELLE_ORG_BAT_PATH; $tmp=$env:NOELLE_ORG_TMP; $raw=Get-Content -LiteralPath $bat -Raw; $mark='### POWERSHELL_PAYLOAD ###'; $idx=$raw.IndexOf($mark); if($idx -lt 0){ throw 'Payload nao encontrado no .bat' }; $code=$raw.Substring($idx + $mark.Length); Set-Content -LiteralPath $tmp -Value $code -Encoding UTF8"
if errorlevel 1 (
  echo [ERRO] Falha ao preparar o organizador.
  pause
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%NOELLE_ORG_TMP%" %*
set "NOELLE_ORG_EXIT=%ERRORLEVEL%"
del "%NOELLE_ORG_TMP%" >nul 2>nul
exit /b %NOELLE_ORG_EXIT%

### POWERSHELL_PAYLOAD ###
$ErrorActionPreference = 'Stop'

function Write-Title($text) {
  Write-Host ''
  Write-Host '============================================================' -ForegroundColor DarkCyan
  Write-Host $text -ForegroundColor Cyan
  Write-Host '============================================================' -ForegroundColor DarkCyan
}

function Test-NoelleRoot($path) {
  if ([string]::IsNullOrWhiteSpace($path)) { return $false }
  return ((Test-Path -LiteralPath (Join-Path $path 'package.json')) -and (Test-Path -LiteralPath (Join-Path $path 'main.js')))
}

function Resolve-NoelleRoot {
  $candidates = New-Object System.Collections.Generic.List[string]
  $candidates.Add((Get-Location).Path)
  if ($env:NOELLE_ORG_BAT_DIR) { $candidates.Add($env:NOELLE_ORG_BAT_DIR) }
  if ($env:NOELLE_ORG_BAT_DIR) {
    $p = $env:NOELLE_ORG_BAT_DIR.TrimEnd('\','/')
    $parent = Split-Path -Parent $p
    if ($parent) { $candidates.Add($parent) }
  }

  foreach ($c in ($candidates | Select-Object -Unique)) {
    if (Test-NoelleRoot $c) { return (Resolve-Path -LiteralPath $c).Path }
  }

  Write-Host '[ERRO] Nao achei package.json + main.js na pasta atual.' -ForegroundColor Red
  Write-Host 'Cole o caminho da pasta noelle_ia, ou deixe vazio para sair.' -ForegroundColor Yellow
  $manual = Read-Host 'Caminho'
  if ([string]::IsNullOrWhiteSpace($manual)) { exit 1 }
  if (-not (Test-NoelleRoot $manual)) {
    Write-Host "[ERRO] Esta pasta nao parece ser a raiz do Noelle: $manual" -ForegroundColor Red
    exit 1
  }
  return (Resolve-Path -LiteralPath $manual).Path
}

function Add-FileMove($list, $path, $reason, $root, $selfPath) {
  if (-not (Test-Path -LiteralPath $path)) { return }
  $item = Get-Item -LiteralPath $path -Force
  if ($item.PSIsContainer) { return }
  if ($selfPath -and ($item.FullName -ieq $selfPath)) { return }
  if ($item.FullName -like ((Join-Path $root '_LIXO_ORGANIZADO') + '*')) { return }
  $list.Add([pscustomobject]@{ Kind='file'; Path=$item.FullName; Name=$item.Name; Reason=$reason }) | Out-Null
}

function Add-FolderMove($list, $path, $reason, $root) {
  if (-not (Test-Path -LiteralPath $path)) { return }
  $item = Get-Item -LiteralPath $path -Force
  if (-not $item.PSIsContainer) { return }
  if ($item.FullName -ieq $root) { return }
  if ($item.FullName -like ((Join-Path $root '.git') + '*')) { return }
  if ($item.FullName -like ((Join-Path $root 'node_modules') + '*')) { return }
  if ($item.FullName -like ((Join-Path $root '_LIXO_ORGANIZADO') + '*')) { return }
  $list.Add([pscustomobject]@{ Kind='folder'; Path=$item.FullName; Name=$item.Name; Reason=$reason }) | Out-Null
}

function Get-RelativePathSafe($root, $path) {
  try { return [System.IO.Path]::GetRelativePath($root, $path) } catch { return $path.Replace($root, '').TrimStart('\','/') }
}

function Move-ToTrash($entry, $root, $trashRoot) {
  $rel = Get-RelativePathSafe $root $entry.Path
  $dest = Join-Path $trashRoot $rel
  $destDir = Split-Path -Parent $dest
  New-Item -ItemType Directory -Force -Path $destDir | Out-Null
  if (Test-Path -LiteralPath $dest) {
    $base = [System.IO.Path]::GetFileNameWithoutExtension($dest)
    $ext = [System.IO.Path]::GetExtension($dest)
    $dir = Split-Path -Parent $dest
    $dest = Join-Path $dir ($base + '_moved_' + (Get-Random) + $ext)
  }
  Move-Item -LiteralPath $entry.Path -Destination $dest -Force
  return $dest
}

$root = Resolve-NoelleRoot
$selfPath = $env:NOELLE_ORG_BAT_PATH
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$trashRoot = Join-Path $root (Join-Path '_LIXO_ORGANIZADO' $stamp)
$reportPath = Join-Path $trashRoot 'RELATORIO_ORGANIZACAO.txt'

Write-Title 'ORGANIZADOR UNICO - NOELLE + YORU'
Write-Host "Raiz detectada: $root" -ForegroundColor Green
Write-Host 'Este arquivo NAO aplica patch. Ele apenas organiza a bagunca.' -ForegroundColor Yellow
Write-Host 'Nada sera movido ate voce digitar APLICAR.' -ForegroundColor Yellow

$moves = New-Object System.Collections.Generic.List[object]
$deletes = New-Object System.Collections.Generic.List[object]

$keepFiles = @(
  'main.js','preload.js','package.json','package-lock.json','readme.md','license','version',
  'requirements.txt','iniciar.bat','start.bat','iniciar.cmd','start.cmd',
  (Split-Path -Leaf $selfPath).ToLowerInvariant()
)

$rootFiles = Get-ChildItem -LiteralPath $root -Force -File
foreach ($f in $rootFiles) {
  $nameLower = $f.Name.ToLowerInvariant()
  if ($keepFiles -contains $nameLower) { continue }

  if ($f.Extension -match '^\.(zip|rar|7z|tar|gz)$') {
    Add-FileMove $moves $f.FullName 'arquivo compactado solto na raiz' $root $selfPath
    continue
  }
  if ($f.Name -match '(?i)\.(bak|backup|old|orig)(_|\.|$)') {
    Add-FileMove $moves $f.FullName 'backup antigo solto na raiz' $root $selfPath
    continue
  }
  if ($f.Name -match '(?i)^(README|LEIA|LEIA_ME|COMO|GUIA|TUTORIAL|INSTRUCOES)[_ -].*\.(md|txt)$') {
    Add-FileMove $moves $f.FullName 'readme/guia extra solto na raiz' $root $selfPath
    continue
  }
  if ($f.Name -match '(?i)^(CHANGELOG|HISTORICO|VERSAO|VERSOES)[_ -].*\.(md|txt)$') {
    Add-FileMove $moves $f.FullName 'changelog/historico extra solto na raiz' $root $selfPath
    continue
  }
  if ($f.Name -match '(?i)^(APLICAR|APENAS|CORRIGIR|REPARAR|RESTAURAR|CONFIGURAR|STT_CHECKUP|PATCH|FIX|DISABLE|RESTORE|DIAGNOSTICO|DIAGNOSTIC).*(\.bat|\.cmd|\.ps1|\.js|\.cjs)$') {
    Add-FileMove $moves $f.FullName 'script antigo/patch solto na raiz' $root $selfPath
    continue
  }
  if ($f.Name -match '(?i)^MEMORIA_GPT_NOELLE\.(md|txt)$') {
    Add-FileMove $moves $f.FullName 'memoria/export antigo solto na raiz' $root $selfPath
    continue
  }
  if ($f.Name -match '(?i)^src_renderer_modules_placeholder\.txt$') {
    Add-FileMove $moves $f.FullName 'placeholder antigo' $root $selfPath
    continue
  }
}

$legacyFolders = @(
  'legacy_bats','diagnostics','diagnosticos','backup','backups','old','_old','tmp','temp',
  '_ORGANIZADO_BACKUP','old_patches','patches_old','_patches','_backup'
)
foreach ($folderName in $legacyFolders) {
  Add-FolderMove $moves (Join-Path $root $folderName) 'pasta legado/backup antiga' $root
}

Get-ChildItem -LiteralPath $root -Recurse -Force -Directory -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -eq '__pycache__' -and $_.FullName -notlike ((Join-Path $root '_LIXO_ORGANIZADO') + '*') } |
  ForEach-Object { $deletes.Add([pscustomobject]@{ Kind='folder'; Path=$_.FullName; Name=$_.Name; Reason='cache python' }) | Out-Null }

Get-ChildItem -LiteralPath $root -Recurse -Force -File -Filter '*.pyc' -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notlike ((Join-Path $root '_LIXO_ORGANIZADO') + '*') } |
  ForEach-Object { $deletes.Add([pscustomobject]@{ Kind='file'; Path=$_.FullName; Name=$_.Name; Reason='cache python' }) | Out-Null }

$yoruData = Join-Path $root 'yoru_chat\data'
if (Test-Path -LiteralPath $yoruData) {
  foreach ($n in @('avatar_events.jsonl','runtime_state.json','apps_inventory.json','apps_prefs.json','tasks.json')) {
    Add-FileMove $moves (Join-Path $yoruData $n) 'runtime gerado pela Yoru' $root $selfPath
  }
  foreach ($n in @('screenshots','tts_cache','tmp')) {
    Add-FolderMove $moves (Join-Path $yoruData $n) 'runtime/pasta temporaria da Yoru' $root
  }
}

# Deduplicate.
$uniqueMoves = [ordered]@{}
foreach ($e in $moves) { if (-not $uniqueMoves.Contains($e.Path)) { $uniqueMoves[$e.Path] = $e } }
$moves = New-Object System.Collections.Generic.List[object]
foreach ($e in $uniqueMoves.Values) { $moves.Add($e) | Out-Null }

$uniqueDeletes = [ordered]@{}
foreach ($e in $deletes) { if (-not $uniqueDeletes.Contains($e.Path)) { $uniqueDeletes[$e.Path] = $e } }
$deletes = New-Object System.Collections.Generic.List[object]
foreach ($e in $uniqueDeletes.Values) { $deletes.Add($e) | Out-Null }

Write-Title 'VAI PARA _LIXO_ORGANIZADO'
if ($moves.Count -eq 0) {
  Write-Host 'Nada para mover.' -ForegroundColor Green
} else {
  $i = 1
  foreach ($e in ($moves | Sort-Object Kind, Name)) {
    $rel = Get-RelativePathSafe $root $e.Path
    Write-Host (('{0,3}. [{1}] {2}  -- {3}' -f $i, $e.Kind, $rel, $e.Reason))
    $i++
  }
}

Write-Title 'VAI SER APAGADO COMO CACHE'
if ($deletes.Count -eq 0) {
  Write-Host 'Nada para apagar.' -ForegroundColor Green
} else {
  $i = 1
  foreach ($e in ($deletes | Sort-Object Kind, Name)) {
    $rel = Get-RelativePathSafe $root $e.Path
    Write-Host (('{0,3}. [{1}] {2}  -- {3}' -f $i, $e.Kind, $rel, $e.Reason))
    $i++
  }
}

Write-Title 'CONFIRMACAO'
Write-Host 'Digite exatamente APLICAR para organizar.' -ForegroundColor Yellow
Write-Host 'Digite qualquer outra coisa para cancelar.' -ForegroundColor Yellow
$confirm = Read-Host 'Confirmar'
if ($confirm -ne 'APLICAR') {
  Write-Host 'Cancelado. Nada foi movido.' -ForegroundColor Yellow
  exit 0
}

New-Item -ItemType Directory -Force -Path $trashRoot | Out-Null
$report = New-Object System.Collections.Generic.List[string]
$report.Add('RELATORIO DE ORGANIZACAO - NOELLE + YORU') | Out-Null
$report.Add(('Data: ' + (Get-Date))) | Out-Null
$report.Add(('Raiz: ' + $root)) | Out-Null
$report.Add(('Lixo organizado: ' + $trashRoot)) | Out-Null
$report.Add('') | Out-Null

Write-Title 'APAGANDO CACHES'
foreach ($e in ($deletes | Sort-Object { $_.Path.Length } -Descending)) {
  try {
    if (Test-Path -LiteralPath $e.Path) {
      Remove-Item -LiteralPath $e.Path -Recurse -Force -ErrorAction Stop
      $rel = Get-RelativePathSafe $root $e.Path
      Write-Host "[OK] apagado: $rel" -ForegroundColor Green
      $report.Add("APAGADO: $rel -- $($e.Reason)") | Out-Null
    }
  } catch {
    $rel = Get-RelativePathSafe $root $e.Path
    Write-Host "[ERRO] nao apagou: $rel :: $($_.Exception.Message)" -ForegroundColor Red
    $report.Add("ERRO APAGAR: $rel :: $($_.Exception.Message)") | Out-Null
  }
}

Write-Title 'MOVENDO BAGUNCA PARA _LIXO_ORGANIZADO'
foreach ($e in ($moves | Sort-Object { $_.Path.Length } -Descending)) {
  try {
    if (Test-Path -LiteralPath $e.Path) {
      $dest = Move-ToTrash $e $root $trashRoot
      $rel = Get-RelativePathSafe $root $e.Path
      $destRel = Get-RelativePathSafe $root $dest
      Write-Host "[OK] movido: $rel" -ForegroundColor Green
      $report.Add("MOVIDO: $rel -> $destRel -- $($e.Reason)") | Out-Null
    }
  } catch {
    $rel = Get-RelativePathSafe $root $e.Path
    Write-Host "[ERRO] nao moveu: $rel :: $($_.Exception.Message)" -ForegroundColor Red
    $report.Add("ERRO MOVER: $rel :: $($_.Exception.Message)") | Out-Null
  }
}

$report.Add('') | Out-Null
$report.Add('PASTAS PRINCIPAIS ESPERADAS NA RAIZ:') | Out-Null
foreach ($n in @('src','assets','config','data','docs','scripts','tools','stt','yoru_memory','yoru_chat','.github')) {
  $exists = Test-Path -LiteralPath (Join-Path $root $n)
  $report.Add(('{0}: {1}' -f $n, ($(if($exists){'OK'}else{'NAO ENCONTRADA'})))) | Out-Null
}
Set-Content -LiteralPath $reportPath -Value $report -Encoding UTF8

Write-Title 'FINALIZADO'
Write-Host "Lixo organizado em: $trashRoot" -ForegroundColor Green
Write-Host "Relatorio: $reportPath" -ForegroundColor Green
Write-Host 'Agora a raiz deve estar mais limpa. Nada de patch foi aplicado.' -ForegroundColor Cyan
