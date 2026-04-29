@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title Noelle V19.5 - Avatar Real VRM Sync Anim

set "ROOT=%~dp0"
cd /d "%ROOT%"

:MENU
cls
echo ============================================================
echo  NOELLE V19.5 - AVATAR REAL VRM / SYNC / ANIM
echo ============================================================
echo.
echo [1] Aplicar V19.5 Avatar completo e iniciar Noelle
echo [2] Aplicar V19.5 Avatar completo sem iniciar
echo [3] Build Avatar V19.5
echo [4] Diagnostico V19.5
echo [0] Sair
echo.
set /p "OP=Escolha: "

if "%OP%"=="1" goto APPLY_START
if "%OP%"=="2" goto APPLY_ONLY
if "%OP%"=="3" goto BUILD
if "%OP%"=="4" goto DIAG
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

:ENSURE_NPM
if exist "node_modules\@pixiv\three-vrm" if exist "node_modules\@pixiv\three-vrm-animation" if exist "node_modules\three" (
  echo [OK] Dependencias VRM locais encontradas.
  exit /b 0
)
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [ERRO] npm nao encontrado. Aplique o patch, depois rode npm install manualmente.
  exit /b 1
)
echo [INFO] Instalando dependencias npm para VRM/VRMA...
call npm install
if errorlevel 1 (
  echo [ERRO] npm install falhou.
  exit /b 1
)
exit /b 0

:APPLY_START
call :CHECK_NODE
if errorlevel 1 goto MENU
node scripts\apply_v19_5_avatar_real_vrm_sync_anim_2026.cjs --apply
if errorlevel 1 (
  echo [ERRO] Patch falhou.
  pause
  goto MENU
)
call :ENSURE_NPM
if errorlevel 1 (
  echo [AVISO] Dependencias nao prontas. Patch aplicado, mas preview precisa de npm install/build.
  pause
  goto MENU
)
node scripts\build_avatar_v19_5_2026.cjs
if errorlevel 1 (
  echo [ERRO] Build falhou.
  pause
  goto MENU
)
node scripts\diagnostico_v19_5_avatar_real_vrm_sync_anim_2026.cjs
if exist "node_modules\.bin\electron.cmd" (
  echo [START] Iniciando Noelle...
  call "node_modules\.bin\electron.cmd" .
) else (
  echo [AVISO] Electron local nao encontrado. Inicie pelo fluxo normal do projeto.
  pause
)
goto MENU

:APPLY_ONLY
call :CHECK_NODE
if errorlevel 1 goto MENU
node scripts\apply_v19_5_avatar_real_vrm_sync_anim_2026.cjs --apply
pause
goto MENU

:BUILD
call :CHECK_NODE
if errorlevel 1 goto MENU
call :ENSURE_NPM
if errorlevel 1 goto MENU
node scripts\build_avatar_v19_5_2026.cjs
pause
goto MENU

:DIAG
call :CHECK_NODE
if errorlevel 1 goto MENU
node scripts\diagnostico_v19_5_avatar_real_vrm_sync_anim_2026.cjs
pause
goto MENU
