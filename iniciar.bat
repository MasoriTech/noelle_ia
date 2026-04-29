@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
title Noelle V19.2 - Settings/About Cleanup

set "ROOT=%~dp0"
cd /d "%ROOT%"

:MENU
cls
echo ============================================================
echo  NOELLE V19.2 - SETTINGS / ABOUT / ROOM BUTTON CLEANUP
echo ============================================================
echo.
echo [1] Aplicar V19.2 e iniciar Noelle
echo [2] Aplicar V19.2 sem iniciar
echo [3] Diagnostico V19.2
echo [4] Rebuild renderers se existir script do projeto
echo [0] Sair
echo.
set /p "OP=Escolha: "

if "%OP%"=="1" goto APPLY_START
if "%OP%"=="2" goto APPLY_ONLY
if "%OP%"=="3" goto DIAG
if "%OP%"=="4" goto REBUILD
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
    echo [AVISO] Electron local nao encontrado e npm nao esta no PATH.
    echo [INFO] Vou aplicar o patch, mas nao vou iniciar o app.
    exit /b 2
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

node scripts\apply_v19_2_settings_about_cleanup_2026.cjs --apply
if errorlevel 1 (
  echo [ERRO] Patch V19.2 falhou com codigo %errorlevel%.
  pause
  goto MENU
)

node scripts\diagnostico_v19_2_settings_about_cleanup_2026.cjs
if errorlevel 1 (
  echo [AVISO] Diagnostico encontrou problemas. Veja acima.
)

call :ENSURE_DEPS
if errorlevel 1 goto MENU

if exist "scripts\bundle-renderers.mjs" (
  echo [INFO] Rebuild renderers via scripts\bundle-renderers.mjs...
  node scripts\bundle-renderers.mjs
  if errorlevel 1 echo [AVISO] bundle-renderers falhou. O patch externo ainda foi aplicado.
)

echo [START] Iniciando Noelle...
call "node_modules\.bin\electron.cmd" .
if errorlevel 1 (
  echo [ERRO] Electron saiu com codigo %errorlevel%.
  pause
)
goto MENU

:APPLY_ONLY
call :CHECK_NODE
if errorlevel 1 goto MENU
node scripts\apply_v19_2_settings_about_cleanup_2026.cjs --apply
if errorlevel 1 (
  echo [ERRO] Patch V19.2 falhou com codigo %errorlevel%.
) else (
  echo [OK] Patch V19.2 aplicado.
)
pause
goto MENU

:DIAG
call :CHECK_NODE
if errorlevel 1 goto MENU
node scripts\diagnostico_v19_2_settings_about_cleanup_2026.cjs
pause
goto MENU

:REBUILD
call :CHECK_NODE
if errorlevel 1 goto MENU
if exist "scripts\bundle-renderers.mjs" (
  node scripts\bundle-renderers.mjs
  if errorlevel 1 (
    echo [ERRO] Rebuild falhou com codigo %errorlevel%.
  ) else (
    echo [OK] Rebuild finalizado.
  )
) else (
  echo [AVISO] scripts\bundle-renderers.mjs nao existe neste projeto.
)
pause
goto MENU
