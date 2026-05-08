@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ============================================================
echo  Noelle - aplicar Avatar limpo com carrossel V19.7.5
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado no PATH.
  echo Instale/abra o terminal correto e tente de novo.
  pause
  exit /b 1
)

node scripts\fix_v19_7_5_avatar_clean_carousel_2026.cjs
if errorlevel 1 (
  echo [ERRO] Falha ao aplicar o Avatar limpo V19.7.5.
  pause
  exit /b 1
)

if not exist node_modules (
  echo [AVISO] node_modules nao encontrado. Rode: npm install
) else (
  echo [INFO] Gerando bundle do Avatar limpo...
  npm run build:avatar-lab-v19.6
  if errorlevel 1 (
    echo [ERRO] Build do Avatar limpo falhou.
    pause
    exit /b 1
  )
)

node scripts\diagnostico_v19_7_5_avatar_clean_2026.cjs
if errorlevel 1 (
  echo [ERRO] Diagnostico V19.7.5 falhou.
  pause
  exit /b 1
)

echo.
echo [OK] Avatar limpo com carrossel aplicado.
echo [INFO] Agora use iniciar.bat
pause
exit /b 0
