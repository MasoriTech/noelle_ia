@echo off
title Stream V19.8.36 Turn History Existing Only

echo ========================================
echo  Stream V19.8.36 Turn History Existing Only
echo ========================================
echo.

node scripts\apply_stream_v19_8_36.js

echo.
echo [checkup stream v19.8.36]
node scripts\checkup_stream_v19_8_36.js

echo.
echo Iniciando aplicativo...
npm start
