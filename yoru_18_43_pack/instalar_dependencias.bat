@echo off
chcp 65001 >nul
title Yoru - Instalar Dependencias / Download Center
cd /d "%~dp0"

echo ===============================================================
echo  Yoru Bridge Modern 1.8.38 - Instalar Dependencias
echo ===============================================================
echo.
python -m pip install --upgrade pip
python -m pip install -r requirements\requirements_mega.txt

echo.
echo Para baixar/verificar modelos e KoboldCpp, use:
echo   python -m yoru_bridge text
echo   /baixar status
echo   /baixar tudo
echo.
pause
