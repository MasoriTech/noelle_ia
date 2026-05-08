@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

set "ROOT=%~dp0"
set "NODE_SCRIPT=%ROOT%tools\noelle_v20_chat_texto_patch.cjs"

if not exist "%NODE_SCRIPT%" (
  echo [ERRO] Script nao encontrado: %NODE_SCRIPT%
  echo Extraia o pack inteiro antes de rodar este .bat.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado no PATH.
  echo Instale Node.js LTS e tente novamente.
  pause
  exit /b 1
)

echo ================================================================
echo  Noelle v20 - Aplicar Chat Texto + Diagnostico Ollama
echo ================================================================
echo  Modo seguro: faz backup antes de sobrescrever arquivos-alvo.
echo  Nao apaga arquivos antigos.
echo  Alvo padrao: .\noelle_app
echo ================================================================
echo.

node "%NODE_SCRIPT%" %*
set "ERR=%ERRORLEVEL%"

if not "%ERR%"=="0" (
  echo.
  echo [ERRO] Falha ao aplicar pack. Codigo: %ERR%
  pause
  exit /b %ERR%
)

echo.
echo [OK] Pack aplicado.
echo.
echo Proximos comandos:
echo   cd noelle_app
echo   iniciar.bat
echo.
pause
exit /b 0
