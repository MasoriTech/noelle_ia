@echo off
title Stream V19.8.39 STT Backend Setup

echo ========================================
echo  Stream V19.8.39 STT Backend Setup
echo ========================================
echo.

node scripts\apply_stream_v19_8_39.js

echo.
echo Iniciando aplicativo...
npm start
