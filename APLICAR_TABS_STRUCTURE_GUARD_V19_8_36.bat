@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
echo ================================================================
echo  Noelle Companion - Tabs Structure Guard V19.8.36
echo ================================================================
echo.
if not exist package.json (
  echo [ERRO] Copie o conteudo deste pack para a raiz do projeto noelle_ia.
  echo        Esta pasta precisa ter package.json e src\
  pause
  exit /b 1
)
node scripts\aplicar_tabs_structure_guard_v19_8_36.cjs
if errorlevel 1 (
  echo.
  echo [ERRO] Patch falhou.
  pause
  exit /b 1
)
echo.
node scripts\diagnostico_tabs_structure_guard_v19_8_36.cjs
echo.
echo Finalizado. Agora rode iniciar.bat
pause
