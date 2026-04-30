@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

:title
cls
echo ================================================================
echo  Noelle/Yoru Companion 2026 - Iniciador unico V19.8.10
echo ================================================================
echo.
echo  [1] Iniciar programa agora
echo  [2] Rodar diagnostico V19.8.10 Temas
echo  [3] Reparar/aplicar Mega Temas Yoru Ember V19.8.10
echo  [4] Mostrar status do projeto
echo  [5] Limpar outros .bat antigos ^(mover para backup seguro^)
echo  [6] Excluir outros .bat antigos permanentemente
echo  [0] Sair
echo.
set /p OP=Escolha uma opcao: 

if "%OP%"=="1" goto START_ONLY
if "%OP%"=="2" goto DIAG
if "%OP%"=="3" goto REPAIR
if "%OP%"=="4" goto STATUS
if "%OP%"=="5" goto CLEAN_SAFE
if "%OP%"=="6" goto CLEAN_DELETE
if "%OP%"=="0" goto END

echo.
echo [ERRO] Opcao invalida.
pause
goto title

:START_ONLY
cls
echo ================================================================
echo  Iniciando programa agora
echo ================================================================
echo [INFO] Esta opcao nao aplica patch, nao roda build e nao reescreve arquivos.
echo.
if not exist package.json (
  echo [ERRO] package.json nao encontrado. Rode este .bat na raiz do projeto.
  pause
  goto title
)
where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [ERRO] npm.cmd nao encontrado no PATH. Instale Node.js ou abra um terminal com Node configurado.
  pause
  goto title
)
call npm.cmd start
set EXITCODE=%ERRORLEVEL%
echo.
echo [INFO] Programa encerrado com codigo %EXITCODE%.
pause
goto title

:DIAG
cls
echo ================================================================
echo  Diagnostico V19.8.10 Temas
echo ================================================================
if not exist scripts\diagnostico_v19_8_10_yoru_ember_themes_2026.cjs (
  echo [ERRO] Script de diagnostico nao encontrado.
  pause
  goto title
)
node scripts\diagnostico_v19_8_10_yoru_ember_themes_2026.cjs
if errorlevel 1 (
  echo.
  echo [ERRO] Diagnostico encontrou problemas.
) else (
  echo.
  echo [OK] Diagnostico aprovado.
)
pause
goto title

:REPAIR
cls
echo ================================================================
echo  Reparar/aplicar Mega Temas Yoru Ember V19.8.10
echo ================================================================
if not exist scripts\repair_v19_8_10_yoru_ember_themes_2026.cjs (
  echo [ERRO] Script de reparo nao encontrado.
  pause
  goto title
)
node scripts\repair_v19_8_10_yoru_ember_themes_2026.cjs
if errorlevel 1 (
  echo.
  echo [ERRO] Reparo falhou.
  pause
  goto title
)
echo.
echo [INFO] Rodando diagnostico apos reparo...
node scripts\diagnostico_v19_8_10_yoru_ember_themes_2026.cjs
if errorlevel 1 (
  echo.
  echo [ERRO] Diagnostico pos-reparo falhou.
) else (
  echo.
  echo [OK] Reparo e diagnostico aprovados.
)
pause
goto title

:STATUS
cls
if exist scripts\status_v19_8_10_yoru_ember_themes_2026.cjs (
  node scripts\status_v19_8_10_yoru_ember_themes_2026.cjs
) else (
  echo [AVISO] Script de status nao encontrado.
  if exist package.json type package.json | findstr /i "version"
)
pause
goto title

:CLEAN_SAFE
cls
echo ================================================================
echo  Limpeza segura de .bat antigos
echo ================================================================
set "BACKUP_DIR=backups\bat_cleanup_%DATE:/=-%_%TIME::=-%"
set "BACKUP_DIR=%BACKUP_DIR: =0%"
mkdir "%BACKUP_DIR%" >nul 2>nul
set MOVED=0
for %%F in (*.bat) do (
  if /I not "%%~nxF"=="iniciar.bat" (
    echo [INFO] Movendo %%~nxF para %BACKUP_DIR%
    move /Y "%%~fF" "%BACKUP_DIR%\%%~nxF" >nul
    set /a MOVED+=1
  )
)
echo.
echo [OK] Arquivos movidos: !MOVED!
echo [INFO] Backup: %BACKUP_DIR%
pause
goto title

:CLEAN_DELETE
cls
echo ================================================================
echo  Excluir .bat antigos permanentemente
echo ================================================================
echo [CUIDADO] Isto apaga todos os .bat da raiz, exceto iniciar.bat.
set /p CONF=Digite EXCLUIR para confirmar: 
if /I not "%CONF%"=="EXCLUIR" (
  echo [INFO] Operacao cancelada.
  pause
  goto title
)
set DELETED=0
for %%F in (*.bat) do (
  if /I not "%%~nxF"=="iniciar.bat" (
    echo [INFO] Excluindo %%~nxF
    del /F /Q "%%~fF" >nul
    set /a DELETED+=1
  )
)
echo.
echo [OK] Arquivos excluidos: !DELETED!
pause
goto title

:END
endlocal
exit /b 0
