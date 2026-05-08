@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
echo ================================================================
echo  Noelle Companion - Diagnostico de abas duplicadas V19.8.37
echo ================================================================
echo.
if not exist package.json (
  echo [ERRO] Copie o conteudo deste pack para a raiz do projeto noelle_ia.
  echo        Esta pasta precisa ter package.json e src\
  pause
  exit /b 1
)
node scripts\diagnostico_abas_duplicadas_v19_8_37.cjs
echo.
echo Relatorio salvo em diagnostics\tabs_duplicates_v19_8_37.txt
echo Este pack NAO altera nenhum arquivo.
pause
