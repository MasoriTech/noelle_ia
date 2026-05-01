@echo off
setlocal EnableExtensions
cd /d "%~dp0"
echo ============================================================
echo  Aplicar Noelle Stream V19.8.33
echo ============================================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado no PATH.
  pause
  exit /b 1
)
if not exist src\renderer\pages\noelle_stream_page_v19_8_29.js (
  echo [ERRO] Rode este BAT na raiz do projeto noelle_ia.
  pause
  exit /b 1
)
if not exist backups mkdir backups
set BK=backups\stream_v19_8_33_%DATE:/=-%_%TIME::=-%
set BK=%BK: =_%
mkdir "%BK%" >nul 2>nul
copy /Y src\renderer\pages\noelle_stream_page_v19_8_29.js "%BK%\noelle_stream_page_v19_8_29.js.bak" >nul 2>nul
copy /Y src\renderer\modules\noelle_stream_audio_capture_v19_8_30.js "%BK%\noelle_stream_audio_capture_v19_8_30.js.bak" >nul 2>nul
copy /Y src\renderer\modules\noelle_stream_vad_v19_8_31.js "%BK%\noelle_stream_vad_v19_8_31.js.bak" >nul 2>nul
copy /Y src\renderer\modules\noelle_stream_segment_recorder_v19_8_32.js "%BK%\noelle_stream_segment_recorder_v19_8_32.js.bak" >nul 2>nul
echo [OK] Backup criado em %BK%
echo.
node scripts\diagnostico_stream_v19_8_33_2026.cjs
if errorlevel 1 (
  echo [ERRO] Diagnostico falhou.
  pause
  exit /b 1
)
echo.
echo [OK] Stream V19.8.33 aplicada. Agora rode iniciar.bat.
pause
exit /b 0
