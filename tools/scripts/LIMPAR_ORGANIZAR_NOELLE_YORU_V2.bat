@echo off
setlocal EnableExtensions EnableDelayedExpansion

title Noelle Yoru - Limpar e Organizar V2

rem ============================================================
rem LIMPAR_ORGANIZAR_NOELLE_YORU_V2.bat
rem Seguro: move bagunca para _ORGANIZADO_BACKUP, nao apaga projeto.
rem Use no terminal do VS Code dentro da pasta noelle_ia.
rem ============================================================

echo.
echo ============================================================
echo  NOELLE + YORU - LIMPAR E ORGANIZAR REPO
echo ============================================================
echo.

rem Detectar pasta raiz do Noelle
set "ROOT="

if not "%~1"=="" (
  set "ROOT=%~1"
)

if "%ROOT%"=="" (
  if exist "%CD%\package.json" if exist "%CD%\main.js" set "ROOT=%CD%"
)

if "%ROOT%"=="" (
  if exist "%~dp0package.json" if exist "%~dp0main.js" set "ROOT=%~dp0"
)

if "%ROOT%"=="" (
  echo [INFO] Nao consegui detectar a pasta do Noelle automaticamente.
  echo Cole o caminho da pasta onde ficam package.json e main.js.
  echo Exemplo: C:\Users\Administrator\Downloads\chat\noelle_ia
  set /p "ROOT=Caminho: "
)

set "ROOT=%ROOT:"=%"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

if not exist "%ROOT%\package.json" (
  echo.
  echo [ERRO] package.json nao encontrado em: %ROOT%
  echo Abra o VS Code na pasta noelle_ia ou passe o caminho como argumento.
  echo.
  pause
  exit /b 1
)

if not exist "%ROOT%\main.js" (
  echo.
  echo [ERRO] main.js nao encontrado em: %ROOT%
  echo Esta pasta nao parece ser a raiz do Noelle Companion.
  echo.
  pause
  exit /b 1
)

for /f %%I in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd_HHmmss"') do set "TS=%%I"
set "BACKUP=%ROOT%\_ORGANIZADO_BACKUP\%TS%"
set "REPORT=%BACKUP%\RELATORIO_ORGANIZACAO.txt"

mkdir "%BACKUP%" >nul 2>nul
mkdir "%BACKUP%\backups" >nul 2>nul
mkdir "%BACKUP%\archives" >nul 2>nul
mkdir "%BACKUP%\docs_extras" >nul 2>nul
mkdir "%BACKUP%\runtime" >nul 2>nul
mkdir "%BACKUP%\legacy_folders" >nul 2>nul

echo Noelle/Yoru organizacao > "%REPORT%"
echo Data: %DATE% %TIME% >> "%REPORT%"
echo Raiz: %ROOT% >> "%REPORT%"
echo Backup: %BACKUP% >> "%REPORT%"
echo. >> "%REPORT%"

echo [OK] Raiz detectada: %ROOT%
echo [OK] Backup seguro: %BACKUP%
echo.
echo Nada importante sera apagado. Arquivos de bagunca serao movidos para backup.
echo Caches gerados (__pycache__ e .pyc) serao removidos.
echo.
choice /C SN /N /M "Continuar? [S/N] "
if errorlevel 2 (
  echo Cancelado.
  exit /b 0
)

echo.
echo [1/8] Limpando caches Python...
for /d /r "%ROOT%" %%D in (__pycache__) do (
  echo Removendo: %%D
  echo Removido cache: %%D >> "%REPORT%"
  rd /s /q "%%D" >nul 2>nul
)
del /s /q "%ROOT%\*.pyc" >nul 2>nul

echo [2/8] Movendo backups antigos (.bak/.old/.orig/.backup)...
for /r "%ROOT%" %%F in (*.bak *.bak_* *.backup *.old *.orig) do (
  echo %%F | findstr /I /C:"\\node_modules\\" >nul
  if errorlevel 1 (
    echo %%F | findstr /I /C:"\\.git\\" >nul
    if errorlevel 1 call :MoveFile "%%F" "%BACKUP%\backups"
  )
)

echo [3/8] Movendo arquivos compactados soltos da raiz...
for %%F in ("%ROOT%\*.zip" "%ROOT%\*.rar" "%ROOT%\*.7z") do (
  if exist "%%~fF" call :MoveFile "%%~fF" "%BACKUP%\archives"
)

echo [4/8] Movendo READMEs extras e CHANGELOGs soltos da raiz...
for %%F in ("%ROOT%\README*.md" "%ROOT%\README*.txt") do (
  if exist "%%~fF" if /I not "%%~nxF"=="README.md" call :MoveFile "%%~fF" "%BACKUP%\docs_extras"
)
for %%F in ("%ROOT%\CHANGELOG*.md" "%ROOT%\CHANGELOG*.txt" "%ROOT%\*_CHANGELOG*.md") do (
  if exist "%%~fF" call :MoveFile "%%~fF" "%BACKUP%\docs_extras"
)

