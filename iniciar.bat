@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

:MENU
cls
echo ================================================================
echo  Noelle/Yoru Companion 2026 - iniciar.bat atualizado V19.8.25
echo ================================================================
echo.
echo  [1] Iniciar programa agora
echo  [2] Rodar diagnostico geral
echo  [3] Diagnostico main
echo  [4] Diagnostico preload
echo  [5] Diagnostico avatar
echo  [6] Aplicar limpeza de BATs legados V19.8.25
echo  [7] Rodar npm install
echo  [8] Git status
echo  [0] Sair
echo.
set /p OP=Escolha uma opcao: 

if "%OP%"=="1" goto START_ONLY
if "%OP%"=="2" goto DIAG_GERAL
if "%OP%"=="3" goto DIAG_MAIN
if "%OP%"=="4" goto DIAG_PRELOAD
if "%OP%"=="5" goto DIAG_AVATAR
if "%OP%"=="6" goto CLEAN_BATS
if "%OP%"=="7" goto NPM_INSTALL
if "%OP%"=="8" goto GIT_STATUS
if "%OP%"=="0" goto END

echo.
echo [ERRO] Opcao invalida.
pause
goto MENU

:CHECK_ROOT
if not exist package.json (
  echo [ERRO] package.json nao encontrado.
  echo [INFO] Rode este iniciar.bat na raiz do projeto noelle_ia.
  exit /b 1
)
exit /b 0

:CHECK_NODE
where node.exe >nul 2>nul
if errorlevel 1 (
  echo [ERRO] node.exe nao encontrado no PATH.
  echo [INFO] Instale Node.js ou abra o terminal correto.
  exit /b 1
)
exit /b 0

:CHECK_NPM
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [ERRO] npm.cmd nao encontrado no PATH.
  echo [INFO] Instale Node.js ou abra o terminal correto.
  exit /b 1
)
exit /b 0

:START_ONLY
cls
echo ================================================================
echo  Iniciando programa agora
echo ================================================================
echo [INFO] Esta opcao nao aplica patch.
echo.
call :CHECK_ROOT
if errorlevel 1 pause & goto MENU
call :CHECK_NPM
if errorlevel 1 pause & goto MENU
call npm.cmd start
echo.
echo [INFO] Programa encerrado com codigo %ERRORLEVEL%.
pause
goto MENU

:DIAG_GERAL
cls
echo ================================================================
echo  Diagnostico geral
echo ================================================================
call :CHECK_ROOT
if errorlevel 1 pause & goto MENU
call :CHECK_NODE
if errorlevel 1 pause & goto MENU

if exist scripts\diagnostico_v19_8_25_root_bat_cleanup_2026.cjs (
  node scripts\diagnostico_v19_8_25_root_bat_cleanup_2026.cjs
  pause
  goto MENU
)

if exist scripts\diagnostico_v19_8_24_clean_maintenance_2026.cjs (
  node scripts\diagnostico_v19_8_24_clean_maintenance_2026.cjs
  pause
  goto MENU
)

if exist package.json (
  call :CHECK_NPM
  if errorlevel 1 pause & goto MENU
  call npm.cmd run diagnostico
  pause
  goto MENU
)

echo [ERRO] Nenhum diagnostico conhecido encontrado.
pause
goto MENU

:DIAG_MAIN
cls
echo ================================================================
echo  Diagnostico main
echo ================================================================
call :CHECK_ROOT
if errorlevel 1 pause & goto MENU
call :CHECK_NODE
if errorlevel 1 pause & goto MENU

if exist scripts\diagnostico_v19_8_24_main_2026.cjs (
  node scripts\diagnostico_v19_8_24_main_2026.cjs
) else (
  echo [AVISO] scripts\diagnostico_v19_8_24_main_2026.cjs nao encontrado.
  if exist main.js (
    node --check main.js
  ) else (
    echo [ERRO] main.js nao encontrado.
  )
)
pause
goto MENU

:DIAG_PRELOAD
cls
echo ================================================================
echo  Diagnostico preload
echo ================================================================
call :CHECK_ROOT
if errorlevel 1 pause & goto MENU
call :CHECK_NODE
if errorlevel 1 pause & goto MENU

if exist scripts\diagnostico_v19_8_24_preload_2026.cjs (
  node scripts\diagnostico_v19_8_24_preload_2026.cjs
) else (
  echo [AVISO] scripts\diagnostico_v19_8_24_preload_2026.cjs nao encontrado.
  if exist preload.js (
    node --check preload.js
  ) else (
    echo [ERRO] preload.js nao encontrado.
  )
)
pause
goto MENU

:DIAG_AVATAR
cls
echo ================================================================
echo  Diagnostico avatar
echo ================================================================
call :CHECK_ROOT
if errorlevel 1 pause & goto MENU
call :CHECK_NODE
if errorlevel 1 pause & goto MENU

if exist scripts\diagnostico_v19_8_24_avatar_2026.cjs (
  node scripts\diagnostico_v19_8_24_avatar_2026.cjs
) else (
  echo [AVISO] scripts\diagnostico_v19_8_24_avatar_2026.cjs nao encontrado.
  if exist src\assets\avatar_manifest.json (
    echo [OK] src\assets\avatar_manifest.json existe
  ) else (
    echo [AVISO] src\assets\avatar_manifest.json nao encontrado
  )
)
pause
goto MENU

:CLEAN_BATS
cls
echo ================================================================
echo  Aplicar limpeza de BATs legados V19.8.25
echo ================================================================
echo [INFO] Mantem iniciar.bat na raiz e move BATs antigos para legacy_bats.
echo.
call :CHECK_ROOT
if errorlevel 1 pause & goto MENU
call :CHECK_NODE
if errorlevel 1 pause & goto MENU

if not exist scripts\repair_v19_8_25_root_bat_cleanup_2026.cjs (
  echo [ERRO] Script de limpeza V19.8.25 nao encontrado.
  echo [INFO] Copie o pack V19.8.25 para a raiz antes de usar esta opcao.
  pause
  goto MENU
)

node scripts\repair_v19_8_25_root_bat_cleanup_2026.cjs
if errorlevel 1 (
  echo.
  echo [ERRO] Limpeza falhou.
  pause
  goto MENU
)

echo.
echo [INFO] Rodando diagnostico apos limpeza...
if exist scripts\diagnostico_v19_8_25_root_bat_cleanup_2026.cjs (
  node scripts\diagnostico_v19_8_25_root_bat_cleanup_2026.cjs
) else (
  echo [AVISO] Diagnostico V19.8.25 nao encontrado.
)

pause
goto MENU

:NPM_INSTALL
cls
echo ================================================================
echo  Rodando npm install
echo ================================================================
call :CHECK_ROOT
if errorlevel 1 pause & goto MENU
call :CHECK_NPM
if errorlevel 1 pause & goto MENU

call npm.cmd install
echo.
echo [INFO] npm install terminou com codigo %ERRORLEVEL%.
pause
goto MENU

:GIT_STATUS
cls
echo ================================================================
echo  Git status
echo ================================================================
where git.exe >nul 2>nul
if errorlevel 1 (
  echo [ERRO] git.exe nao encontrado no PATH.
  pause
  goto MENU
)

git status -sb
echo.
git branch --show-current
echo.
git remote -v
pause
goto MENU

:END
endlocal
exit /b 0
