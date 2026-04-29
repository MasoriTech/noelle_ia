@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"

:MENU
cls
echo ================================================================
echo  Noelle Companion 2026 - V19.8.2 Avatar Real
echo ================================================================
echo [1] Iniciar programa agora
echo [2] Rodar diagnostico V19.8.2
echo [3] Reparar/aplicar Aba Avatar Real V19.8.2
echo [4] Gerar/regerar bundle do Avatar Preview
echo [5] Limpar outros .bat antigos ^(mover para backup seguro^)
echo [6] Excluir outros .bat antigos permanentemente
echo [7] Mostrar status do projeto
echo [0] Sair
echo.
set /p OP=Escolha: 
if "%OP%"=="1" goto START_APP
if "%OP%"=="2" goto DIAG
if "%OP%"=="3" goto REPAIR
if "%OP%"=="4" goto BUILD_AVATAR
if "%OP%"=="5" goto CLEAN_BATS
if "%OP%"=="6" goto DELETE_BATS
if "%OP%"=="7" goto STATUS
if "%OP%"=="0" goto END
goto MENU

:START_APP
echo.
echo [START] Iniciando Noelle Companion 2026...
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERRO] npm nao encontrado no PATH. Instale Node.js LTS e tente novamente.
  pause
  goto MENU
)
call npm.cmd start
if errorlevel 1 (
  echo [ERRO] npm start falhou com codigo %errorlevel%.
  pause
)
goto MENU

:DIAG
echo.
echo ================================================================
echo  Diagnostico V19.8.2
echo ================================================================
node scripts\diagnostico_v19_8_2_avatar_real_2026.cjs
if errorlevel 1 (
  echo.
  echo [ERRO] Diagnostico encontrou problemas.
  pause
  goto MENU
)
echo.
echo [OK] Diagnostico aprovado.
pause
goto MENU

:REPAIR
echo.
echo ================================================================
echo  Reparar/aplicar Aba Avatar Real V19.8.2
echo ================================================================
node scripts\repair_v19_8_2_avatar_real_2026.cjs
if errorlevel 1 (
  echo [ERRO] Reparo falhou.
  pause
  goto MENU
)
node scripts\diagnostico_v19_8_2_avatar_real_2026.cjs
if errorlevel 1 (
  echo [ERRO] Diagnostico pos-reparo encontrou problemas.
  pause
  goto MENU
)
echo [OK] Reparo V19.8.2 aplicado e diagnostico aprovado.
pause
goto MENU

:BUILD_AVATAR
echo.
echo ================================================================
echo  Build Avatar Preview V19.8.2
echo ================================================================
node scripts\build_avatar_preview_v19_8_2_2026.cjs
if errorlevel 1 (
  echo [ERRO] Build do Avatar Preview falhou.
  pause
  goto MENU
)
echo [OK] Bundle do Avatar Preview gerado.
pause
goto MENU

:CLEAN_BATS
echo.
echo [INFO] Movendo .bat antigos para backup seguro...
set "BK=backups\bat_cleanup_%DATE:/=-%_%TIME::=-%"
set "BK=%BK: =0%"
mkdir "%BK%" >nul 2>nul
for %%F in (*.bat) do (
  if /I not "%%~nxF"=="iniciar.bat" (
    echo [MOVE] %%~nxF -^> %BK%\%%~nxF
    move /Y "%%~fF" "%BK%\%%~nxF" >nul
  )
)
echo [OK] Limpeza concluida. Backup: %BK%
pause
goto MENU

:DELETE_BATS
echo.
echo [AVISO] Isto apaga permanentemente todos os .bat da raiz, exceto iniciar.bat.
set /p CONF=Digite APAGAR para confirmar: 
if /I not "%CONF%"=="APAGAR" goto MENU
for %%F in (*.bat) do (
  if /I not "%%~nxF"=="iniciar.bat" (
    echo [DEL] %%~nxF
    del /F /Q "%%~fF"
  )
)
echo [OK] .bat antigos excluidos.
pause
goto MENU

:STATUS
node scripts\status_v19_8_2_avatar_real_2026.cjs
pause
goto MENU

:END
endlocal
exit /b 0
