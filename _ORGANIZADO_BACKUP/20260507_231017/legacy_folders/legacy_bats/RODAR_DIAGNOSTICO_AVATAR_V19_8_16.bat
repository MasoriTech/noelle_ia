@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
node scripts\diagnostico_v19_8_16_find_avatar_target_2026.cjs
pause
endlocal
