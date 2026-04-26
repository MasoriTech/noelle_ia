@echo off
setlocal
set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"
echo ==========================
echo Gerando programa Windows...
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
call npm.cmd run dist:win
if errorlevel 1 goto :erro

echo.
echo Build finalizado. Veja a pasta release.
pause
exit /b 0

:erro
echo.
echo Falha ao gerar o programa Windows.
pause
exit /b 1
