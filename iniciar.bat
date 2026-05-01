@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

:MENU
cls
echo ================================================================
echo  Noelle/Yoru Companion 2026 - iniciar.bat V19.8.27d
echo ================================================================
echo.
echo  [1] Iniciar programa agora
echo  [2] Rodar diagnostico V19.8.27d
echo  [3] Git salvar e enviar tudo
echo  [0] Sair
echo.
set /p OP=Escolha uma opcao: 

if "%OP%"=="1" goto START_ONLY
if "%OP%"=="2" goto DIAG_27D
if "%OP%"=="3" goto GIT_ALL
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

:CHECK_GIT
where git.exe >nul 2>nul
if errorlevel 1 (
  echo [ERRO] git.exe nao encontrado no PATH.
  echo [INFO] Instale Git ou abra o terminal correto.
  exit /b 1
)
git rev-parse --is-inside-work-tree >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Esta pasta nao parece ser um repositorio git.
  echo [INFO] Confirme que voce esta na raiz do noelle_ia correto.
  exit /b 1
)
exit /b 0

:START_ONLY
cls
echo ================================================================
echo  Iniciando programa agora
echo ================================================================
echo [INFO] Esta opcao nao aplica patch nem git.
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

:DIAG_27D
cls
echo ================================================================
echo  Diagnostico V19.8.27d
echo ================================================================
call :CHECK_ROOT
if errorlevel 1 pause & goto MENU
call :CHECK_NODE
if errorlevel 1 pause & goto MENU

if exist scripts\diagnostico_v19_8_27d_diag_regex_fix_2026.cjs (
  node scripts\diagnostico_v19_8_27d_diag_regex_fix_2026.cjs
  pause
  goto MENU
)

if exist scripts\diagnostico_v19_8_27c_update_asset_summary_hardfix_2026.cjs (
  echo [AVISO] Diagnostico V19.8.27d nao encontrado. Rodando V19.8.27c.
  node scripts\diagnostico_v19_8_27c_update_asset_summary_hardfix_2026.cjs
  pause
  goto MENU
)

if exist scripts\diagnostico_v19_8_27_controls_core_split_2026.cjs (
  echo [AVISO] Diagnostico V19.8.27d nao encontrado. Rodando V19.8.27.
  node scripts\diagnostico_v19_8_27_controls_core_split_2026.cjs
  pause
  goto MENU
)

echo [ERRO] Nenhum diagnostico V19.8.27 encontrado.
pause
goto MENU

:GIT_ALL
cls
echo ================================================================
echo  Git salvar e enviar tudo
echo ================================================================
echo [INFO] Esta opcao faz tudo:
echo        git status
echo        git add .
echo        git commit
echo        git push origin main
echo.
call :CHECK_ROOT
if errorlevel 1 pause & goto MENU
call :CHECK_GIT
if errorlevel 1 pause & goto MENU

echo ================================================================
echo  Estado atual
echo ================================================================
git status -sb
echo.
echo Branch atual:
git branch --show-current
echo.
echo Remotes:
git remote -v
echo.

set MSG=V19.8.27d estabiliza core do renderer controls
echo Mensagem padrao do commit:
echo %MSG%
echo.
set /p CUSTOM=Digite outra mensagem ou pressione ENTER para usar a padrao: 
if not "%CUSTOM%"=="" set MSG=%CUSTOM%

echo.
echo [CONFIRMACAO]
echo Vai rodar:
echo   git add .
echo   git commit -m "%MSG%"
echo   git push origin main
echo.
set /p CONF=Digite SIM para continuar: 
if /I not "%CONF%"=="SIM" (
  echo [INFO] Operacao cancelada.
  pause
  goto MENU
)

echo.
echo ================================================================
echo  [1/4] git add .
echo ================================================================
git add .
if errorlevel 1 (
  echo [ERRO] git add falhou.
  pause
  goto MENU
)

echo.
echo ================================================================
echo  [2/4] Verificando se ha mudancas para commit
echo ================================================================
git diff --cached --quiet
if not errorlevel 1 (
  echo [AVISO] Nao ha mudancas para commit.
  echo [INFO] Vou tentar push mesmo assim.
  goto ONLY_PUSH
)

echo.
echo ================================================================
echo  [3/4] git commit
echo ================================================================
git commit -m "%MSG%"
if errorlevel 1 (
  echo [ERRO] git commit falhou.
  pause
  goto MENU
)

:ONLY_PUSH
echo.
echo ================================================================
echo  [4/4] git push origin main
echo ================================================================
git push origin main
if errorlevel 1 (
  echo [ERRO] git push falhou.
  echo [INFO] Confira branch, remote, login do GitHub ou conflitos.
  pause
  goto MENU
)

echo.
echo ================================================================
echo  Git concluido
echo ================================================================
git status -sb
echo.
echo [OK] Tudo salvo e enviado para o GitHub.
pause
goto MENU

:END
endlocal
exit /b 0
