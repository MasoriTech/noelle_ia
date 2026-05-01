@echo off
title Avatar Owner Width V38.1

echo ========================================
echo  Avatar Owner Width V38.1
echo ========================================
echo.

node scripts\apply_avatar_owner_width_v38_1.js

echo.
echo [diagnostico avatar width]
node scripts\diagnose_avatar_owner_width_v38_1.js

echo.
echo Iniciando aplicativo...
npm start
