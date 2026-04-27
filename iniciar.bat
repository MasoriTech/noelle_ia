@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title Noelle IA - INICIAR V17 Manutencao Segura

REM ============================================================
REM  Noelle IA - INICIAR.bat unico
REM  V17 Manutencao cirurgica + checklist de qualidade
REM ============================================================

cd /d "%~dp0"

:MENU
cls
echo ============================================================
echo  NOELLE IA - INICIAR V17
echo ============================================================
echo.
echo [1] Iniciar Noelle
echo [2] Diagnostico completo
echo [3] Reparar manifests/assets
echo [4] Limpar outros .bat da raiz para backup
echo [5] Aplicar manutencao segura sem iniciar
echo [0] Sair
echo.

set /p OP=Escolha: 

if "%OP%"=="1" goto START
if "%OP%"=="2" goto DIAG
if "%OP%"=="3" goto REPAIR
if "%OP%"=="4" goto CLEAN_BATS
if "%OP%"=="5" goto APPLY
if "%OP%"=="0" exit /b 0
goto MENU

:CHECK_NODE
where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [ERRO] Node.js nao encontrado no PATH.
  echo Instale Node.js LTS ou corrija o PATH.
  echo.
  pause
  goto MENU
)
exit /b 0

:START
call :CHECK_NODE
echo.
echo [START] Preparando e iniciando Noelle...
node scripts\noelle_maintenance_v17.cjs --start
echo.
pause
goto MENU

:DIAG
call :CHECK_NODE
echo.
echo [DIAG] Rodando diagnostico completo...
node scripts\diagnostico_v17.cjs
echo.
pause
goto MENU

:REPAIR
call :CHECK_NODE
echo.
echo [REPAIR] Reparando manifests/assets...
node scripts\rebuild_manifests_noelle.cjs
echo.
pause
goto MENU

:CLEAN_BATS
call :CHECK_NODE
echo.
echo [CLEAN] Movendo outros .bat da raiz para backup...
node scripts\noelle_maintenance_v17.cjs --clean-bats
echo.
pause
goto MENU

:APPLY
call :CHECK_NODE
echo.
echo [APPLY] Aplicando manutencao segura...
node scripts\noelle_maintenance_v17.cjs --apply
echo.
pause
goto MENU
