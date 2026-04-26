@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

set "LOG_DIR=logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>nul
set "LOG_FILE=%LOG_DIR%\organizar_github.log"

echo ===============================================================
echo  Noelle IA - Organizador GitHub
echo ===============================================================
echo Pasta atual: %CD%
echo Log: %LOG_FILE%
echo.

echo [%DATE% %TIME%] Iniciando ORGANIZAR_GITHUB.bat>>"%LOG_FILE%"

:MENU
echo.
echo Escolha uma opcao:
echo   1. Verificar projeto
echo   2. Reforcar .gitignore
echo   3. Limpar arquivos que nao vao para o GitHub
echo   4. Ver status do Git
echo   5. Preparar commit e push
echo   6. Fazer tudo recomendado, sem commit automatico
echo   0. Sair
echo.
set /p OPCAO="Opcao: "

if "%OPCAO%"=="1" goto CHECK
if "%OPCAO%"=="2" goto GITIGNORE
if "%OPCAO%"=="3" goto CLEAN_CONFIRM
if "%OPCAO%"=="4" goto STATUS
if "%OPCAO%"=="5" goto COMMIT_FLOW
if "%OPCAO%"=="6" goto ALL_SAFE
if "%OPCAO%"=="0" goto END

echo Opcao invalida.
goto MENU

:CHECK
echo.
echo [1/4] Verificando arquivos principais...
if exist "package.json" (echo [OK] package.json encontrado) else echo [AVISO] package.json nao encontrado
if exist "main.js" (echo [OK] main.js encontrado) else echo [AVISO] main.js nao encontrado
if exist "preload.js" (echo [OK] preload.js encontrado) else echo [AVISO] preload.js nao encontrado
if exist "src" (echo [OK] pasta src encontrada) else echo [AVISO] pasta src nao encontrada
if exist "tools\noelle_stt" (echo [OK] tools\noelle_stt encontrado) else echo [INFO] tools\noelle_stt nao encontrado

echo.
echo [2/4] Verificando Git...
git --version >nul 2>nul
if errorlevel 1 (
  echo [AVISO] Git nao encontrado no PATH.
) else (
  for /f "tokens=*" %%G in ('git --version') do echo [OK] %%G
)

if exist ".git" (
  echo [OK] Esta pasta parece ser um repositorio Git.
) else (
  echo [AVISO] Nao encontrei .git nesta pasta.
  echo         Se esta for a pasta do GitHub Desktop, verifique se voce esta na raiz do repo.
)

echo.
echo [3/4] Procurando pastas pesadas comuns...
call :SHOW_IF_EXISTS "node_modules"
call :SHOW_IF_EXISTS "logs"
call :SHOW_IF_EXISTS "release"
call :SHOW_IF_EXISTS "dist"
call :SHOW_IF_EXISTS "build"
call :SHOW_IF_EXISTS ".venv"
call :SHOW_IF_EXISTS "tools\noelle_stt\models"
call :SHOW_IF_EXISTS "tools\noelle_stt\cache"

echo.
echo [4/4] Resumo rapido de arquivos grandes, se PowerShell estiver disponivel...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -Recurse -File -ErrorAction SilentlyContinue | Where-Object {$_.Length -gt 50MB -and $_.FullName -notmatch '\\.git\\'} | Select-Object FullName,@{Name='MB';Expression={[math]::Round($_.Length/1MB,1)}} | Format-Table -AutoSize" 2>nul

goto MENU

:GITIGNORE
echo.
echo Reforcando .gitignore...
(
  echo # Noelle IA - arquivos que nao devem ir para o GitHub
  echo.
  echo # Dependencias Node
  echo node_modules/
  echo **/node_modules/
  echo.
  echo # Builds e releases
  echo release/
  echo dist/
  echo build/
  echo out/
  echo src/renderer_dist/
  echo **/release/
  echo **/dist/
  echo **/build/
  echo **/out/
  echo.
  echo # Logs
  echo logs/
  echo **/logs/
  echo *.log
  echo npm-debug.log*
  echo.
  echo # Python
  echo .venv/
  echo venv/
  echo env/
  echo **/.venv/
  echo **/venv/
  echo __pycache__/
  echo **/__pycache__/
  echo *.pyc
  echo *.pyo
  echo.
  echo # Modelos, cache e STT
  echo tools/noelle_stt/models/
  echo tools/noelle_stt/cache/
  echo **/tools/noelle_stt/models/
  echo **/tools/noelle_stt/cache/
  echo .cache/
  echo **/.cache/
  echo huggingface/
  echo hf_cache/
  echo **/huggingface/
  echo **/hf_cache/
  echo.
  echo # Audio temporario
  echo *.wav
  echo *.webm
  echo *.mp3
  echo tmp/
  echo temp/
  echo **/tmp/
  echo **/temp/
  echo.
  echo # Pacotes e backups locais
  echo *.zip
  echo *.rar
  echo *.7z
  echo backup/
  echo backups/
  echo *_backup/
  echo *_old/
  echo *_bak/
  echo.
  echo # Sistema
  echo Thumbs.db
  echo .DS_Store
  echo.
  echo # Config local sensivel
  echo .env
  echo .env.local
) > ".gitignore"
echo [OK] .gitignore atualizado.
echo [%DATE% %TIME%] .gitignore atualizado>>"%LOG_FILE%"
goto MENU

