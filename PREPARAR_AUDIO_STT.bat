@echo off
setlocal EnableExtensions
set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"

echo ==========================
echo Preparando audio local da Noelle
echo faster-whisper / CTranslate2
echo ==========================

set "PY_CMD="
where py.exe >nul 2>nul && set "PY_CMD=py -3"
if not defined PY_CMD (
  where python.exe >nul 2>nul && set "PY_CMD=python"
)
if not defined PY_CMD (
  echo Python nao encontrado. Instale Python 3.10+ e marque Add to PATH.
  pause
  exit /b 1
)

if not exist "tools\noelle_stt\requirements.txt" (
  echo requirements.txt do STT nao encontrado.
  echo Verifique se o patch foi colado na pasta principal da Noelle.
  pause
  exit /b 1
)

echo Atualizando pip...
%PY_CMD% -m pip install --upgrade pip
if errorlevel 1 goto :erro

echo Instalando dependencias do STT...
%PY_CMD% -m pip install -r tools\noelle_stt\requirements.txt
if errorlevel 1 goto :erro

echo.
echo Audio local preparado.
echo O modelo medium sera baixado/cacheado no primeiro uso do microfone.
pause
exit /b 0

:erro
echo.
echo Falha ao instalar dependencias do STT.
echo Tente abrir o terminal como usuario normal e rode:
echo %PY_CMD% -m pip install -r tools\noelle_stt\requirements.txt
pause
exit /b 1
