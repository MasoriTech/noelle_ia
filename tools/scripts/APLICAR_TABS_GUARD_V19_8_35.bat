@echo off
setlocal
cd /d "%~dp0"
if not exist scripts\patch_tabs_guard_v19_8_35_2026.cjs (
  echo [ERRO] scripts\patch_tabs_guard_v19_8_35_2026.cjs nao encontrado.
  pause
  exit /b 1
)
node scripts\patch_tabs_guard_v19_8_35_2026.cjs
if errorlevel 1 (
  echo.
  echo [ERRO] Patch falhou. Veja a mensagem acima.
  pause
  exit /b 1
)
echo.
echo [OK] Patch de abas aplicado.
echo Rode: iniciar.bat
pause
