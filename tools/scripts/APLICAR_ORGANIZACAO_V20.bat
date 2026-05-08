@echo off
setlocal
chcp 65001 >nul

echo ================================================================
echo  Noelle v20 - Organizador Seguro
echo ================================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado no PATH.
  echo Instale o Node.js ou abra o terminal correto do projeto.
  pause
  exit /b 1
)

node "%~dp0tools\noelle_v20_organizar.cjs" %*
set EXITCODE=%ERRORLEVEL%

echo.
if "%EXITCODE%"=="0" (
  echo [OK] Organizador finalizado.
) else (
  echo [ERRO] Organizador terminou com codigo %EXITCODE%.
)

pause
exit /b %EXITCODE%
