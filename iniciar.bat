@echo off
title Stream V19.8.35 TTS Existing Only

echo ========================================
echo  Stream V19.8.35 TTS Existing Only
echo ========================================
echo.

node scripts\apply_stream_v19_8_35.js

echo.
echo [checkup stream v19.8.35]
node scripts\checkup_stream_v19_8_35.js

echo.
echo Iniciando aplicativo...
npm start
