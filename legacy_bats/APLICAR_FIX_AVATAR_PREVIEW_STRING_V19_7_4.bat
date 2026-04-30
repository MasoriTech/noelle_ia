@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"

echo ================================================================
echo  Noelle V19.7.4 - Fix Avatar Preview string/build
echo ================================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado no PATH.
  echo Instale/ajuste o Node e tente de novo.
  pause
  exit /b 1
)

if not exist "scripts\fix_v19_7_4_unterminated_strings_2026.cjs" (
  echo [ERRO] Script de correcao nao encontrado.
  echo Copie a pasta scripts deste pack para a raiz do projeto.
  pause
  exit /b 1
)

node scripts\fix_v19_7_4_unterminated_strings_2026.cjs
if errorlevel 1 (
  echo [ERRO] Correcao V19.7.4 falhou.
  pause
  exit /b 1
)

node scripts\diagnostico_v19_7_4_avatar_preview_2026.cjs
if errorlevel 1 (
  echo [ERRO] Diagnostico V19.7.4 falhou.
  pause
  exit /b 1
)

echo.
echo [INFO] Gerando/verificando bundle do Avatar Preview...
call npm run build:avatar-lab-v19.6
if errorlevel 1 (
  echo [ERRO] Build do Avatar Preview falhou.
  pause
  exit /b 1
)

echo.
echo [OK] V19.7.4 aplicada com sucesso.
echo Agora use iniciar.bat.
pause
exit /b 0
