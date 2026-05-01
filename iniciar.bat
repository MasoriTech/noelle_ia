@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

:MENU
cls
echo ================================================================
echo  Noelle/Yoru Companion 2026 - Diag Regex Fix V19.8.27d
echo ================================================================
echo.
echo  [1] Iniciar programa agora
echo  [2] Aplicar V19.8.27d Diag Regex Fix
echo  [3] Rodar diagnostico V19.8.27d
echo  [4] Git status
echo  [0] Sair
echo.
set /p OP=Escolha uma opcao: 

if "%OP%"=="1" goto START_ONLY
if "%OP%"=="2" goto AUTO_27D
if "%OP%"=="3" goto DIAG_27D
if "%OP%"=="4" goto GIT_STATUS
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
call :CHECK_ROOT
if errorlevel 1 pause & goto MENU
call :CHECK_NPM
if errorlevel 1 pause & goto MENU
call npm.cmd start
echo.
echo [INFO] Programa encerrado com codigo %ERRORLEVEL%.
pause
goto MENU

:AUTO_27D
cls
call :CHECK_ROOT
if errorlevel 1 pause & goto MENU
call :CHECK_NODE
if errorlevel 1 pause & goto MENU

if exist scripts\apply_v19_8_27d_auto_2026.cjs (
  node scripts\apply_v19_8_27d_auto_2026.cjs
) else (
  node scripts\repair_v19_8_27d_diag_regex_fix_2026.cjs
  node scripts\diagnostico_v19_8_27d_diag_regex_fix_2026.cjs
)
pause
goto MENU

:DIAG_27D
cls
call :CHECK_ROOT
if errorlevel 1 pause & goto MENU
call :CHECK_NODE
if errorlevel 1 pause & goto MENU

node scripts\diagnostico_v19_8_27d_diag_regex_fix_2026.cjs
pause
goto MENU

:GIT_STATUS
cls
where git.exe >nul 2>nul
if errorlevel 1 (
  echo [ERRO] git.exe nao encontrado no PATH.
  pause
  goto MENU
)
git status -sb
pause
goto MENU

:END
endlocal
exit /b 0
