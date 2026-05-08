@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

title Resolver Yoru Chat + Noelle Companion

echo ============================================================
echo  RESOLVER YORU CHAT + NOELLE COMPANION
echo  Este .bat prepara o Noelle para usar Yoru + KoboldCpp
echo ============================================================
echo.

set "BAT_DIR=%~dp0"
set "START_DIR=%CD%"
set "NOELLE_ROOT="
set "YORU_SOURCE="

REM 1) Encontrar a pasta do Noelle.
if exist "%START_DIR%\main.js" if exist "%START_DIR%\package.json" (
  set "NOELLE_ROOT=%START_DIR%"
)

if not defined NOELLE_ROOT (
  if exist "%BAT_DIR%main.js" if exist "%BAT_DIR%package.json" (
    set "NOELLE_ROOT=%BAT_DIR:~0,-1%"
  )
)

if not defined NOELLE_ROOT (
  echo [INFO] Nao achei main.js/package.json na pasta atual.
  echo Cole o caminho da pasta do Noelle, exemplo:
  echo C:\Users\Administrator\Downloads\noelle_ia
  echo.
  set /p "NOELLE_ROOT=Caminho do noelle_ia: "
)

if not exist "%NOELLE_ROOT%\main.js" (
  echo.
  echo [ERRO] main.js nao encontrado em:
  echo %NOELLE_ROOT%
  echo.
  echo Abra o VS Code na pasta do Noelle ou informe o caminho correto.
  pause
  exit /b 1
)

if not exist "%NOELLE_ROOT%\package.json" (
  echo.
  echo [ERRO] package.json nao encontrado em:
  echo %NOELLE_ROOT%
  pause
  exit /b 1
)

echo [OK] Pasta do Noelle:
echo %NOELLE_ROOT%
echo.

REM 2) Encontrar/copiar yoru_chat.
if exist "%NOELLE_ROOT%\yoru_chat\src\yoru_bridge" (
  set "YORU_SOURCE=%NOELLE_ROOT%\yoru_chat"
  echo [OK] yoru_chat ja existe dentro do Noelle.
) else (
  if exist "%BAT_DIR%yoru_chat\src\yoru_bridge" (
    set "YORU_SOURCE=%BAT_DIR%yoru_chat"
    echo [INFO] Encontrei yoru_chat ao lado deste .bat.
    echo [INFO] Vou copiar para:
    echo %NOELLE_ROOT%\yoru_chat
    echo.
    robocopy "!YORU_SOURCE!" "!NOELLE_ROOT!\yoru_chat" /E /NFL /NDL /NJH /NJS /NP /XF apps_inventory.json tasks.json runtime_state.json avatar_events.jsonl >nul
    if errorlevel 8 (
      echo [ERRO] Falha ao copiar yoru_chat.
      pause
      exit /b 1
    )
    set "YORU_SOURCE=!NOELLE_ROOT!\yoru_chat"
    echo [OK] yoru_chat copiado.
  ) else (
    echo.
    echo [ERRO] Nao encontrei a pasta yoru_chat.
    echo.
    echo Solucao:
    echo 1. Extraia o ZIP Noelle_YoruChat_Clean.
    echo 2. Rode este .bat que fica ao lado da pasta yoru_chat.
    echo    OU copie a pasta yoru_chat para dentro do Noelle.
    echo.
    pause
    exit /b 1
  )
)

echo.

REM 3) Checar Node.
where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado.
  echo Instale Node.js ou abra o terminal onde o Node funciona.
  pause
  exit /b 1
)
for /f "delims=" %%v in ('node -v') do set "NODE_VER=%%v"
echo [OK] Node: %NODE_VER%

REM 4) Checar Python.
set "PY_CMD=python"
where python >nul 2>nul
if errorlevel 1 (
  where py >nul 2>nul
  if errorlevel 1 (
    echo [ERRO] Python nao encontrado.
    echo Instale Python 3.11+ ou marque Add Python to PATH.
    pause
    exit /b 1
  ) else (
    set "PY_CMD=py -3"
  )
)
for /f "delims=" %%v in ('%PY_CMD% --version 2^>^&1') do set "PY_VER=%%v"
echo [OK] Python: %PY_VER%
echo.

REM 5) Instalar dependencias leves/necessarias se o usuario quiser.
if exist "%NOELLE_ROOT%\yoru_chat\requirements\requirements_tts.txt" (
  echo Quer instalar/atualizar dependencias do TTS da Yoru agora? ^(edge-tts + pygame^)
  echo Recomendado se voce quer voz funcionando no chat.
  set /p "INSTALL_TTS=Instalar TTS? (S/N): "
  if /I "!INSTALL_TTS!"=="S" (
    pushd "%NOELLE_ROOT%\yoru_chat" >nul
    %PY_CMD% -m pip install -r requirements\requirements_tts.txt
    if errorlevel 1 (
      popd >nul
      echo [ERRO] Falha ao instalar dependencias TTS.
      pause
      exit /b 1
    )
    popd >nul
    echo [OK] Dependencias TTS instaladas.
  ) else (
    echo [INFO] Pulando instalacao TTS.
  )
)

echo.

REM 6) Se node_modules nao existe, oferecer npm install.
if not exist "%NOELLE_ROOT%\node_modules" (
  echo [AVISO] node_modules nao existe no Noelle.
  echo Sem isso, npm start pode falhar.
  set /p "NPM_INSTALL=Rodar npm install agora? (S/N): "
  if /I "!NPM_INSTALL!"=="S" (
    pushd "%NOELLE_ROOT%" >nul
    npm install
    if errorlevel 1 (
      popd >nul
      echo [ERRO] npm install falhou.
      pause
      exit /b 1
    )
    popd >nul
    echo [OK] npm install concluido.
  ) else (
    echo [INFO] Pulando npm install.
  )
)

echo.

REM 7) Aplicar patch.
echo [PASSO] Aplicando patch Yoru/Kobold no Noelle...
pushd "%NOELLE_ROOT%" >nul
node yoru_chat\noelle_kobold_replace\apply_noelle_kobold_replace_2026.cjs
if errorlevel 1 (
  popd >nul
  echo.
  echo [ERRO] O patch falhou.
  echo Veja as mensagens acima.
  pause
  exit /b 1
)
popd >nul

echo.
echo [PASSO] Rodando diagnostico...
pushd "%NOELLE_ROOT%" >nul
node yoru_chat\noelle_kobold_replace\diagnostico_noelle_kobold_replace_2026.cjs
if errorlevel 1 (
  popd >nul
  echo.
  echo [ERRO] Diagnostico falhou.
  echo Corrija o erro mostrado acima antes de abrir o Noelle.
  pause
  exit /b 1
)
popd >nul

echo.
echo ============================================================
echo  PRONTO
echo  O Noelle agora deve usar Yoru + KoboldCpp no chat.
echo ============================================================
echo.
echo Lembrete: o KoboldCpp precisa estar rodando para FAST/THINK responderem.
echo Dentro da Yoru voce pode usar /baixar status e /baixar tudo.
echo.
set /p "START_APP=Quer iniciar o Noelle agora com npm start? (S/N): "
if /I "%START_APP%"=="S" (
  pushd "%NOELLE_ROOT%" >nul
  npm start
  popd >nul
) else (
  echo.
  echo Para iniciar depois, rode na pasta do Noelle:
  echo npm start
)

echo.
pause
exit /b 0
