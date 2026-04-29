@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

title Yoru 2026 - iniciar com Memory Core

echo ================================================================
echo  Yoru 2026 - iniciar.bat atualizado
echo ================================================================
echo.

set "ROOT=%~dp0"
cd /d "%ROOT%"

REM ----------------------------------------------------------------
REM 1) Python robusto
REM ----------------------------------------------------------------
set "PYTHON_CMD="
if exist ".venv\Scripts\python.exe" set "PYTHON_CMD=.venv\Scripts\python.exe"
if not defined PYTHON_CMD (
  where py >nul 2>nul && set "PYTHON_CMD=py -3"
)
if not defined PYTHON_CMD (
  where python >nul 2>nul && set "PYTHON_CMD=python"
)

if not defined PYTHON_CMD (
  echo [ERRO] Python nao encontrado.
  echo Instale Python 3.10+ ou crie uma .venv antes de iniciar a Yoru.
  pause
  exit /b 1
)

echo [OK] Python: %PYTHON_CMD%

REM ----------------------------------------------------------------
REM 2) Aplica/verifica memoria da Yoru sem sobrescrever seus arquivos
REM ----------------------------------------------------------------
if exist "scripts\yoru_memory_core_setup_2026.py" (
  echo.
  echo [INFO] Verificando estrutura de memoria da Yoru...
  %PYTHON_CMD% "scripts\yoru_memory_core_setup_2026.py" --apply
  if errorlevel 1 (
    echo [ERRO] Falha ao preparar a memoria da Yoru.
    pause
    exit /b 1
  )
) else (
  echo [AVISO] scripts\yoru_memory_core_setup_2026.py nao encontrado. Pulando etapa de memoria.
)

if exist "scripts\yoru_memory_core_diag_2026.py" (
  echo.
  echo [INFO] Diagnostico rapido da memoria...
  %PYTHON_CMD% "scripts\yoru_memory_core_diag_2026.py"
  if errorlevel 1 (
    echo [ERRO] Diagnostico da memoria falhou.
    pause
    exit /b 1
  )
)

REM ----------------------------------------------------------------
REM 3) Detecta Ollama opcionalmente, sem travar se nao estiver aberto
REM ----------------------------------------------------------------
where ollama >nul 2>nul
if errorlevel 1 (
  echo [AVISO] Ollama nao encontrado no PATH. Se a Yoru usa Ollama, instale/abra o Ollama.
) else (
  echo [OK] Ollama encontrado.
)

REM ----------------------------------------------------------------
REM 4) Inicializa o app da Yoru com fallbacks conhecidos
REM Use set YORU_ENTRY=arquivo.py para escolher manualmente.
REM ----------------------------------------------------------------
echo.
echo [INFO] Procurando entrada principal da Yoru...

if defined YORU_ENTRY (
  if exist "%YORU_ENTRY%" (
    echo [OK] Entrada manual: %YORU_ENTRY%
    %PYTHON_CMD% "%YORU_ENTRY%"
    goto :end
  ) else (
    echo [ERRO] YORU_ENTRY definido, mas arquivo nao existe: %YORU_ENTRY%
    pause
    exit /b 1
  )
)

if exist "run_yoru_nicegui.py" (
  echo [OK] Iniciando run_yoru_nicegui.py
  %PYTHON_CMD% "run_yoru_nicegui.py"
  goto :end
)

if exist "main.py" (
  echo [OK] Iniciando main.py
  %PYTHON_CMD% "main.py"
  goto :end
)

if exist "app.py" (
  echo [OK] Iniciando app.py
  %PYTHON_CMD% "app.py"
  goto :end
)

if exist "yoru_chat_core.py" (
  echo [OK] Iniciando yoru_chat_core.py
  %PYTHON_CMD% "yoru_chat_core.py"
  goto :end
)

if exist "avatar_widget.py" (
  echo [OK] Iniciando avatar_widget.py
  %PYTHON_CMD% "avatar_widget.py"
  goto :end
)

if exist "package.json" (
  where npm >nul 2>nul
  if errorlevel 1 (
    echo [ERRO] package.json encontrado, mas npm nao esta no PATH.
    pause
    exit /b 1
  )
  echo [OK] Projeto Node/Electron detectado. Rodando npm start.
  npm start
  goto :end
)

echo [AVISO] Nenhuma entrada principal encontrada.
echo Foram preparados apenas os arquivos de memoria da Yoru.
echo Para iniciar manualmente, use por exemplo:
echo   set YORU_ENTRY=run_yoru_nicegui.py
echo   iniciar.bat

:end
set "EXIT_CODE=%ERRORLEVEL%"
echo.
if not "%EXIT_CODE%"=="0" (
  echo [AVISO] A Yoru foi encerrada com codigo %EXIT_CODE%.
  echo Dica: prefira sempre este iniciar.bat ou .venv\Scripts\python.exe.
) else (
  echo [OK] Processo finalizado.
)
pause
exit /b %EXIT_CODE%
