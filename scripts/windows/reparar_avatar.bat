@echo off
setlocal
set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"
echo ==========================
echo Reparando arquitetura limpa
echo ==========================
call npm.cmd install
if errorlevel 1 goto :erro
call npm.cmd run build-renderers
if errorlevel 1 goto :erro
call npm.cmd run verify-renderer-bundles
if errorlevel 1 goto :erro
call npm.cmd run smoke-test
if errorlevel 1 goto :erro
dir src\renderer_dist
echo.
echo Arquitetura limpa validada.
pause
exit /b 0
:erro
echo.
echo Falha ao reparar arquitetura limpa.
pause
exit /b 1
