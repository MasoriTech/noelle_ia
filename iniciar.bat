@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

title Noelle Companion 2026 - INICIAR

:menu
cls
echo ============================================================
echo  Noelle Companion 2026 - Inicializador coeso V16
echo ============================================================
echo  [1] Iniciar Noelle ^(verifica/instala tudo antes^)
echo  [2] Diagnostico completo
echo  [3] Instalar/atualizar dependencias essenciais
echo  [4] Reparar manifests de assets ^(VRM/VRMA/PNG/GLB^)
echo  [5] Limpar outros .bat da raiz para backup
echo  [0] Sair
echo ============================================================
set /p op=Escolha: 
if "%op%"=="1" goto auto_start
if "%op%"=="2" goto diag
if "%op%"=="3" goto deps
if "%op%"=="4" goto manifests
if "%op%"=="5" goto clean_bats
if "%op%"=="0" exit /b 0
goto menu

:auto_start
cls
echo [Noelle] Preparando tudo antes de iniciar...
call :check_node || goto fail
node scripts\bootstrap_v16.cjs --start
if errorlevel 1 goto fail
pause
goto menu

:diag
cls
call :check_node || goto fail
node scripts\diagnostico_v16.cjs
pause
goto menu

:deps
cls
call :check_node || goto fail
echo [1/3] Instalando dependencias npm...
call npm install
if errorlevel 1 echo [AVISO] npm install retornou erro.

echo [2/3] Preparando .venv Python...
if not exist ".venv\Scripts\python.exe" (
  py -3 -m venv .venv
)
if exist ".venv\Scripts\python.exe" (
  ".venv\Scripts\python.exe" -m pip install --upgrade pip
  ".venv\Scripts\python.exe" -m pip install -r requirements.txt
) else (
  echo [AVISO] Python/.venv nao disponivel. Instale Python 3.9+.
)

echo [3/3] Verificando modelo Ollama...
where ollama >nul 2>nul
if errorlevel 1 (
  echo [AVISO] Ollama nao encontrado no PATH.
) else (
  start "Ollama" /min ollama serve
  ollama list | findstr /i "qwen3:0.6b" >nul
  if errorlevel 1 ollama pull qwen3:0.6b
)
pause
goto menu

:manifests
cls
call :check_node || goto fail
node scripts\rebuild_manifests_v16.cjs
pause
goto menu

:clean_bats
cls
echo Esta opcao move outros .bat da raiz para backup.
echo Mantem somente este arquivo: %~nx0
echo.
set /p ok=Confirmar? (S/N): 
if /i not "%ok%"=="S" goto menu
set "stamp=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%"
set "stamp=%stamp: =0%"
set "dest=backups\bats_limpos_%stamp%"
mkdir "%dest%" >nul 2>nul
for %%F in (*.bat) do (
  if /i not "%%~nxF"=="%~nx0" (
    echo Movendo %%~nxF
    move "%%~fF" "%dest%\" >nul
  )
)
echo [OK] Outros .bat foram movidos para %dest%
pause
goto menu

:check_node
where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado. Instale Node.js LTS e tente novamente.
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERRO] npm nao encontrado. Reinstale Node.js LTS marcando npm.
  exit /b 1
)
exit /b 0

:fail
echo.
echo [ERRO] Processo falhou. Veja as mensagens acima.
pause
goto menu
