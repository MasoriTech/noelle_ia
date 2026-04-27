@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title Noelle IA - Hotfix V17.1 Widget Avatar

cd /d "%~dp0"

:MENU
cls
echo ============================================================
echo  NOELLE IA - HOTFIX V17.1 WIDGET / AVATAR
echo ============================================================
echo.
echo [1] Aplicar hotfix e iniciar Noelle
echo [2] Aplicar hotfix somente
echo [3] Diagnostico do widget/avatar
echo [0] Sair
echo.
set /p "OP=Escolha: "

if "%OP%"=="1" goto APPLY_START
if "%OP%"=="2" goto APPLY_ONLY
if "%OP%"=="3" goto DIAG
if "%OP%"=="0" exit /b 0
goto MENU

:APPLY_START
node scripts\hotfix_v17_1_widget_avatar.cjs --apply
if errorlevel 1 goto FAIL

if exist "scripts\noelle_maintenance_v17.cjs" (
  node scripts\noelle_maintenance_v17.cjs --start
) else if exist "node_modules\.bin\electron.cmd" (
  call node_modules\.bin\electron.cmd .
) else (
  npm start
)
pause
goto MENU

:APPLY_ONLY
node scripts\hotfix_v17_1_widget_avatar.cjs --apply
pause
goto MENU

:DIAG
node scripts\hotfix_v17_1_widget_avatar.cjs --diag
pause
goto MENU

:FAIL
echo.
echo [ERRO] Hotfix falhou. Veja as mensagens acima.
pause
goto MENU
