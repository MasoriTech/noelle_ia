@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title Noelle IA - Hotfix V17.2 Widget Avatar

set "ROOT=%~dp0"
cd /d "%ROOT%"

:MENU
cls
echo ============================================================
echo  NOELLE IA - HOTFIX V17.2 WIDGET / AVATAR / EMOTES
echo ============================================================
echo.
echo [1] Aplicar correcao e iniciar Noelle
echo [2] Aplicar correcao sem iniciar
echo [3] Diagnostico widget/avatar/assets
echo [4] Limpar outros .bat da raiz para backup
echo [0] Sair
echo.
set /p "OP=Escolha: "

if "%OP%"=="1" goto APPLY_START
if "%OP%"=="2" goto APPLY_ONLY
if "%OP%"=="3" goto DIAG
if "%OP%"=="4" goto CLEAN_BATS
if "%OP%"=="0" exit /b 0
goto MENU

:CHECK_NODE
where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node nao encontrado no PATH.
  echo Instale Node.js ou abra o terminal correto.
  pause
  exit /b 1
)
for /f "tokens=* delims=" %%A in ('node -v 2^>nul') do echo [OK] Node %%A
exit /b 0

:APPLY_START
call :CHECK_NODE
if errorlevel 1 goto MENU

echo.
echo [1/3] Aplicando hotfix V17.2...
node scripts\hotfix_v17_2_widget_ipc_assets.cjs --apply
if errorlevel 1 (
  echo.
  echo [ERRO] Hotfix falhou com codigo %errorlevel%.
  pause
  goto MENU
)

echo.
echo [2/3] Rodando diagnostico...
node scripts\diagnostico_v17_2_widget_avatar.cjs
if errorlevel 1 (
  echo.
  echo [AVISO] Diagnostico encontrou problemas. Veja acima.
  echo A Noelle ainda pode abrir, mas o avatar pode precisar de ajuste.
)

echo.
echo [3/3] Iniciando Noelle...
if exist "node_modules\.bin\electron.cmd" (
  echo [OK] Electron local encontrado.
  call "node_modules\.bin\electron.cmd" .
  if errorlevel 1 (
    echo [ERRO] Electron saiu com codigo %errorlevel%.
    pause
  )
  goto MENU
)

where npm.cmd >nul 2>nul
if not errorlevel 1 (
  echo [INFO] Electron local nao encontrado. Tentando npm install...
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
)

echo [ERRO] Nao encontrei node_modules\.bin\electron.cmd nem npm.
echo Se o node_modules ja existe, confira se electron foi instalado.
pause
goto MENU

:APPLY_ONLY
call :CHECK_NODE
if errorlevel 1 goto MENU

node scripts\hotfix_v17_2_widget_ipc_assets.cjs --apply
if errorlevel 1 (
  echo [ERRO] Hotfix falhou com codigo %errorlevel%.
) else (
  echo [OK] Hotfix aplicado.
)
pause
goto MENU

:DIAG
call :CHECK_NODE
if errorlevel 1 goto MENU

node scripts\diagnostico_v17_2_widget_avatar.cjs
if errorlevel 1 (
  echo.
  echo [AVISO] Diagnostico encontrou problemas.
) else (
  echo.
  echo [OK] Diagnostico finalizado sem erro critico.
)
pause
goto MENU

:CLEAN_BATS
set "STAMP=%DATE:/=-%_%TIME::=-%"
set "STAMP=%STAMP: =0%"
set "DEST=backups\bats_v17_2_%STAMP%"
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
