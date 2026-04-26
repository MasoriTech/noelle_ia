@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

set "LOGDIR=logs"
if not exist "%LOGDIR%" mkdir "%LOGDIR%" >nul 2>nul
set "LOG=%LOGDIR%\organizar_codigo_noelle.log"

echo ===============================================================
echo  Noelle IA - Organizador seguro de codigo / GitHub
echo ===============================================================
echo Pasta atual: %CD%
echo Log: %LOG%
echo.

echo [%date% %time%] Inicio da organizacao > "%LOG%"

if not exist "package.json" (
  echo [AVISO] package.json nao encontrado. Rode este .bat na raiz da Noelle.
  echo [AVISO] package.json nao encontrado. >> "%LOG%"
  pause
  exit /b 1
)

call :ensure_dir "docs"
call :ensure_dir "docs\legacy"
call :ensure_dir "docs\patches"
call :ensure_dir "docs\reports"
call :ensure_dir "scripts"
call :ensure_dir "scripts\windows"
call :ensure_dir "scripts\github"

echo.
echo [1/5] Reforcando .gitignore...
> ".gitignore" (
  echo # Dependencias
  echo node_modules/
  echo **/node_modules/
  echo .venv/
  echo venv/
  echo env/
  echo **/.venv/
  echo **/venv/
  echo.
  echo # Build e release
  echo release/
  echo dist/
  echo build/
  echo out/
  echo **/release/
  echo **/dist/
  echo **/build/
  echo **/out/
  echo src/renderer_dist/
  echo.
  echo # Logs e temporarios
  echo logs/
  echo **/logs/
  echo *.log
  echo tmp/
  echo temp/
  echo **/tmp/
  echo **/temp/
  echo.
  echo # Pacotes/backups
  echo *.zip
  echo *.rar
  echo *.7z
  echo backup/
  echo backups/
  echo *_backup/
  echo *_old/
  echo *_bak/
  echo.
  echo # Python
  echo __pycache__/
  echo **/__pycache__/
  echo *.pyc
  echo *.pyo
  echo.
  echo # Modelos/cache local
  echo tools/noelle_stt/models/
  echo tools/noelle_stt/cache/
  echo **/tools/noelle_stt/models/
  echo **/tools/noelle_stt/cache/
  echo .cache/
  echo huggingface/
  echo hf_cache/
  echo **/.cache/
  echo **/huggingface/
  echo **/hf_cache/
  echo.
  echo # Audio temporario
  echo *.wav
  echo *.webm
  echo *.mp3
  echo.
  echo # Ambiente/local
  echo .env
  echo .env.local
  echo .DS_Store
  echo Thumbs.db
)
echo [OK] .gitignore atualizado.

echo.
echo [2/5] Movendo documentos soltos para docs...
for %%F in (
  "ARQUITETURA_*.txt"
  "CHECKUP_*.txt"
  "PACOTE_*.txt"
  "RELATORIO_*.txt"
  "NOELLECORE_*.txt"
  "README_APLICAR_PATCH.txt"
  "README_ORGANIZAR_GITHUB.txt"
) do call :move_glob %%F "docs\legacy"

if exist "README.txt" if exist "README.md" call :move_one "README.txt" "docs\legacy"

if exist "docs\legacy" echo [OK] Documentos antigos movidos quando encontrados.

echo.
echo [3/5] Organizando scripts antigos sem quebrar os principais...
rem Mantem na raiz: iniciar.bat, PREPARAR_AUDIO_STT.bat, DIAGNOSTICO_AUDIO_STT.bat, BAIXAR_MODELOS_IA.bat, dependencies.bat.
rem Move apenas scripts antigos/auxiliares conhecidos.
call :move_one "build_windows.bat" "scripts\windows"
call :move_one "build_windows.ps1" "scripts\windows"
call :move_one "iniciar.ps1" "scripts\windows"
call :move_one "dependencias.ps1" "scripts\windows"
call :move_one "reparar_avatar.bat" "scripts\windows"
call :move_one "reparar_avatar.ps1" "scripts\windows"

echo [OK] Scripts auxiliares movidos quando encontrados.

echo.
echo [4/5] Removendo pastas que nao devem ir para o GitHub...
call :remove_dir "node_modules"
call :remove_dir "logs"
call :remove_dir "release"
call :remove_dir "dist"
call :remove_dir "build"
call :remove_dir "out"
call :remove_dir ".venv"
call :remove_dir "venv"
call :remove_dir "tools\noelle_stt\models"
call :remove_dir "tools\noelle_stt\cache"

echo.
echo [5/5] Criando resumo da estrutura...
> "docs\ESTRUTURA_RECOMENDADA.md" (
  echo # Estrutura recomendada da Noelle IA
  echo.
  echo Arquivos principais que ficam na raiz:
  echo.
  echo ```txt
  echo main.js
  echo preload.js
  echo package.json
  echo package-lock.json
  echo iniciar.bat
  echo PREPARAR_AUDIO_STT.bat
  echo DIAGNOSTICO_AUDIO_STT.bat
  echo BAIXAR_MODELOS_IA.bat
  echo README.md
  echo CHANGELOG.md
  echo LICENSE
  echo VERSION
  echo ```
  echo.
  echo Pastas principais:
  echo.
  echo ```txt
  echo src/       codigo da interface e renderer
  echo scripts/   scripts auxiliares
  echo tools/     ferramentas Python, STT e utilitarios
  echo assets/    assets do app
  echo docs/      documentacao, historico e relatorios
  echo ```
  echo.
  echo Nao versionar:
  echo.
  echo ```txt
  echo node_modules/
  echo logs/
  echo release/
  echo build/
  echo dist/
  echo modelos/cache do faster-whisper
  echo modelos/cache do Ollama
  echo arquivos zip antigos
  echo ```
)

echo.
echo ===============================================================
echo  Organizacao concluida.
echo ===============================================================
echo.
echo Agora abra o GitHub Desktop e confira os Changes.
echo Se aparecer node_modules ou milhares de arquivos, NAO commite.
echo.
where git >nul 2>nul
if %errorlevel%==0 (
  echo Status Git:
  git status --short
) else (
  echo Git nao encontrado no PATH. Confira pelo GitHub Desktop.
)
echo.
echo [%date% %time%] Organizacao concluida >> "%LOG%"
pause
exit /b 0

:ensure_dir
if not exist "%~1" mkdir "%~1" >> "%LOG%" 2>&1
exit /b 0

:move_glob
set "PATTERN=%~1"
set "DEST=%~2"
for %%A in (%PATTERN%) do (
  if exist "%%~A" call :move_one "%%~A" "%DEST%"
)
exit /b 0

:move_one
set "SRC=%~1"
set "DEST=%~2"
if not exist "%SRC%" exit /b 0
if not exist "%DEST%" mkdir "%DEST%" >> "%LOG%" 2>&1
move /Y "%SRC%" "%DEST%\" >> "%LOG%" 2>&1
if %errorlevel%==0 echo   movido: %SRC% -^> %DEST%
exit /b 0

:remove_dir
set "DIR=%~1"
if exist "%DIR%" (
  echo   removendo: %DIR%
  rmdir /S /Q "%DIR%" >> "%LOG%" 2>&1
)
exit /b 0
