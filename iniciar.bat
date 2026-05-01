@echo off
title Avatar Megapack Design V39.2 Robust

echo ========================================
echo  Avatar Megapack Design V39.2 Robust
echo ========================================
echo.

node scripts\apply_avatar_megapack_design_v39_2.js

echo.
echo [diagnostico avatar v39.2]
node scripts\diagnose_avatar_megapack_design_v39_2.js

echo.
echo Iniciando aplicativo...
npm start
