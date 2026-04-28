@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title Noelle IA - V18.8 Yoru Player Robust

set "ROOT=%~dp0"
cd /d "%ROOT%"

:MENU
cls
echo ============================================================
echo  NOELLE IA - V18.8 YORU PLAYER ROBUST
echo ============================================================
echo.
echo [1] Aplicar Yoru Player robusto e iniciar Noelle
echo [2] Aplicar Yoru Player robusto sem iniciar
echo [3] Diagnostico Yoru Player
echo [4] Rebuild Room bundle
echo [0] Sair
echo.
set /p "OP=Escolha: "

if "%OP%"=="1" goto APPLY_START
if "%OP%"=="2" goto APPLY_ONLY
if "%OP%"=="3" goto DIAG
if "%OP%"=="4" goto BUILD_ROOM
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

:ENSURE_DEPS
if exist "node_modules\.bin\electron.cmd" (
  echo [OK] Electron local encontrado.
) else (
  where npm.cmd >nul 2>nul
  if errorlevel 1 (
    echo [ERRO] Electron local nao encontrado e npm nao esta no PATH.
    pause
    exit /b 1
  )
  echo [INFO] Instalando dependencias npm porque Electron local nao foi encontrado...
  call npm install
  if errorlevel 1 (
    echo [ERRO] npm install falhou com codigo %errorlevel%.
    pause
    exit /b 1
  )
)
exit /b 0

:APPLY_START
call :CHECK_NODE
if errorlevel 1 goto MENU

echo.
echo [1/5] Aplicando V18.8...
node scripts\harden_room_v18_8.cjs --apply
if errorlevel 1 (
  echo.
  echo [ERRO] V18.8 falhou com codigo %errorlevel%.
  pause
  goto MENU
)

echo.
echo [2/5] Verificando dependencias...
call :ENSURE_DEPS
if errorlevel 1 goto MENU

echo.
echo [3/5] Gerando bundle da Room...
node scripts\build_room_v18_8.cjs
if errorlevel 1 (
  echo.
  echo [ERRO] Build da Room falhou com codigo %errorlevel%.
  pause
  goto MENU
)

echo.
echo [4/5] Diagnostico...
node scripts\diagnostico_room_v18_8.cjs
if errorlevel 1 (
  echo.
  echo [AVISO] Diagnostico encontrou problemas. Veja acima.
)

echo.
echo [5/5] Iniciando Noelle...
call "node_modules\.bin\electron.cmd" .
if errorlevel 1 (
  echo [ERRO] Electron saiu com codigo %errorlevel%.
  pause
)
goto MENU

:APPLY_ONLY
call :CHECK_NODE
if errorlevel 1 goto MENU
node scripts\harden_room_v18_8.cjs --apply
if errorlevel 1 (
  echo [ERRO] V18.8 falhou com codigo %errorlevel%.
) else (
  echo [OK] V18.8 aplicada.
)
pause
goto MENU

:DIAG
call :CHECK_NODE
if errorlevel 1 goto MENU
node scripts\diagnostico_room_v18_8.cjs
pause
goto MENU

:BUILD_ROOM
call :CHECK_NODE
if errorlevel 1 goto MENU
call :ENSURE_DEPS
if errorlevel 1 goto MENU
node scripts\build_room_v18_8.cjs
if errorlevel 1 (
  echo [ERRO] Build da Room falhou com codigo %errorlevel%.
) else (
  echo [OK] Bundle da Room gerado.
)
pause
goto MENU
