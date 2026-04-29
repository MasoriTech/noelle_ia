@echo off
setlocal EnableExtensions
cd /d "%~dp0"

title Noelle Companion 2026 - iniciar atualizado

echo ============================================================
echo  Noelle Companion 2026 - iniciar.bat atualizado
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado no PATH.
  echo Abra o terminal correto ou instale o Node.js.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERRO] npm nao encontrado no PATH.
  pause
  exit /b 1
)

echo [INFO] Verificando Avatar limpo V19.7.5...
node -e "const fs=require('fs'); const f='src/renderer/avatar_v19_5_panel_bootstrap.js'; process.exit(fs.existsSync(f)&&fs.readFileSync(f,'utf8').includes('NOELLE_V19_7_5_AVATAR_CLEAN')?0:1)" >nul 2>nul
if errorlevel 1 (
  echo [INFO] Avatar limpo ainda nao aplicado. Aplicando agora...
  if exist scripts\fix_v19_7_5_avatar_clean_carousel_2026.cjs (
    node scripts\fix_v19_7_5_avatar_clean_carousel_2026.cjs
    if errorlevel 1 (
      echo [ERRO] Nao foi possivel aplicar o Avatar limpo.
      pause
      exit /b 1
    )
  ) else (
    echo [AVISO] Script V19.7.5 nao encontrado. Continuando sem aplicar patch.
  )
) else (
  echo [OK] Avatar limpo V19.7.5 ja aplicado.
)

if not exist node_modules (
  echo [AVISO] Dependencias nao encontradas.
  echo Rode: npm install
  pause
  exit /b 1
)

if exist scripts\diagnostico_v19_7_5_avatar_clean_2026.cjs (
  node scripts\diagnostico_v19_7_5_avatar_clean_2026.cjs
  if errorlevel 1 (
    echo [ERRO] Diagnostico falhou. Reaplicando patch V19.7.5...
    if exist scripts\fix_v19_7_5_avatar_clean_carousel_2026.cjs node scripts\fix_v19_7_5_avatar_clean_carousel_2026.cjs
    if errorlevel 1 (
      echo [ERRO] Reparo automatico falhou.
      pause
      exit /b 1
    )
  )
)

if not exist src\renderer_dist\avatar_lab_v19_6.bundle.js (
  echo [INFO] Bundle do Avatar limpo nao encontrado. Gerando...
  npm run build:avatar-lab-v19.6
  if errorlevel 1 (
    echo [ERRO] Build do Avatar limpo falhou.
    pause
    exit /b 1
  )
) else (
  echo [OK] Bundle do Avatar limpo encontrado.
)

echo.
echo [INFO] Iniciando Noelle Companion...
npm start
set EXITCODE=%ERRORLEVEL%

echo.
echo [INFO] Noelle encerrada com codigo %EXITCODE%.
if not "%EXITCODE%"=="0" (
  echo [DICA] Se falhar, rode npm install e depois iniciar.bat novamente.
)
pause
exit /b %EXITCODE%
