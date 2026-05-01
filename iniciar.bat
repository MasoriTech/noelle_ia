@echo off
title Avatar Design V39.4 Hardened

echo ========================================
echo  Avatar Design V39.4 Hardened
echo ========================================
echo.

node scripts\apply_avatar_design_v39_4.js

echo.
echo [diagnostico avatar v39.4]
node scripts\diagnose_avatar_design_v39_4.js

echo.
echo Iniciando aplicativo...
npm start
