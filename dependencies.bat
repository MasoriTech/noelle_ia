@echo off
setlocal
set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"
echo ==========================
echo Instalando dependencias Noelle Companion...
echo ==========================
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo npm.cmd nao foi encontrado no PATH.
  echo Instale o Node.js e abra um novo terminal.
  pause
  exit /b 1
)

call npm.cmd install
if errorlevel 1 goto :erro

call npm.cmd run build-renderers
if errorlevel 1 goto :erro

call npm.cmd run verify-renderer-bundles
if errorlevel 1 goto :erro

call npm.cmd run smoke-test
if errorlevel 1 goto :erro

echo.
echo Ambiente pronto.
pause
exit /b 0

:erro
echo.
echo Falha ao instalar dependencias ou gerar os bundles limpos.
pause
exit /b 1
