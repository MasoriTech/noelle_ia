@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

:MENU
cls
echo ================================================================
echo  Noelle/Yoru Companion 2026 - V19.8.31 Stream VAD
echo ================================================================
echo.
echo  [1] Iniciar programa agora
echo  [2] Aplicar V19.8.31 Stream VAD Simple
echo  [3] Rodar diagnostico V19.8.31
echo  [4] Git salvar e enviar tudo
echo  [0] Sair
echo.
set /p OP=Escolha uma opcao: 

if "%OP%"=="1" goto START_ONLY
if "%OP%"=="2" goto AUTO_31
if "%OP%"=="3" goto DIAG_31
if "%OP%"=="4" goto GIT_ALL
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

:CHECK_GIT
where git.exe >nul 2>nul
if errorlevel 1 (
  echo [ERRO] git.exe nao encontrado no PATH.
  exit /b 1
)
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Esta pasta nao parece ser um repositorio git.
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

:AUTO_31
cls
call :CHECK_ROOT
if errorlevel 1 pause & goto MENU
call :CHECK_NODE
if errorlevel 1 pause & goto MENU
node scripts\apply_v19_8_31_auto_2026.cjs
pause
goto MENU

:DIAG_31
cls
call :CHECK_ROOT
if errorlevel 1 pause & goto MENU
call :CHECK_NODE
if errorlevel 1 pause & goto MENU
node scripts\diagnostico_v19_8_31_stream_vad_simple_2026.cjs
pause
goto MENU

:GIT_ALL
cls
call :CHECK_ROOT
if errorlevel 1 pause & goto MENU
call :CHECK_GIT
if errorlevel 1 pause & goto MENU

set MSG=V19.8.31 adiciona VAD simples na Stream
echo Mensagem padrao:
echo %MSG%
echo.
set /p CUSTOM=Digite outra mensagem ou ENTER para usar a padrao: 
if not "%CUSTOM%"=="" set MSG=%CUSTOM%

echo.
echo Vai rodar git add, commit e push.
set /p CONF=Digite SIM para continuar: 
if /I not "%CONF%"=="SIM" (
  echo [INFO] Cancelado.
  pause
  goto MENU
)

git add .
if errorlevel 1 (
  echo [ERRO] git add falhou.
  pause
  goto MENU
)

git diff --cached --quiet
if not errorlevel 1 (
  echo [AVISO] Sem mudancas para commit. Tentando push.
  git push origin main
  pause
  goto MENU
)

git commit -m "%MSG%"
if errorlevel 1 (
  echo [ERRO] git commit falhou.
  pause
  goto MENU
)

git push origin main
if errorlevel 1 (
  echo [ERRO] git push falhou.
  pause
  goto MENU
)

echo [OK] Git concluido.
git status -sb
pause
goto MENU

:END
endlocal
exit /b 0
