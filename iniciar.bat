@echo off
title Yoru Avatar Runtime V31.1

echo ========================================
echo  Yoru Avatar Runtime V31.1 Direct Carousel
echo ========================================
echo.

node scripts\apply_avatar_runtime_v31_1.js

echo.
echo [diagnostico avatar]
node scripts\diagnose_avatar_runtime_v31_1.js

echo.
echo Iniciando aplicativo...
npm start
