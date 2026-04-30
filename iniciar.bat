@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

:MENU
cls
echo ================================================================
echo  Noelle Companion 2026 - V19.8.7 Purge Avatar legado
echo ================================================================
echo.
echo [1] Iniciar programa agora
echo [2] Rodar diagnostico V19.8.7
echo [3] Apagar/remover do codigo ativo o Avatar legado V19.7.6
echo [4] Mostrar status do projeto
echo [5] Limpar outros .bat antigos ^(mover para backup seguro^)
echo [0] Sair
echo.
set /p OP=Escolha: 
if "%OP%"=="1" goto START_APP
if "%OP%"=="2" goto DIAG
if "%OP%"=="3" goto REPAIR
if "%OP%"=="4" goto STATUS
if "%OP%"=="5" goto CLEAN_BATS
if "%OP%"=="0" goto END
goto MENU

:START_APP
echo.
echo [START] Iniciando Noelle Companion...
if exist node_modules\.bin\electron.cmd (
  call npm.cmd start
) else (
  echo [AVISO] Electron local nao encontrado em node_modules.
  echo [INFO] Rode npm install se o start falhar.
  call npm.cmd start
)
echo.
pause
goto MENU

:DIAG
echo.
node scripts\diagnostico_v19_8_7_purge_legacy_avatar_2026.cjs
if errorlevel 1 (
  echo.
  echo [ERRO] Diagnostico encontrou problemas.
) else (
  echo.
  echo [OK] Diagnostico aprovado.
)
pause
goto MENU

:REPAIR
echo.
node scripts\repair_v19_8_7_purge_legacy_avatar_2026.cjs
if errorlevel 1 (
  echo.
  echo [ERRO] Reparo falhou.
  pause
  goto MENU
)
echo.
node scripts\diagnostico_v19_8_7_purge_legacy_avatar_2026.cjs
if errorlevel 1 (
  echo.
  echo [ERRO] Diagnostico pos-reparo falhou.
) else (
  echo.
  echo [OK] Purge aprovado. O Avatar legado V19.7.6 saiu do codigo ativo.
)
pause
goto MENU

:STATUS
echo.
node scripts\status_v19_8_7_purge_legacy_avatar_2026.cjs
pause
goto MENU

:CLEAN_BATS
set BACKUP=backups\bat_cleanup_%DATE:~-4%%DATE:~3,2%%DATE:~0,2%_%TIME:~0,2%%TIME:~3,2%%TIME:~6,2%
set BACKUP=%BACKUP: =0%
mkdir "%BACKUP%" >nul 2>nul
for %%F in (*.bat) do (
  if /I not "%%~nxF"=="iniciar.bat" (
    echo [OK] Movendo %%~nxF para %BACKUP%
    move "%%~fF" "%BACKUP%\" >nul
  )
)
echo [OK] Limpeza concluida. Backup: %BACKUP%
pause
goto MENU

:END
endlocal
exit /b 0
