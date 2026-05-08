@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

title Limpar e Organizar Noelle + Yoru

echo ============================================================
echo   LIMPAR E ORGANIZAR NOELLE + YORU - modo seguro
echo ============================================================
echo.
echo Este .bat NAO apaga arquivos importantes direto.
echo Ele move bagunca, backups e arquivos antigos para uma pasta _ORGANIZADO_BACKUP.
echo.

REM ------------------------------------------------------------
REM 1) Descobrir pasta do projeto Noelle
REM ------------------------------------------------------------
set "ROOT=%CD%"

if not exist "%ROOT%\package.json" goto askroot
if not exist "%ROOT%\main.js" goto askroot
goto rootok

:askroot
echo Nao encontrei package.json + main.js nesta pasta:
echo %ROOT%
echo.
set /p ROOT=Cole o caminho da pasta noelle_ia aqui: 
if not exist "%ROOT%\package.json" (
  echo.
  echo [ERRO] package.json nao encontrado em: %ROOT%
  pause
  exit /b 1
)
if not exist "%ROOT%\main.js" (
  echo.
  echo [ERRO] main.js nao encontrado em: %ROOT%
  pause
  exit /b 1
)

:rootok
cd /d "%ROOT%" || exit /b 1

echo [OK] Projeto Noelle encontrado em:
echo %CD%
echo.

REM ------------------------------------------------------------
REM 2) Criar pasta de backup organizada
REM ------------------------------------------------------------
for /f "tokens=1-3 delims=/ " %%a in ("%date%") do set "D1=%%a"&set "D2=%%b"&set "D3=%%c"
for /f "tokens=1-3 delims=:,. " %%a in ("%time%") do set "T1=%%a"&set "T2=%%b"&set "T3=%%c"
set "STAMP=%D3%-%D2%-%D1%_%T1%-%T2%-%T3%"
set "STAMP=%STAMP: =0%"
set "BACKUP=%CD%\_ORGANIZADO_BACKUP\%STAMP%"
set "LOG=%BACKUP%\organizacao_log.txt"

mkdir "%BACKUP%" >nul 2>nul
mkdir "%BACKUP%\backups_bak" >nul 2>nul
mkdir "%BACKUP%\readmes_extras" >nul 2>nul
mkdir "%BACKUP%\changelogs_antigos" >nul 2>nul
mkdir "%BACKUP%\zips_packs_antigos" >nul 2>nul
mkdir "%BACKUP%\runtime_cache" >nul 2>nul
mkdir "%BACKUP%\legacy_scripts" >nul 2>nul
mkdir "%BACKUP%\legacy_dirs" >nul 2>nul

echo Organização iniciada em %date% %time% > "%LOG%"
echo Projeto: %CD%>> "%LOG%"
echo Backup: %BACKUP%>> "%LOG%"
echo.>> "%LOG%"

echo A pasta de backup sera:
echo %BACKUP%
echo.
echo Arquivos movidos poderao ser recuperados dessa pasta.
echo.
choice /C SN /M "Continuar com a limpeza/organizacao?"
if errorlevel 2 (
  echo Cancelado pelo usuario.
  pause
  exit /b 0
)

REM ------------------------------------------------------------
REM Funcoes simples via chamadas internas
REM ------------------------------------------------------------

echo.
echo ============================================================
echo  ETAPA 1 - Removendo caches Python/Node temporarios
echo ============================================================

for /d /r %%D in (__pycache__) do (
  if exist "%%D" (
    echo Movendo cache: %%D
    echo CACHE_DIR %%D>> "%LOG%"
    rmdir /s /q "%%D" >nul 2>nul
  )
)

for /r %%F in (*.pyc *.pyo) do (
  echo Removendo bytecode: %%F
  echo PYC %%F>> "%LOG%"
  del /f /q "%%F" >nul 2>nul
)

REM Arquivos runtime gerados pela Yoru: mover/remover da area ativa
if exist "yoru_chat\data" (
  for %%F in (
    "yoru_chat\data\avatar_events.jsonl"
    "yoru_chat\data\runtime_state.json"
    "yoru_chat\data\tasks.json"
    "yoru_chat\data\apps_inventory.json"
    "yoru_chat\data\apps_prefs.json"
  ) do (
    if exist %%~F (
      echo Movendo runtime Yoru: %%~F
      echo RUNTIME %%~F>> "%LOG%"
      move /Y %%~F "%BACKUP%\runtime_cache\" >nul
    )
  )
)

REM ------------------------------------------------------------
echo.
echo ============================================================
echo  ETAPA 2 - Movendo arquivos .bak/.backup antigos
echo ============================================================

for /r %%F in (*.bak *.backup *.old *.orig) do (
  echo Movendo backup antigo: %%F
  echo BACKUP_FILE %%F>> "%LOG%"
  move /Y "%%F" "%BACKUP%\backups_bak\" >nul 2>nul
)

REM ------------------------------------------------------------
echo.
echo ============================================================
echo  ETAPA 3 - Organizando READMEs e CHANGELOGs extras
echo ============================================================

echo Mantendo README.md principal na raiz.
for %%F in (README_*.md Readme_*.md readme_*.md *_README.md) do (
  if exist "%%F" (
    echo Movendo README extra da raiz: %%F
    echo README_EXTRA %%F>> "%LOG%"
    move /Y "%%F" "%BACKUP%\readmes_extras\" >nul
  )
)

for %%F in (CHANGELOG_*.md changelog_*.md Changelog_*.md) do (
  if exist "%%F" (
    echo Movendo changelog antigo da raiz: %%F
    echo CHANGELOG %%F>> "%LOG%"
    move /Y "%%F" "%BACKUP%\changelogs_antigos\" >nul
  )
)

