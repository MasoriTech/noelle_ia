@echo off
title Avatar V41.2 Scene Room Scale Fix

echo ========================================
echo  Avatar V41.2 Scene Room Scale Fix
echo ========================================
echo.

echo [1/2] Aplicando ajuste de escala do cenario...
node scripts\apply_avatar_v41_2_scene_scale.js
if errorlevel 1 goto :fail

echo.
echo [2/2] Checkup...
node scripts\checkup_avatar_v41_2_scene_scale.js

echo.
echo Iniciando aplicativo...
npm start
goto :end

:fail
echo.
echo Falha ao aplicar o patch v41.2.
pause

:end
