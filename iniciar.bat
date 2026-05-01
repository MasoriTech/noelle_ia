@echo off
title Yoru Renderer Restructure V30

echo ========================================
echo  Yoru Renderer Restructure V30
echo ========================================
echo.

node scripts\apply_renderer_restructure_v30.js

echo.
echo [diagnostico renderer]
node scripts\diagnose_renderer_structure_v30.js

echo.
echo Iniciando aplicativo...
npm start
