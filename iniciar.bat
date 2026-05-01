@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

:MENU
cls
echo ================================================================
echo  Noelle/Yoru Companion 2026 - Auto V19.8.26
echo ================================================================
echo.
echo  [1] Iniciar programa agora
echo  [2] Aplicar V19.8.26 automatico
echo  [3] Rodar diagnostico V19.8.26
echo  [4] Git status
echo  [5] Commit sugerido V19.8.26
echo  [0] Sair
echo.
set /p OP=Escolha uma opcao: 

if "%OP%"=="1" goto START_ONLY
if "%OP%"=="2" goto AUTO_26
if "%OP%"=="3" goto DIAG_26
if "%OP%"=="4" goto GIT_STATUS
if "%OP%"=="5" goto COMMIT_26
if "%OP%"=="0" goto END

echo.
echo [ERRO] Opcao invalida.
pause
goto MENU

:CHECK_ROOT
if not exist package.json (
  echo [ERRO] package.json nao encontrado. Rode este .bat na raiz do projeto.
  exit /b 1
)
exit /b 0

:CHECK_NODE
where node.exe >nul 2>nul
if errorlevel 1 (
  echo [ERRO] node.exe nao encontrado no PATH.
  exit /b 1
)
exit /b 0

:CHECK_NPM
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [ERRO] npm.cmd nao encontrado no PATH.
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

:AUTO_26
cls
echo ================================================================
echo  Aplicar V19.8.26 automatico
echo ================================================================
call :CHECK_ROOT
if errorlevel 1 pause & goto MENU
call :CHECK_NODE
if errorlevel 1 pause & goto MENU

if not exist scripts\apply_v19_8_26_auto_2026.cjs (
  echo [ERRO] scripts\apply_v19_8_26_auto_2026.cjs nao encontrado.
  echo [INFO] Copie o pack V19.8.26 Auto para a raiz.
  pause
  goto MENU
)

node scripts\apply_v19_8_26_auto_2026.cjs
pause
goto MENU

:DIAG_26
cls
echo ================================================================
echo  Diagnostico V19.8.26
echo ================================================================
call :CHECK_ROOT
if errorlevel 1 pause & goto MENU
call :CHECK_NODE
if errorlevel 1 pause & goto MENU

if not exist scripts\diagnostico_v19_8_26_main_perf_finish_2026.cjs (
  echo [ERRO] Diagnostico V19.8.26 nao encontrado.
  pause
  goto MENU
)

node scripts\diagnostico_v19_8_26_main_perf_finish_2026.cjs
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

:COMMIT_26
cls
echo ================================================================
echo  Commit sugerido V19.8.26
echo ================================================================
echo [INFO] Esta opcao faz git add/commit, mas NAO faz push automatico.
echo.
set /p CONF=Confirmar commit? Digite SIM: 
if /I not "%CONF%"=="SIM" (
  echo [INFO] Commit cancelado.
  pause
  goto MENU
)

where git.exe >nul 2>nul
if errorlevel 1 (
  echo [ERRO] git.exe nao encontrado no PATH.
  pause
  goto MENU
)

git add .
git commit -m "Finaliza performance do main"
echo.
echo [INFO] Se o commit deu certo, use: git push origin main
pause
goto MENU

:END
endlocal
exit /b 0
