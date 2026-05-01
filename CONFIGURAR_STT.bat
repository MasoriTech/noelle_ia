@echo off
title Configurar STT da Stream

echo ========================================
echo  Configurar STT da Stream - V19.8.39
echo ========================================
echo.

node scripts\configure_stream_stt_v19_8_39.js %*

echo.
node scripts\checkup_stream_stt_backend_v19_8_39.js

echo.
pause
