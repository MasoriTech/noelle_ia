@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"

echo ================================================================
echo  Noelle/Yoru - Avatar Foco Carrossel V19.7.2 2026
echo ================================================================
echo.

if not exist "package.json" (
  echo [ERRO] Rode este .bat dentro da raiz do projeto noelle_ia.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado no PATH.
  echo Instale o Node.js ou abra o terminal correto e tente novamente.
  pause
  exit /b 1
)

echo [1/4] Aplicando layout Avatar maior + carrossel VRM...
node scripts\apply_v19_7_2_avatar_focus_carousel_2026.cjs --apply
if errorlevel 1 (
  echo [ERRO] Aplicador V19.7.2 falhou.
  pause
  exit /b 1
)

echo.
echo [2/4] Rodando diagnostico...
node scripts\diagnostico_v19_7_2_avatar_focus_carousel_2026.cjs
if errorlevel 1 (
  echo [ERRO] Diagnostico encontrou problema.
  pause
  exit /b 1
)

echo.
echo [3/4] Gerando bundle do Avatar Lab/Preview...
npm run build:avatar-lab-v19.6
if errorlevel 1 (
  echo [ERRO] Build do Avatar Preview falhou.
  pause
  exit /b 1
)

echo.
echo [4/4] Finalizado.
echo [OK] Avatar Preview agora fica maior, focado no VRM, com setas embaixo.
echo [OK] iniciar.bat atualizado incluido neste pack.
echo.
pause
