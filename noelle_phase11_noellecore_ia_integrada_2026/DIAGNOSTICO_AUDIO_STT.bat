@echo off
setlocal EnableExtensions
set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"

echo ==========================
echo Diagnostico Audio/STT Noelle
echo ==========================

echo Pasta atual:
echo %CD%
echo.

set "PY_CMD="
where py.exe >nul 2>nul && set "PY_CMD=py -3"
if not defined PY_CMD (
  where python.exe >nul 2>nul && set "PY_CMD=python"
)
if not defined PY_CMD (
  echo Python: NAO ENCONTRADO
  pause
  exit /b 1
)

echo Python:
%PY_CMD% --version

echo.
echo Dependencias:
%PY_CMD% -c "import faster_whisper, ctranslate2; print('faster_whisper OK'); print('ctranslate2 OK')"
if errorlevel 1 (
  echo.
  echo Dependencias ausentes. Rode PREPARAR_AUDIO_STT.bat
  pause
  exit /b 1
)

echo.
echo Script STT:
if exist "tools\noelle_stt\transcribe_audio.py" (echo transcribe_audio.py OK) else (echo transcribe_audio.py FALTANDO)
if exist "tools\noelle_stt\noelle_stt_worker.py" (echo noelle_stt_worker.py OK) else (echo noelle_stt_worker.py FALTANDO)

echo.
echo Diagnostico concluido.
pause
exit /b 0