if exist "yoru_chat\docs" (
  mkdir "%BACKUP%\yoru_docs_antigos" >nul 2>nul
  for %%F in ("yoru_chat\docs\CHANGELOG_*.md" "yoru_chat\docs\NOELLE_COMPANION_BRIDGE.md" "yoru_chat\docs\NOELLE_EMBEDDED_CHAT_PACK.md") do (
    if exist %%~F (
      echo Movendo doc antiga da Yoru: %%~F
      echo YORU_DOC_OLD %%~F>> "%LOG%"
      move /Y %%~F "%BACKUP%\yoru_docs_antigos\" >nul
    )
  )
)

REM ------------------------------------------------------------
echo.
echo ============================================================
echo  ETAPA 4 - Movendo packs ZIP antigos da raiz
echo ============================================================

for %%F in (*.zip *.7z *.rar) do (
  if exist "%%F" (
    echo Movendo pack compactado antigo: %%F
    echo ARCHIVE %%F>> "%LOG%"
    move /Y "%%F" "%BACKUP%\zips_packs_antigos\" >nul
  )
)

REM ------------------------------------------------------------
echo.
echo ============================================================
echo  ETAPA 5 - Organizando pastas antigas/legado conhecidas
echo ============================================================

for %%D in (
  "legacy_bats"
  "legacy_noelle_api_integration"
  "noelle_embedded_chat"
  "noelle_companion_integration"
  "diagnostics_old"
  "backup"
  "backups"
  "old"
  "antigo"
) do (
  if exist %%~D (
    echo Movendo pasta legado: %%~D
    echo LEGACY_DIR %%~D>> "%LOG%"
    move /Y %%~D "%BACKUP%\legacy_dirs\" >nul 2>nul
  )
)

REM ------------------------------------------------------------
echo.
echo ============================================================
echo  ETAPA 6 - Conferindo estrutura recomendada
echo ============================================================

if not exist "yoru_chat" (
  echo [AVISO] Pasta yoru_chat nao existe ainda.
  echo        Copie a pasta yoru_chat do pack limpo para esta raiz.
  echo MISSING yoru_chat>> "%LOG%"
) else (
  echo [OK] yoru_chat existe.
)

if exist "yoru_chat\noelle_kobold_replace\apply_noelle_kobold_replace_2026.cjs" (
  echo [OK] Patch Noelle/Kobold encontrado.
) else (
  echo [AVISO] Patch Noelle/Kobold nao encontrado em yoru_chat\noelle_kobold_replace.
  echo MISSING patch>> "%LOG%"
)

if exist "main.js" echo [OK] main.js existe.
if exist "preload.js" echo [OK] preload.js existe.
if exist "package.json" echo [OK] package.json existe.

REM ------------------------------------------------------------
echo.
echo ============================================================
echo  ETAPA 7 - Criando README curto de organizacao
echo ============================================================

set "ORGREADME=%CD%\README_ORGANIZACAO_YORU.md"
(
  echo # Organizacao Noelle + Yoru
  echo.
  echo Esta organizacao foi feita pelo script `LIMPAR_ORGANIZAR_NOELLE_YORU.bat`.
  echo.
  echo ## Estrutura recomendada
  echo.
  echo ```txt
  echo noelle_ia/
  echo   main.js
  echo   preload.js
  echo   package.json
  echo   src/
  echo   yoru_chat/
  echo ```
  echo.
  echo ## Backup
  echo.
  echo Arquivos movidos ficam em:
  echo.
  echo `%BACKUP%`
  echo.
  echo ## Proximo passo
  echo.
  echo Se a pasta `yoru_chat` existir, rode:
  echo.
  echo ```bat
  echo node yoru_chat\noelle_kobold_replace\apply_noelle_kobold_replace_2026.cjs
  echo node yoru_chat\noelle_kobold_replace\diagnostico_noelle_kobold_replace_2026.cjs
  echo npm start
  echo ```
) > "%ORGREADME%"

echo [OK] Criado README_ORGANIZACAO_YORU.md

REM ------------------------------------------------------------
echo.
echo ============================================================
echo  ETAPA 8 - Verificacao final simples
echo ============================================================

where node >nul 2>nul
if errorlevel 1 (
  echo [AVISO] Node.js nao encontrado no PATH.
) else (
  echo [OK] Node.js encontrado.
)

where python >nul 2>nul
if errorlevel 1 (
  echo [AVISO] Python nao encontrado no PATH.
) else (
  echo [OK] Python encontrado.
)

echo.
echo ============================================================
echo  ORGANIZACAO CONCLUIDA
echo ============================================================
echo Backup criado em:
echo %BACKUP%
echo.
echo Log:
echo %LOG%
echo.
echo Se algo sumiu, procure na pasta de backup acima.
echo.

choice /C SN /M "Quer aplicar o patch Yoru/Kobold agora?"
if errorlevel 2 goto end

if not exist "yoru_chat\noelle_kobold_replace\apply_noelle_kobold_replace_2026.cjs" (
  echo [ERRO] Nao encontrei o script de patch.
  echo Copie primeiro a pasta yoru_chat para a raiz do Noelle.
  goto end
)

node "yoru_chat\noelle_kobold_replace\apply_noelle_kobold_replace_2026.cjs"
if errorlevel 1 (
  echo [ERRO] Patch falhou.
  goto end
)

echo.
choice /C SN /M "Quer rodar o diagnostico agora?"
if errorlevel 2 goto end
node "yoru_chat\noelle_kobold_replace\diagnostico_noelle_kobold_replace_2026.cjs"

:end
echo.
echo Finalizado.
pause
exit /b 0
