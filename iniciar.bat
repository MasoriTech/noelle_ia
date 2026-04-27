@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title Noelle IA - V17.7 Items Robustos

set "ROOT=%~dp0"
cd /d "%ROOT%"

:MENU
cls
echo ============================================================
echo  NOELLE IA - V17.7 ITEMS ROBUSTOS
echo ============================================================
echo.
echo [1] Aplicar reforco robusto de items e iniciar Noelle
echo [2] Aplicar reforco robusto sem iniciar
echo [3] Diagnostico robusto de items
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
  pause
  exit /b 1
)
for /f "tokens=* delims=" %%A in ('node -v 2^>nul') do echo [OK] Node %%A
exit /b 0

:APPLY_START
call :CHECK_NODE
if errorlevel 1 goto MENU

echo.
echo [1/4] Aplicando V17.7...
node scripts\harden_item_logic_v17_7.cjs --apply
if errorlevel 1 (
  echo.
  echo [ERRO] Reforco falhou com codigo %errorlevel%.
  pause
  goto MENU
)

echo.
echo [2/4] Rodando diagnostico...
node scripts\diagnostico_items_robustos_v17_7.cjs
if errorlevel 1 (
  echo.
  echo [AVISO] Diagnostico encontrou problemas. Veja acima.
)

echo.
echo [3/4] Verificando Electron local...
if exist "node_modules\.bin\electron.cmd" (
  echo [OK] Electron local encontrado.
) else (
  where npm.cmd >nul 2>nul
  if errorlevel 1 (
    echo [ERRO] Electron local nao encontrado e npm nao esta no PATH.
    pause
    goto MENU
  )
  echo [INFO] Instalando dependencias npm porque Electron local nao foi encontrado...
  call npm install
  if errorlevel 1 (
    echo [ERRO] npm install falhou com codigo %errorlevel%.
    pause
    goto MENU
  )
)

echo.
echo [4/4] Iniciando Noelle...
call "node_modules\.bin\electron.cmd" .
if errorlevel 1 (
  echo [ERRO] Electron saiu com codigo %errorlevel%.
  pause
)
goto MENU

:APPLY_ONLY
call :CHECK_NODE
if errorlevel 1 goto MENU

node scripts\harden_item_logic_v17_7.cjs --apply
if errorlevel 1 (
  echo [ERRO] Reforco falhou com codigo %errorlevel%.
) else (
  echo [OK] Reforco aplicado.
)
pause
goto MENU

:DIAG
call :CHECK_NODE
if errorlevel 1 goto MENU

node scripts\diagnostico_items_robustos_v17_7.cjs
pause
goto MENU

:CLEAN_BATS
set "STAMP=%DATE:/=-%_%TIME::=-%"
set "STAMP=%STAMP: =0%"
set "DEST=backups\bats_v17_7_%STAMP%"
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
