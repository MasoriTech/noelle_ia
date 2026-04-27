@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

title Noelle Companion - Inicializador V15

:menu
cls
echo ================================================================
echo  Noelle Companion - V15 Auto Bootstrap 2026
echo ================================================================
echo.
echo  [1] Preparar tudo automaticamente e iniciar Noelle
echo  [2] Diagnostico: imports, assets, TTS, STT, Electron
echo  [3] Instalar/atualizar dependencias essenciais agora
echo  [4] Reparar manifests/assets sem instalar dependencias
echo  [5] Limpar outros .bat da raiz para backup
echo  [0] Sair
echo.
set /p OP=Escolha: 
if "%OP%"=="1" goto auto
if "%OP%"=="2" goto diag
if "%OP%"=="3" goto deps
if "%OP%"=="4" goto repair
if "%OP%"=="5" goto clean
if "%OP%"=="0" goto end
goto menu

:auto
cls
echo Preparando dependencias essenciais, TTS, manifests e ponte de assets...
node scripts\noelle_bootstrap_v15.cjs --auto
if errorlevel 1 goto fail
echo.
echo Iniciando Noelle...
npm start
goto pause

:diag
cls
node scripts\diagnostico_imports_v15.cjs
goto pause

:deps
cls
node scripts\noelle_bootstrap_v15.cjs --install
if errorlevel 1 goto fail
goto pause

:repair
cls
node scripts\noelle_bootstrap_v15.cjs --repair-only
if errorlevel 1 goto fail
goto pause

:clean
cls
node scripts\noelle_bootstrap_v15.cjs --clean-bats
if errorlevel 1 goto fail
goto pause

:fail
echo.
echo Falhou. Veja as mensagens acima.
:pause
echo.
pause
goto menu

:end
endlocal
