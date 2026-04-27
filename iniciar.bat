@echo off
setlocal EnableExtensions
set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"

:menu
cls
echo ============================================================
echo  Noelle IA - INICIAR unico V13
echo ============================================================
echo [1] Aplicar UI V12 segura + atualizar requirements.txt
echo [2] Aplicar somente requirements.txt Python
echo [3] Instalar/atualizar dependencias Python do STT
echo [4] Diagnostico UI + requirements
echo [5] Iniciar Noelle
echo [6] Iniciar Ollama e Noelle
echo [7] Limpar outros .bat da raiz
echo [0] Sair
echo.
set /p OP=Escolha: 

if "%OP%"=="1" goto aplicar_tudo
if "%OP%"=="2" goto aplicar_requirements
if "%OP%"=="3" goto instalar_python
if "%OP%"=="4" goto diagnostico
if "%OP%"=="5" goto iniciar_noelle
if "%OP%"=="6" goto ollama_noelle
if "%OP%"=="7" goto limpar_bats
if "%OP%"=="0" exit /b 0
goto menu

:node_check
where node.exe >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado no PATH.
  echo Instale Node.js, abra um terminal novo e tente de novo.
  pause
  exit /b 1
)
exit /b 0

:aplicar_tudo
call :node_check || exit /b 1
node scripts\aplicar_ui_v12_segura.cjs
if errorlevel 1 goto erro
node scripts\aplicar_requirements_v13.cjs
if errorlevel 1 goto erro
echo.
echo [ok] UI segura e requirements aplicados.
pause
goto menu

:aplicar_requirements
call :node_check || exit /b 1
node scripts\aplicar_requirements_v13.cjs
if errorlevel 1 goto erro
echo.
echo [ok] requirements.txt atualizado.
pause
goto menu

:instalar_python
set "PY_CMD="
where py.exe >nul 2>nul && set "PY_CMD=py -3"
if not defined PY_CMD (
  where python.exe >nul 2>nul && set "PY_CMD=python"
)
if not defined PY_CMD (
  echo Python nao encontrado. Instale Python 3.10+ e marque Add to PATH.
  pause
  goto menu
)
if not exist "requirements.txt" (
  echo requirements.txt nao encontrado. Rode a opcao [2] primeiro.
  pause
  goto menu
)
echo Atualizando pip...
%PY_CMD% -m pip install --upgrade pip
if errorlevel 1 goto erro
echo Instalando/atualizando dependencias Python do STT...
%PY_CMD% -m pip install --upgrade -r requirements.txt
if errorlevel 1 goto erro
echo.
echo [ok] Dependencias Python instaladas/atualizadas.
pause
goto menu

:diagnostico
call :node_check || exit /b 1
node scripts\diagnostico_ui_v12.cjs
node scripts\diagnostico_requirements_v13.cjs
echo.
pause
goto menu

:iniciar_noelle
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo npm.cmd nao encontrado. Instale Node.js e rode npm install.
  pause
  goto menu
)
call npm.cmd start
pause
goto menu

:ollama_noelle
where ollama.exe >nul 2>nul
if errorlevel 1 (
  echo Ollama nao encontrado no PATH. Abra/instale o Ollama antes.
  pause
  goto menu
)
start "Ollama" /min cmd /c "ollama serve"
timeout /t 3 /nobreak >nul
goto iniciar_noelle

:limpar_bats
call :node_check || exit /b 1
node scripts\limpar_bats_raiz.cjs
pause
goto menu

:erro
echo.
echo [erro] Operacao falhou. Veja a mensagem acima.
pause
goto menu