echo [5/8] Limpando runtime gerado da Yoru...
if exist "%ROOT%\yoru_chat" (
  call :MoveFile "%ROOT%\yoru_chat\data\avatar_events.jsonl" "%BACKUP%\runtime"
  call :MoveFile "%ROOT%\yoru_chat\data\runtime_state.json" "%BACKUP%\runtime"
  call :MoveFile "%ROOT%\yoru_chat\data\apps_inventory.json" "%BACKUP%\runtime"
  call :MoveFile "%ROOT%\yoru_chat\data\apps_prefs.json" "%BACKUP%\runtime"
  call :MoveFile "%ROOT%\yoru_chat\data\tasks.json" "%BACKUP%\runtime"
  if exist "%ROOT%\yoru_chat\legacy_noelle_api_integration" call :MoveDir "%ROOT%\yoru_chat\legacy_noelle_api_integration" "%BACKUP%\legacy_folders"
  if exist "%ROOT%\yoru_chat\noelle_embedded_chat" call :MoveDir "%ROOT%\yoru_chat\noelle_embedded_chat" "%BACKUP%\legacy_folders"
  for /r "%ROOT%\yoru_chat" %%F in (CHANGELOG_*.md) do call :MoveFile "%%F" "%BACKUP%\docs_extras"
) else (
  echo [AVISO] yoru_chat nao existe ainda. Pulei limpeza especifica da Yoru.
  echo AVISO: yoru_chat nao existe ainda. >> "%REPORT%"
)

echo [6/8] Criando pastas de organizacao se faltarem...
if not exist "%ROOT%\docs" mkdir "%ROOT%\docs" >nul 2>nul
if not exist "%ROOT%\scripts" mkdir "%ROOT%\scripts" >nul 2>nul
if not exist "%ROOT%\tools" mkdir "%ROOT%\tools" >nul 2>nul

echo [7/8] Opcional: mover pastas legadas conhecidas...
echo.
echo Esta etapa move pastas que normalmente sao bagunca/legado para o backup.
echo Ela NAO move src, tools, scripts, stt, assets, yoru_chat, node_modules ou .git.
echo.
choice /C SN /N /M "Mover pastas legado conhecidas? [S/N] "
if errorlevel 2 goto SkipLegacy
for %%D in (legacy_bats legacy legacy_old backups backup old_old old patches_aplicados patches_antigos temp tmp) do (
  if exist "%ROOT%\%%D" call :MoveDir "%ROOT%\%%D" "%BACKUP%\legacy_folders"
)
:SkipLegacy

echo [8/8] Gerando README de organizacao...
set "ORGREADME=%ROOT%\README_ORGANIZACAO_YORU.md"
(
  echo # Organizacao Noelle + Yoru
  echo.
  echo Organizado em: %DATE% %TIME%
  echo.
  echo Backup criado em:
  echo.
  echo ```txt
  echo %BACKUP%
  echo ```
  echo.
  echo Estrutura recomendada:
  echo.
  echo ```txt
  echo noelle_ia/
  echo   main.js
  echo   preload.js
  echo   package.json
  echo   src/
  echo   tools/
  echo   scripts/
  echo   yoru_chat/
  echo ```
  echo.
  echo Nao copie os arquivos da Yoru soltos na raiz. Mantenha tudo dentro de `yoru_chat/`.
  echo.
  echo Se algo importante foi movido por engano, recupere do backup acima.
) > "%ORGREADME%"

echo README criado: %ORGREADME% >> "%REPORT%"

echo.
echo ============================================================
echo  ORGANIZACAO CONCLUIDA
echo ============================================================
echo Backup: %BACKUP%
echo Relatorio: %REPORT%
echo.

if exist "%ROOT%\yoru_chat\noelle_kobold_replace\apply_noelle_kobold_replace_2026.cjs" (
  choice /C SN /N /M "Aplicar patch Yoru/Kobold agora? [S/N] "
  if errorlevel 2 goto NoPatch
  pushd "%ROOT%"
  node yoru_chat\noelle_kobold_replace\apply_noelle_kobold_replace_2026.cjs
  popd
  :NoPatch
)

if exist "%ROOT%\yoru_chat\noelle_kobold_replace\diagnostico_noelle_kobold_replace_2026.cjs" (
  choice /C SN /N /M "Rodar diagnostico Yoru/Kobold agora? [S/N] "
  if errorlevel 2 goto NoDiag
  pushd "%ROOT%"
  node yoru_chat\noelle_kobold_replace\diagnostico_noelle_kobold_replace_2026.cjs
  popd
  :NoDiag
)

echo.
echo Pronto. Se quiser iniciar o app, rode:
echo npm start
echo.
pause
exit /b 0

:MoveFile
set "SRC=%~1"
set "DEST=%~2"
if not exist "%SRC%" exit /b 0
if not exist "%DEST%" mkdir "%DEST%" >nul 2>nul
move /Y "%SRC%" "%DEST%\" >nul 2>nul
if errorlevel 1 (
  echo [AVISO] Falhou mover arquivo: %SRC%
  echo FALHA arquivo: %SRC% >> "%REPORT%"
) else (
  echo Movido arquivo: %SRC%
  echo Movido arquivo: %SRC% >> "%REPORT%"
)
exit /b 0

:MoveDir
set "SRC=%~1"
set "DEST=%~2"
if not exist "%SRC%" exit /b 0
if not exist "%DEST%" mkdir "%DEST%" >nul 2>nul
move /Y "%SRC%" "%DEST%\" >nul 2>nul
if errorlevel 1 (
  echo [AVISO] Falhou mover pasta: %SRC%
  echo FALHA pasta: %SRC% >> "%REPORT%"
) else (
  echo Movida pasta: %SRC%
  echo Movida pasta: %SRC% >> "%REPORT%"
)
exit /b 0
