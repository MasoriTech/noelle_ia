@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

echo ================================================================
echo  Noelle v20 - Chat Texto Ollama
echo ================================================================
echo  1. Iniciar app
echo  2. Diagnostico Ollama/ambiente
echo  3. Instalar dependencias
echo  4. Limpar logs/cache leve
echo  5. Sair
echo ================================================================
set /p OP=Escolha uma opcao: 

if "%OP%"=="1" goto START
if "%OP%"=="2" goto DIAG
if "%OP%"=="3" goto INSTALL
if "%OP%"=="4" goto CLEAN
if "%OP%"=="5" exit /b 0

echo [AVISO] Opcao invalida.
pause
exit /b 1

:INSTALL
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERRO] npm nao encontrado. Instale Node.js LTS.
  pause
  exit /b 1
)
echo [INFO] Instalando dependencias...
npm install
pause
exit /b %ERRORLEVEL%

:DIAG
where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] node nao encontrado. Instale Node.js LTS.
  pause
  exit /b 1
)
node scripts\diagnostico.cjs
pause
exit /b %ERRORLEVEL%

:CLEAN
node scripts\limpar.cjs
pause
exit /b %ERRORLEVEL%

:START
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERRO] npm nao encontrado. Instale Node.js LTS.
  pause
  exit /b 1
)
if not exist node_modules (
  echo [INFO] node_modules nao encontrado. Instalando dependencias uma vez...
  npm install
  if errorlevel 1 (
    echo [ERRO] npm install falhou.
    pause
    exit /b 1
  )
)
echo [INFO] Iniciando Noelle v20...
npm run start:v20
pause
exit /b %ERRORLEVEL%
