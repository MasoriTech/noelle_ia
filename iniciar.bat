@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title Noelle IA - V17.4.1 Repara main.js

set "ROOT=%~dp0"
cd /d "%ROOT%"

:MENU
cls
echo ============================================================
echo  NOELLE IA - V17.4.1 REPARA MAIN.JS
echo ============================================================
echo.
echo [1] Reparar main.js e iniciar Noelle
echo [2] Reparar main.js sem iniciar
echo [3] Diagnostico node --check
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

echo.
echo [1/3] Reparando main.js...
node scripts\repair_main_syntax_v17_4_1.cjs --apply
if errorlevel 1 (
  echo.
  echo [ERRO] Reparo falhou com codigo %errorlevel%.
  pause
  goto MENU
)

echo.
echo [2/3] Diagnostico...
node scripts\diagnostico_v17_4_1_main.cjs
if errorlevel 1 (
  echo.
  echo [ERRO] Diagnostico ainda encontrou problema.
  pause
  goto MENU
)

echo.
echo [3/3] Iniciando Noelle...
if exist "node_modules\.bin\electron.cmd" (
  call "node_modules\.bin\electron.cmd" .
  if errorlevel 1 (
    echo [ERRO] Electron saiu com codigo %errorlevel%.
    pause
  )
  goto MENU
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Electron local nao encontrado e npm nao esta no PATH.
  pause
  goto MENU
)

call npm install
if errorlevel 1 (
  echo [ERRO] npm install falhou com codigo %errorlevel%.
  pause
  goto MENU
)

call npm start
if errorlevel 1 (
  echo [ERRO] npm start falhou com codigo %errorlevel%.
  pause
)
goto MENU

:APPLY_ONLY
call :CHECK_NODE
if errorlevel 1 goto MENU

node scripts\repair_main_syntax_v17_4_1.cjs --apply
if errorlevel 1 (
  echo [ERRO] Reparo falhou com codigo %errorlevel%.
) else (
  echo [OK] Reparo aplicado.
)
pause
goto MENU

:DIAG
call :CHECK_NODE
if errorlevel 1 goto MENU

node scripts\diagnostico_v17_4_1_main.cjs
pause
goto MENU