:CLEAN_CONFIRM
echo.
echo Esta limpeza apaga somente pastas/arquivos que NAO devem ir para o GitHub.
echo Ela nao apaga src, scripts, tools, main.js, preload.js nem package.json.
echo.
set /p CONFIRM="Confirmar limpeza? (S/N): "
if /I not "%CONFIRM%"=="S" goto MENU
goto CLEAN

:CLEAN
echo.
echo Limpando pastas pesadas/temporarias...
call :DELETE_DIR "node_modules"
call :DELETE_DIR "logs"
call :DELETE_DIR "release"
call :DELETE_DIR "dist"
call :DELETE_DIR "build"
call :DELETE_DIR "out"
call :DELETE_DIR ".venv"
call :DELETE_DIR "venv"
call :DELETE_DIR "env"
call :DELETE_DIR "tools\noelle_stt\models"
call :DELETE_DIR "tools\noelle_stt\cache"
call :DELETE_DIR ".cache"
call :DELETE_DIR "huggingface"
call :DELETE_DIR "hf_cache"
call :DELETE_DIR "tmp"
call :DELETE_DIR "temp"

echo.
echo Limpando caches Python dentro do projeto...
for /d /r %%D in (__pycache__) do (
  if exist "%%D" (
    echo Removendo %%D
    rmdir /s /q "%%D" 2>nul
  )
)

echo Limpando pacotes e logs soltos...
del /s /q "*.zip" "*.rar" "*.7z" "*.log" "*.wav" "*.webm" "*.mp3" "*.pyc" "*.pyo" 2>nul

echo [OK] Limpeza concluida.
echo [%DATE% %TIME%] Limpeza concluida>>"%LOG_FILE%"
goto MENU

:STATUS
echo.
git --version >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Git nao esta disponivel no PATH.
  goto MENU
)
if not exist ".git" (
  echo [AVISO] Esta pasta nao tem .git. Abra a raiz do repositorio.
  goto MENU
)

echo Status curto:
git status --short

echo.
echo Arquivos ignorados importantes, se existirem:
git status --ignored --short | findstr /I "node_modules logs release dist build .venv cache models zip wav webm mp3" 2>nul

goto MENU

:COMMIT_FLOW
git --version >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Git nao esta disponivel no PATH.
  goto MENU
)
if not exist ".git" (
  echo [AVISO] Esta pasta nao tem .git. Abra a raiz do repositorio.
  goto MENU
)

echo.
echo Antes do commit, confira se nao entrou node_modules/logs/modelos/cache.
echo.
git status --short

echo.
set /p CONTINUAR="Continuar com git add? (S/N): "
if /I not "%CONTINUAR%"=="S" goto MENU

git add -A

echo.
git status --short

echo.
set /p MSG="Mensagem do commit: "
if "%MSG%"=="" set "MSG=atualiza Noelle IA"

git commit -m "%MSG%"
if errorlevel 1 (
  echo [AVISO] Commit nao foi criado. Talvez nao haja alteracoes ou houve erro.
  goto MENU
)

echo.
set /p PUSH="Enviar para GitHub agora com push origin? (S/N): "
if /I "%PUSH%"=="S" (
  git push origin main
  if errorlevel 1 (
    echo [AVISO] Push falhou. Verifique conexao/login/branch.
  ) else (
    echo [OK] Push concluido.
  )
)
goto MENU

:ALL_SAFE
call :GITIGNORE_ONLY
call :CLEAN_ONLY
goto STATUS

:GITIGNORE_ONLY
(
  echo # Noelle IA - arquivos que nao devem ir para o GitHub
  echo node_modules/
  echo **/node_modules/
  echo logs/
  echo **/logs/
  echo release/
  echo dist/
  echo build/
  echo out/
  echo src/renderer_dist/
  echo .venv/
  echo venv/
  echo env/
  echo **/__pycache__/
  echo *.pyc
  echo tools/noelle_stt/models/
  echo tools/noelle_stt/cache/
  echo **/tools/noelle_stt/models/
  echo **/tools/noelle_stt/cache/
  echo .cache/
  echo huggingface/
  echo hf_cache/
  echo *.log
  echo *.zip
  echo *.rar
  echo *.7z
  echo *.wav
  echo *.webm
  echo *.mp3
  echo tmp/
  echo temp/
  echo Thumbs.db
  echo .DS_Store
  echo .env
  echo .env.local
) > ".gitignore"
echo [OK] .gitignore reforcado.
exit /b 0

:CLEAN_ONLY
call :DELETE_DIR "node_modules"
call :DELETE_DIR "logs"
call :DELETE_DIR "release"
call :DELETE_DIR "dist"
call :DELETE_DIR "build"
call :DELETE_DIR "out"
call :DELETE_DIR ".venv"
call :DELETE_DIR "venv"
call :DELETE_DIR "env"
call :DELETE_DIR "tools\noelle_stt\models"
call :DELETE_DIR "tools\noelle_stt\cache"
del /s /q "*.zip" "*.rar" "*.7z" "*.log" "*.wav" "*.webm" "*.mp3" "*.pyc" "*.pyo" 2>nul
for /d /r %%D in (__pycache__) do if exist "%%D" rmdir /s /q "%%D" 2>nul
echo [OK] Limpeza segura concluida.
exit /b 0

:SHOW_IF_EXISTS
if exist %~1 echo [ENCONTRADO] %~1
exit /b 0

:DELETE_DIR
if exist %~1 (
  echo Removendo %~1
  rmdir /s /q %~1 2>nul
)
exit /b 0

:END
echo Saindo.
endlocal
exit /b 0
