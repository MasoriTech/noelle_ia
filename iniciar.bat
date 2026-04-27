@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul 2>nul
set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"
set "NOELLE_CORE_IA=1"
set "NOELLE_SAFE_CACHE=1"
set "OLLAMA_MAX_LOADED_MODELS=1"
set "OLLAMA_NUM_PARALLEL=1"
set "OLLAMA_CONTEXT_LENGTH=512"
if not exist "logs" mkdir "logs" >nul 2>nul
set "LOG_FILE=logs\iniciar_v14.log"

:menu
cls
echo ============================================================
echo  Noelle Companion 2026 - Mega Pack V14
echo ============================================================
echo [1] Aplicar Mega Pack V14 completo
echo [2] Diagnostico completo
echo [3] Instalar/atualizar dependencias npm
echo [4] Instalar/atualizar dependencias Python/STT
echo [5] Iniciar Noelle
echo [6] Iniciar Ollama e Noelle
echo [7] Limpar outros .bat da raiz
echo [0] Sair
echo.
set /p OP=Escolha: 
if "%OP%"=="1" goto aplicar
if "%OP%"=="2" goto diagnostico
if "%OP%"=="3" goto npm_install
if "%OP%"=="4" goto python_install
if "%OP%"=="5" goto iniciar_noelle
if "%OP%"=="6" goto iniciar_ollama_noelle
if "%OP%"=="7" goto limpar_bats
if "%OP%"=="0" exit /b 0
goto menu

:check_node
where node.exe >nul 2>nul
if errorlevel 1 (
  echo ERRO: Node.js nao encontrado no PATH.
  echo Instale o Node.js, feche e abra o terminal novamente.
  pause
  exit /b 1
)
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo ERRO: npm.cmd nao encontrado no PATH.
  pause
  exit /b 1
)
exit /b 0

:aplicar
call :check_node
if errorlevel 1 goto menu
if not exist "scripts\noelle_apply_v14.cjs" (
  echo ERRO: scripts\noelle_apply_v14.cjs nao encontrado.
  echo Extraia o ZIP inteiro na raiz do projeto Noelle.
  pause
  goto menu
)
node scripts\noelle_apply_v14.cjs
if errorlevel 1 (
  echo.
  echo ERRO ao aplicar Mega Pack V14. Veja a mensagem acima.
  pause
  goto menu
)
echo.
echo Mega Pack aplicado. Agora recomendo rodar a opcao [3] npm install e depois [2] diagnostico.
pause
goto menu

:diagnostico
call :check_node
if errorlevel 1 goto menu
if exist "scripts\noelle_doctor_v14.cjs" (
  node scripts\noelle_doctor_v14.cjs
) else (
  npm run diagnostico
)
echo.
pause
goto menu

:npm_install
call :check_node
if errorlevel 1 goto menu
echo Instalando/atualizando dependencias npm...
call npm.cmd install
if errorlevel 1 (
  echo ERRO no npm install.
  pause
  goto menu
)
echo npm install concluido.
pause
goto menu

:python_install
set "PY_CMD="
where py.exe >nul 2>nul && set "PY_CMD=py -3"
if not defined PY_CMD (
  where python.exe >nul 2>nul && set "PY_CMD=python"
)
if not defined PY_CMD (
  echo ERRO: Python nao encontrado no PATH.
  echo Chat de texto funciona sem Python, mas STT precisa dele.
  pause
  goto menu
)
if not exist "tools\noelle_stt\requirements.txt" (
  echo ERRO: tools\noelle_stt\requirements.txt nao encontrado.
  pause
  goto menu
)
echo Instalando/atualizando dependencias Python/STT...
%PY_CMD% -m pip install --upgrade pip
%PY_CMD% -m pip install -r tools\noelle_stt\requirements.txt
if errorlevel 1 (
  echo ERRO ao instalar dependencias Python.
  pause
  goto menu
)
echo Dependencias Python/STT instaladas.
pause
goto menu

:iniciar_noelle
call :check_node
if errorlevel 1 goto menu
if not exist "node_modules" (
  echo node_modules nao existe. Rodando npm install primeiro...
  call npm.cmd install
  if errorlevel 1 (
    echo ERRO no npm install.
    pause
    goto menu
  )
)
if exist "scripts\build-renderers.mjs" call npm.cmd run build-renderers >> "%LOG_FILE%" 2>&1
if exist "scripts\verify-renderer-bundles.js" call npm.cmd run verify-renderer-bundles >> "%LOG_FILE%" 2>&1
echo Abrindo Noelle...
call npm.cmd start
pause
goto menu

:iniciar_ollama_noelle
where ollama.exe >nul 2>nul
if errorlevel 1 (
  echo AVISO: ollama.exe nao encontrado no PATH. Vou abrir a Noelle mesmo assim.
) else (
  echo Iniciando Ollama em segundo plano...
  start "Ollama" /min ollama serve
  timeout /t 3 /nobreak >nul
)
goto iniciar_noelle

:limpar_bats
set "BACKUP_DIR=backups\bats_legacy_%date:~-4%-%date:~3,2%-%date:~0,2%_%time:~0,2%-%time:~3,2%-%time:~6,2%"
set "BACKUP_DIR=%BACKUP_DIR: =0%"
mkdir "%BACKUP_DIR%" >nul 2>nul
set /a MOVED=0
echo Vou mover outros .bat da raiz para:
echo %BACKUP_DIR%
echo.
for %%F in (*.bat) do (
  if /I not "%%~nxF"=="%~nx0" (
    echo - %%~nxF
  )
)
echo.
set /p CONF=Confirmar limpeza? [S/N]: 
if /I not "%CONF%"=="S" goto menu
for %%F in (*.bat) do (
  if /I not "%%~nxF"=="%~nx0" (
    move "%%~fF" "%BACKUP_DIR%\" >nul
    set /a MOVED+=1
  )
)
echo Movidos: !MOVED! arquivo(s).
pause
goto menu
