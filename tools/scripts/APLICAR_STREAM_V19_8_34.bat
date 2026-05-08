@echo off
setlocal EnableExtensions
cd /d "%~dp0"
echo ============================================================
echo  Aplicar Noelle Stream V19.8.34 - abas reforcadas
echo ============================================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado no PATH.
  pause
  exit /b 1
)
if not exist package.json (
  echo [ERRO] Copie o conteudo deste pack para a raiz do projeto noelle_ia.
  pause
  exit /b 1
)
node scripts\patch_stream_v19_8_34_2026.cjs
if errorlevel 1 (
  echo [ERRO] Patch falhou.
  pause
  exit /b 1
)
echo.
node scripts\diagnostico_stream_v19_8_34_2026.cjs
if errorlevel 1 (
  echo [ERRO] Diagnostico falhou.
  pause
  exit /b 1
)
echo.
echo [OK] Stream V19.8.34 aplicada. Agora rode iniciar.bat.
pause
exit /b 0
