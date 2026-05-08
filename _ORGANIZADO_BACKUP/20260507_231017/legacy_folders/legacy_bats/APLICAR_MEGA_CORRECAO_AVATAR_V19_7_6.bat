@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"

echo ============================================================
echo  Noelle V19.7.6 - Mega correcao Avatar limpo/carrossel
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado no PATH.
  echo Instale/abra o terminal com Node e tente novamente.
  pause
  exit /b 1
)

if not exist package.json (
  echo [ERRO] Rode este .bat na raiz do projeto noelle_ia.
  pause
  exit /b 1
)

node scripts\fix_mega_avatar_v19_7_6_2026.cjs --apply
if errorlevel 1 (
  echo [ERRO] Aplicacao da mega correcao falhou.
  pause
  exit /b 1
)

if not exist node_modules (
  echo [INFO] node_modules nao encontrado. Rodando npm install...
  npm install
  if errorlevel 1 (
    echo [ERRO] npm install falhou.
    pause
    exit /b 1
  )
)

echo [INFO] Gerando bundle do Avatar limpo/carrossel...
npm run build:avatar-carousel-v19.7.6
if errorlevel 1 (
  echo [ERRO] Build do Avatar carrossel falhou.
  pause
  exit /b 1
)

echo [INFO] Rodando diagnostico V19.7.6...
npm run diagnostico:v19.7.6
if errorlevel 1 (
  echo [ERRO] Diagnostico V19.7.6 falhou.
  pause
  exit /b 1
)

echo.
echo [OK] Mega correcao V19.7.6 aplicada com sucesso.
echo Use iniciar.bat para abrir a Noelle.
pause
