@echo off
chcp 65001 >nul
setlocal EnableExtensions
cd /d "%~dp0"

echo ============================================================
echo  Noelle/Yoru V19.7.3 - corrigir build regex do Avatar
echo ============================================================

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado no PATH.
  pause
  exit /b 1
)

if not exist "package.json" (
  echo [ERRO] Rode este .bat dentro da raiz do projeto noelle_ia.
  pause
  exit /b 1
)

if not exist "scripts\fix_v19_7_3_build_regex_2026.cjs" (
  echo [ERRO] Arquivo ausente: scripts\fix_v19_7_3_build_regex_2026.cjs
  pause
  exit /b 1
)

node scripts\fix_v19_7_3_build_regex_2026.cjs --apply
if errorlevel 1 (
  echo [ERRO] Fix V19.7.3 falhou.
  pause
  exit /b 1
)

node scripts\diagnostico_v19_7_3_build_regex_2026.cjs
if errorlevel 1 (
  echo [ERRO] Diagnostico V19.7.3 falhou.
  pause
  exit /b 1
)

echo.
echo [OK] Agora tentando gerar o bundle do Avatar Preview...
npm run build:avatar-lab-v19.6
if errorlevel 1 (
  echo [ERRO] Build ainda falhou. Se aparecer esbuild nao encontrado, rode npm install.
  pause
  exit /b 1
)

echo.
echo [OK] Build corrigido. Use iniciar.bat para abrir o projeto.
pause
exit /b 0
