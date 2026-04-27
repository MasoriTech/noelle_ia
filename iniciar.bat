@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"

title Noelle - Inicializador inteligente V16.1

:menu
cls
echo ================================================================
echo  Noelle V16.1 - Inicializador inteligente
echo ================================================================
echo.
echo [1] Iniciar Noelle ^(verifica e instala somente o que faltar^)
echo [2] Preparar/Reparar dependencias essenciais
echo [3] Diagnostico Node/npm/Electron/assets
echo [4] Limpar outros .bat da raiz para backup
echo [0] Sair
echo.
set /p op=Escolha: 

if "%op%"=="1" goto start
if "%op%"=="2" goto prepare
if "%op%"=="3" goto diag
if "%op%"=="4" goto clean
if "%op%"=="0" exit /b 0
goto menu

:start
cls
node scripts\bootstrap_v16_1.cjs start
pause
goto menu

:prepare
cls
node scripts\bootstrap_v16_1.cjs prepare
pause
goto menu

:diag
cls
node scripts\bootstrap_v16_1.cjs diag
pause
goto menu

:clean
cls
node scripts\bootstrap_v16_1.cjs clean-bats
pause
goto menu
