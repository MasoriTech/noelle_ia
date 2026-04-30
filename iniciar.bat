@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
chcp 65001 >nul

:MENU
cls
echo ================================================================
echo  Noelle Companion 2026 - Inicializador unico V19.8.6
echo ================================================================
echo.
echo [1] Iniciar programa agora
echo [2] Rodar diagnostico V19.8.6 Overlay Killer
echo [3] Reparar/aplicar V19.8.6 Overlay Killer
echo [4] Regerar manifest/bundles do Avatar ^(se scripts existirem^)
echo [5] Limpar outros .bat antigos ^(mover para backup seguro^)
echo [6] Excluir outros .bat antigos permanentemente
echo [7] Mostrar status V19.8.6
echo [0] Sair
echo.
set /p OP=Escolha uma opcao: 

if "%OP%"=="1" goto START_APP
if "%OP%"=="2" goto DIAG
if "%OP%"=="3" goto REPAIR
if "%OP%"=="4" goto BUILD_AVATAR
if "%OP%"=="5" goto CLEAN_BATS
if "%OP%"=="6" goto DELETE_BATS
if "%OP%"=="7" goto STATUS
if "%OP%"=="0" goto END

echo [ERRO] Opcao invalida.
pause
goto MENU

:START_APP
cls
echo ================================================================
echo  Iniciando Noelle Companion 2026
echo ================================================================
echo [INFO] Opcao 1 nao aplica patch, nao roda build e nao reescreve arquivos.
where node >nul 2>nul
if errorlevel 1 (
  echo [ERRO] Node.js nao encontrado no PATH.
  pause
  goto MENU
)
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [ERRO] npm.cmd nao encontrado no PATH.
  pause
  goto MENU
)
if not exist package.json (
  echo [ERRO] package.json nao encontrado. Rode este .bat na raiz do projeto.
  pause
  goto MENU
)
if not exist node_modules\electron (
  echo [AVISO] Electron local nao encontrado em node_modules.
  echo [INFO] Rode npm install manualmente, ou use a opcao de reparo se seu projeto exigir.
)
call npm.cmd start
if errorlevel 1 (
  echo.
  echo [ERRO] npm start falhou com codigo %errorlevel%.
  pause
)
goto MENU

:DIAG
cls
echo ================================================================
echo  Diagnostico V19.8.6 Overlay Killer
echo ================================================================
node scripts\diagnostico_v19_8_6_overlay_launcher_killer_2026.cjs
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
cls
echo ================================================================
echo  Reparar/aplicar V19.8.6 Overlay Killer
echo ================================================================
node scripts\repair_v19_8_6_overlay_launcher_killer_2026.cjs
if errorlevel 1 (
  echo.
  echo [ERRO] Reparo falhou.
  pause
  goto MENU
)
echo.
echo [INFO] Rodando diagnostico pos-reparo...
node scripts\diagnostico_v19_8_6_overlay_launcher_killer_2026.cjs
if errorlevel 1 (
  echo.
  echo [ERRO] Diagnostico pos-reparo falhou.
  pause
  goto MENU
)
echo.
echo [OK] Reparo V19.8.6 aplicado e diagnosticado.
pause
goto MENU

:BUILD_AVATAR
cls
echo ================================================================
echo  Regerar manifest/bundles do Avatar
echo ================================================================
if exist scripts\repair_v19_8_1d_manifest_forte_2026.cjs (
  echo [INFO] Reparando manifest V19.8.1d...
  node scripts\repair_v19_8_1d_manifest_forte_2026.cjs
  if errorlevel 1 (
    echo [ERRO] Reparo de manifest falhou.
    pause
    goto MENU
  )
) else (
  echo [AVISO] Script de manifest V19.8.1d nao encontrado. Pulando.
)

if exist scripts\build_avatar_preview_v19_8_2_2026.cjs (
  echo [INFO] Gerando bundle Preview V19.8.2...
  node scripts\build_avatar_preview_v19_8_2_2026.cjs
  if errorlevel 1 (
    echo [ERRO] Build de preview falhou.
    pause
    goto MENU
  )
) else (
  echo [AVISO] Script build_avatar_preview_v19_8_2_2026.cjs nao encontrado. Pulando.
)

echo [OK] Etapa de manifest/bundles finalizada.
pause
goto MENU

:CLEAN_BATS
cls
echo ================================================================
echo  Mover outros .bat antigos para backup seguro
echo ================================================================
set BK=backups\bat_cleanup_%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set BK=%BK: =0%
mkdir "%BK%" >nul 2>nul
set MOVED=0
for %%F in (*.bat) do (
  if /I not "%%~nxF"=="iniciar.bat" (
    echo [INFO] Movendo %%~nxF para %BK%\
    move /Y "%%~fF" "%BK%\%%~nxF" >nul
    set /a MOVED+=1
  )
)
if "%MOVED%"=="0" echo [OK] Nenhum outro .bat encontrado.
if not "%MOVED%"=="0" echo [OK] %MOVED% .bat movido(s) para %BK%.
pause
goto MENU

:DELETE_BATS
cls
echo ================================================================
echo  Excluir outros .bat antigos permanentemente
echo ================================================================
echo [ATENCAO] Isto apaga todos os .bat da raiz, exceto iniciar.bat.
set /p CONF=Digite EXCLUIR para confirmar: 
if /I not "%CONF%"=="EXCLUIR" (
  echo [INFO] Cancelado.
  pause
  goto MENU
)
for %%F in (*.bat) do (
  if /I not "%%~nxF"=="iniciar.bat" (
    echo [INFO] Excluindo %%~nxF
    del /F /Q "%%~fF"
  )
)
echo [OK] Limpeza permanente finalizada.
pause
goto MENU

:STATUS
cls
echo ================================================================
echo  Status V19.8.6
echo ================================================================
node scripts\status_v19_8_6_overlay_launcher_killer_2026.cjs
pause
goto MENU

:END
endlocal
exit /b 0
