@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

:MENU
cls
echo ================================================================
echo  Noelle/Yoru Companion 2026 - iniciar.bat seguro V19.8.21a
echo ================================================================
echo.
echo  [1] Iniciar programa agora
echo  [2] Rodar diagnostico V19.8.21 Avatar
echo  [3] Aplicar botao Adicionar avatar
echo  [4] Rodar npm install
echo  [0] Sair
echo.
set /p OP=Escolha uma opcao: 

if "%OP%"=="1" goto START_ONLY
if "%OP%"=="2" goto DIAG
if "%OP%"=="3" goto REPAIR
if "%OP%"=="4" goto NPM_INSTALL
if "%OP%"=="0" goto END

echo.
echo [ERRO] Opcao invalida.
pause
goto MENU

:START_ONLY
cls
echo ================================================================
echo  Iniciando programa agora
echo ================================================================
echo [INFO] Esta opcao nao aplica patch.
echo.
if not exist package.json (
  echo [ERRO] package.json nao encontrado. Rode este .bat na raiz do projeto.
  pause
  goto MENU
)
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [ERRO] npm.cmd nao encontrado no PATH. Instale Node.js ou abra o terminal correto.
  pause
  goto MENU
)
call npm.cmd start
echo.
echo [INFO] Programa encerrado com codigo %ERRORLEVEL%.
pause
goto MENU

:DIAG
cls
echo ================================================================
echo  Diagnostico V19.8.21 Avatar
echo ================================================================
if not exist scripts\diagnostico_v19_8_21_adicionar_avatar_botao_2026.cjs (
  echo [ERRO] Script de diagnostico nao encontrado.
  echo [INFO] Copie o pack V19.8.21 inteiro para a raiz do projeto.
  pause
  goto MENU
)
node scripts\diagnostico_v19_8_21_adicionar_avatar_botao_2026.cjs
pause
goto MENU

:REPAIR
cls
echo ================================================================
echo  Aplicar botao Adicionar avatar
echo ================================================================
if not exist scripts\repair_v19_8_21_adicionar_avatar_botao_2026.cjs (
  echo [ERRO] Script de reparo nao encontrado.
  echo [INFO] Copie o pack V19.8.21 inteiro para a raiz do projeto.
  pause
  goto MENU
)
node scripts\repair_v19_8_21_adicionar_avatar_botao_2026.cjs
if errorlevel 1 (
  echo.
  echo [ERRO] Reparo falhou.
  pause
  goto MENU
)
echo.
echo [INFO] Rodando diagnostico apos reparo...
node scripts\diagnostico_v19_8_21_adicionar_avatar_botao_2026.cjs
echo.
echo [INFO] Feche e abra o app pela opcao [1].
pause
goto MENU

:NPM_INSTALL
cls
echo ================================================================
echo  Rodando npm install
echo ================================================================
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [ERRO] npm.cmd nao encontrado no PATH.
  pause
  goto MENU
)
call npm.cmd install
echo.
echo [INFO] npm install terminou com codigo %ERRORLEVEL%.
pause
goto MENU

:END
endlocal
exit /b 0
