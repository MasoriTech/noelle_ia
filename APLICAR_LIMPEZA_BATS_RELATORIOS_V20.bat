@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"

echo ================================================================
echo  Noelle v20 - Limpeza segura de .bat e relatorios
echo ================================================================
echo  Este script NAO apaga nada.
echo  Ele move duplicados para _archive\v20_limpeza_bats_relatorios_*.
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado no PATH.
  echo Instale o Node.js ou abra o terminal correto e tente de novo.
  pause
  exit /b 1
)

node tools\noelle_v20_limpar_bats_relatorios.cjs %*
set EXITCODE=%ERRORLEVEL%
echo.
if "%EXITCODE%"=="0" (
  echo [OK] Limpeza finalizada.
) else (
  echo [ERRO] A limpeza terminou com falha. Codigo: %EXITCODE%
)
pause
exit /b %EXITCODE%
