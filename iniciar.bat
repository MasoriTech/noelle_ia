@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title Noelle V19.3 - Complete UI/MD Pack

set "ROOT=%~dp0"
cd /d "%ROOT%"

:MENU
cls
echo ============================================================
echo  NOELLE V19.3 - COMPLETE UI / MD PACK
echo ============================================================
echo.
echo [1] Aplicar V19.3 completo e iniciar Noelle
echo [2] Aplicar V19.3 completo sem iniciar
echo [3] Diagnostico V19.3
echo [0] Sair
echo.
set /p "OP=Escolha: "

if "%OP%"=="1" goto APPLY_START
if "%OP%"=="2" goto APPLY_ONLY
if "%OP%"=="3" goto DIAG
if "%OP%"=="0" exit /b 0
goto MENU

:CHECK_NODE
where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node nao encontrado no PATH.
  pause
  exit /b 1
)
for /f "tokens=* delims=" %%A in ('node -v 2^>nul') do echo [OK] Node %%A
exit /b 0

:APPLY_START
call :CHECK_NODE
if errorlevel 1 goto MENU
node scripts\apply_v19_3_complete_ui_md_2026.cjs --apply
if errorlevel 1 (
  echo [ERRO] Patch falhou.
  pause
  goto MENU
)
node scripts\diagnostico_v19_3_complete_ui_md_2026.cjs
if exist "node_modules\.bin\electron.cmd" (
  echo [START] Iniciando Noelle...
  call "node_modules\.bin\electron.cmd" .
) else (
  echo [AVISO] Electron local nao encontrado. Patch aplicado; inicie do jeito normal do projeto.
  pause
)
goto MENU

:APPLY_ONLY
call :CHECK_NODE
if errorlevel 1 goto MENU
node scripts\apply_v19_3_complete_ui_md_2026.cjs --apply
pause
goto MENU

:DIAG
call :CHECK_NODE
if errorlevel 1 goto MENU
node scripts\diagnostico_v19_3_complete_ui_md_2026.cjs
pause
goto MENU
