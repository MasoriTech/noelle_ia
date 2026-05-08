@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "PYTHONPATH=%CD%\src;%PYTHONPATH%"
python -m yoru_bridge.menu
pause
