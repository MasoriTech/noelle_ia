@echo off
setlocal EnableExtensions
title Noelle Companion 2026 - V19.8.3a

:menu
cls
echo ================================================================
echo  Noelle Companion 2026 - iniciar.bat unico
echo  V19.8.3a Preview LoadFile + Resize Fix
echo ================================================================
echo.
echo [1] Iniciar programa agora
echo [2] Rodar diagnostico V19.8.3a
echo [3] Reparar/aplicar V19.8.3a Preview LoadFile + Resize
echo [4] Regerar manifest/bundles do Avatar se existirem scripts
echo [5] Limpar outros .bat antigos ^(mover para backup seguro^)
echo [6] Excluir outros .bat antigos permanentemente
echo [7] Mostrar status basico
echo [0] Sair
echo.
set /p op=Escolha: 

if "%op%"=="1" goto start
if "%op%"=="2" goto diag
if "%op%"=="3" goto repair
if "%op%"=="4" goto build
if "%op%"=="5" goto cleanup_safe
if "%op%"=="6" goto cleanup_delete
if "%op%"=="7" goto status
if "%op%"=="0" exit /b 0
goto menu

:start
cls
echo ================================================================
echo  Iniciando Noelle Companion 2026
echo ================================================================
echo.
if not exist package.json (
  echo [ERRO] package.json nao encontrado. Rode este .bat na raiz do noelle_ia.
  pause
  goto menu
)
if not exist node_modules (
  echo [AVISO] node_modules nao encontrado.
  echo Rode npm install antes de iniciar.
  pause
  goto menu
)
call npm.cmd start
echo.
echo [INFO] Processo finalizado.
pause
goto menu

:diag
cls
echo ================================================================
echo  Diagnostico V19.8.3a
echo ================================================================
echo.
call node scripts\diagnostico_v19_8_3a_preview_resize_fix_2026.cjs
echo.
pause
goto menu

:repair
cls
echo ================================================================
echo  Reparar/aplicar V19.8.3a
echo ================================================================
echo.
call node scripts\repair_v19_8_3a_preview_resize_fix_2026.cjs
if errorlevel 1 (
  echo.
  echo [ERRO] Reparo falhou.
  pause
  goto menu
)
echo.
call node scripts\diagnostico_v19_8_3a_preview_resize_fix_2026.cjs
echo.
pause
goto menu

:build
cls
echo ================================================================
echo  Regerar manifest/bundles do Avatar
echo ================================================================
echo.
if exist scripts\repair_v19_8_1d_manifest_forte_2026.cjs (
  call node scripts\repair_v19_8_1d_manifest_forte_2026.cjs
) else (
  echo [AVISO] Script de manifest V19.8.1d nao encontrado.
)
if exist scripts\build_avatar_preview_v19_8_2_2026.cjs (
  call node scripts\build_avatar_preview_v19_8_2_2026.cjs
) else (
  echo [AVISO] Script build Avatar V19.8.2 nao encontrado.
)
echo.
pause
goto menu

:cleanup_safe
cls
echo ================================================================
echo  Limpar outros .bat antigos - mover para backup seguro
echo ================================================================
echo.
set "STAMP=%DATE:/=-%_%TIME::=-%"
set "STAMP=%STAMP: =0%"
set "BKP=backups\bat_cleanup_%STAMP%"
mkdir "%BKP%" >nul 2>nul
for %%F in (*.bat) do (
  if /I not "%%~nxF"=="iniciar.bat" (
    echo [MOVE] %%~nxF
    move "%%~fF" "%BKP%\" >nul
  )
)
echo.
echo [OK] .bat antigos movidos para %BKP%
pause
goto menu

:cleanup_delete
cls
echo ================================================================
echo  Excluir outros .bat antigos permanentemente
echo ================================================================
echo.
echo Isto apaga todos os .bat da raiz, exceto iniciar.bat.
set /p confirm=Digite SIM para confirmar: 
if /I not "%confirm%"=="SIM" goto menu
for %%F in (*.bat) do (
  if /I not "%%~nxF"=="iniciar.bat" (
    echo [DEL] %%~nxF
    del /f /q "%%~fF"
  )
)
echo [OK] Limpeza concluida.
pause
goto menu

:status
cls
echo ================================================================
echo  Status basico
echo ================================================================
echo.
echo Pasta atual:
cd
echo.
if exist package.json (
  node -e "const p=require('./package.json'); console.log('package.json version:', p.version); console.log('scripts:', Object.keys(p.scripts||{}).filter(k=>k.includes('v19.8')).join(', ') || '(sem scripts v19.8)')"
) else (
  echo [ERRO] package.json ausente.
)
echo.
if exist preload.js (
  echo [OK] preload.js existe.
) else (
  echo [ERRO] preload.js ausente.
)
if exist src\assets\avatar_manifest.json (
  node -e "const fs=require('fs'); const m=JSON.parse(fs.readFileSync('src/assets/avatar_manifest.json','utf8')); console.log('avatar_manifest:', Array.isArray(m)?m.length+' entrada(s)':'formato invalido')"
) else (
  echo [AVISO] avatar_manifest.json ausente.
)
echo.
pause
goto menu
