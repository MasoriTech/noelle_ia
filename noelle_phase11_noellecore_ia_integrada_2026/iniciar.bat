@echo off
setlocal EnableExtensions
set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"

set "NOELLE_CORE_IA=1"
set "NOELLE_SAFE_CACHE=1"
set "OLLAMA_MAX_LOADED_MODELS=1"
set "OLLAMA_NUM_PARALLEL=1"
set "OLLAMA_CONTEXT_LENGTH=512"

if not exist "logs" mkdir "logs" >nul 2>nul
set "LOG_FILE=logs\iniciar_noelle.log"

echo ==========================
echo Iniciando Noelle Companion 2026
echo NoelleCore IA + Ollama + STT local
echo ==========================
echo [%date% %time%] Iniciando Noelle > "%LOG_FILE%"

echo.
echo [1/6] Verificando pasta do programa...
if not exist "package.json" (
  echo ERRO: package.json nao encontrado. >> "%LOG_FILE%"
  echo Este .bat precisa ficar na pasta principal da Noelle.
  pause
  exit /b 1
)
if not exist "main.js" (
  echo ERRO: main.js nao encontrado. >> "%LOG_FILE%"
  echo main.js nao encontrado. Copie este patch por cima da pasta principal da Noelle.
  pause
  exit /b 1
)

echo [2/6] Verificando Node/npm...
where node.exe >nul 2>nul
if errorlevel 1 (
  echo ERRO: Node.js nao encontrado. >> "%LOG_FILE%"
  echo Node.js nao encontrado no PATH. Instale o Node.js e abra um novo terminal.
  pause
  exit /b 1
)
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo ERRO: npm nao encontrado. >> "%LOG_FILE%"
  echo npm.cmd nao foi encontrado no PATH.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo [AVISO] node_modules nao existe. Rodando npm install...
  call npm.cmd install >> "%LOG_FILE%" 2>&1
  if errorlevel 1 goto :erro
)

echo [3/6] Verificando Python/STT...
set "PY_CMD="
where py.exe >nul 2>nul && set "PY_CMD=py -3"
if not defined PY_CMD (
  where python.exe >nul 2>nul && set "PY_CMD=python"
)
if not defined PY_CMD (
  echo [AVISO] Python nao encontrado. Chat de texto funciona, mas microfone/STT nao.
  echo [AVISO] Python nao encontrado para STT. >> "%LOG_FILE%"
) else (
  %PY_CMD% -c "import faster_whisper, ctranslate2; print('STT OK')" >nul 2>nul
  if errorlevel 1 (
    echo [AVISO] Dependencias do audio local ainda nao estao prontas.
    echo         Rode: PREPARAR_AUDIO_STT.bat
    echo [AVISO] Dependencias STT ausentes. >> "%LOG_FILE%"
  ) else (
    echo STT local: OK
  )
)

echo [4/6] Verificando Ollama sem travar...
echo [INFO] Checagem do Ollama tem timeout curto. Se falhar, a Noelle abre mesmo assim.

set "OLLAMA_PS=%TEMP%\noelle_ollama_check_%RANDOM%%RANDOM%.ps1"
> "%OLLAMA_PS%" echo $ProgressPreference = 'SilentlyContinue'
>> "%OLLAMA_PS%" echo try {
>> "%OLLAMA_PS%" echo   $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 -Uri 'http://127.0.0.1:11434/api/tags'
>> "%OLLAMA_PS%" echo   $txt = [string]$r.Content
>> "%OLLAMA_PS%" echo   if ($txt -match 'qwen3:0\.6b') { exit 0 } else { exit 2 }
>> "%OLLAMA_PS%" echo } catch {
>> "%OLLAMA_PS%" echo   exit 1
>> "%OLLAMA_PS%" echo }

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%OLLAMA_PS%" >nul 2>nul
set "OLLAMA_CHECK_CODE=%ERRORLEVEL%"
del "%OLLAMA_PS%" >nul 2>nul

if "%OLLAMA_CHECK_CODE%"=="0" (
  echo Ollama: OK ^| qwen3:0.6b encontrado
  echo [OK] Ollama online com qwen3:0.6b. >> "%LOG_FILE%"
) else if "%OLLAMA_CHECK_CODE%"=="2" (
  echo [AVISO] Ollama respondeu, mas qwen3:0.6b nao apareceu na lista.
  echo         Para baixar depois: ollama pull qwen3:0.6b
  echo [AVISO] Ollama online, qwen3:0.6b ausente. >> "%LOG_FILE%"
) else (
  echo [AVISO] Ollama nao respondeu em 2 segundos.
  echo         A Noelle vai abrir mesmo assim. A aba Chat IA avisara se estiver offline.
  echo         Se quiser usar IA local, abra o Ollama antes ou depois.
  echo [AVISO] Ollama offline ou lento no startup. >> "%LOG_FILE%"
)

echo [5/6] Gerando bundles...
call npm.cmd run build-renderers >> "%LOG_FILE%" 2>&1
if errorlevel 1 goto :erro

call npm.cmd run verify-renderer-bundles >> "%LOG_FILE%" 2>&1
if errorlevel 1 goto :erro

echo [6/6] Abrindo Noelle...
if exist "node_modules\.bin\electron.cmd" (
  call "node_modules\.bin\electron.cmd" . >> "%LOG_FILE%" 2>&1
) else (
  call npx.cmd electron . >> "%LOG_FILE%" 2>&1
)
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" (
  echo.
  echo A Noelle foi encerrada com codigo %EXIT_CODE%.
  echo Veja o log: %LOG_FILE%
  pause
  exit /b %EXIT_CODE%
)
exit /b 0

:erro
echo.
echo Falha ao preparar/abrir a Noelle.
echo Veja o log: %LOG_FILE%
pause
exit /b 1
