@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title Noelle IA - V18.6 Room Walk Robust

set "ROOT=%~dp0"
cd /d "%ROOT%"

:MENU
cls
echo ============================================================
echo  NOELLE IA - V18.6 ROOM WALK ROBUST
echo ============================================================
echo.
echo [1] Aplicar Room V18.6 e iniciar Noelle
echo [2] Aplicar Room V18.6 sem iniciar
echo [3] Diagnostico Room V18.6
echo [4] Rebuild Room bundle
echo [5] Limpar outros .bat da raiz para backup
echo [0] Sair
echo.
set /p "OP=Escolha: "

if "%OP%"=="1" goto APPLY_START
if "%OP%"=="2" goto APPLY_ONLY
if "%OP%"=="3" goto DIAG
if "%OP%"=="4" goto BUILD_ROOM
if "%OP%"=="5" goto CLEAN_BATS
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
echo [1/5] Aplicando Room V18.6...
node scripts\harden_room_v18_6.cjs --apply
if errorlevel 1 (
  echo.
  echo [ERRO] Room V18.6 falhou com codigo %errorlevel%.
  pause
  goto MENU
)

echo.
echo [2/5] Verificando dependencias...
call :ENSURE_DEPS
if errorlevel 1 goto MENU

echo.
echo [3/5] Gerando bundle da Room...
node scripts\build_room_v18_6.cjs
if errorlevel 1 (
  echo.
  echo [ERRO] Build da Room falhou com codigo %errorlevel%.
  pause
  goto MENU
)

echo.
echo [4/5] Diagnostico...
node scripts\diagnostico_room_v18_6.cjs
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
node scripts\harden_room_v18_6.cjs --apply
if errorlevel 1 (
  echo [ERRO] Room V18.6 falhou com codigo %errorlevel%.
) else (
  echo [OK] Room V18.6 aplicada.
)
pause
goto MENU

:DIAG
call :CHECK_NODE
if errorlevel 1 goto MENU
node scripts\diagnostico_room_v18_6.cjs
pause
goto MENU

:BUILD_ROOM
call :CHECK_NODE
if errorlevel 1 goto MENU
call :ENSURE_DEPS
if errorlevel 1 goto MENU
node scripts\build_room_v18_6.cjs
if errorlevel 1 (
  echo [ERRO] Build da Room falhou com codigo %errorlevel%.
) else (
  echo [OK] Bundle da Room gerado.
)
pause
goto MENU

:CLEAN_BATS
set "STAMP=%DATE:/=-%_%TIME::=-%"
set "STAMP=%STAMP: =0%"
set "DEST=backups\bats_v18_6_room_%STAMP%"
if not exist "backups" mkdir "backups" >nul 2>nul
if not exist "%DEST%" mkdir "%DEST%" >nul 2>nul

set "FOUND=0"
for %%F in (*.bat) do (
  if /I not "%%~nxF"=="INICIAR.bat" (
    set "FOUND=1"
    echo [INFO] Movendo %%~nxF para %DEST%
    move /Y "%%~fF" "%DEST%\" >nul
  )
)
if "%FOUND%"=="0" echo [OK] Nenhum outro .bat na raiz.
pause
goto MENU
