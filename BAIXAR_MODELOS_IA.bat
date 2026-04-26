@echo off
setlocal
title NoelleCore IA - Baixar modelos Ollama
cd /d "%~dp0"
:menu
cls
echo =========================================================
echo  NoelleCore IA - baixar modelos separados
echo =========================================================
echo.
echo  1. Baixar Qwen3 0.6B FAST principal
echo  2. Baixar Gemma 4 E2B opcional
echo  3. Baixar Hermes 3B opcional
echo  4. Listar modelos instalados
echo  5. Remover Gemma
echo  6. Remover Hermes
echo  7. Diagnostico Ollama
echo  0. Sair
echo.
set /p op=Escolha: 

if "%op%"=="1" goto qwen
if "%op%"=="2" goto gemma
if "%op%"=="3" goto hermes
if "%op%"=="4" goto list
if "%op%"=="5" goto rmgemma
if "%op%"=="6" goto rmhermes
if "%op%"=="7" goto diag
if "%op%"=="0" exit /b 0
goto menu

:qwen
ollama pull qwen3:0.6b
pause
goto menu

:gemma
echo ATENCAO: Gemma 4 E2B pode ser pesado em disco/RAM dependendo do pacote.
ollama pull gemma4:e2b
pause
goto menu

:hermes
echo ATENCAO: Hermes 3B e opcional e pode pesar em PC fraco.
ollama pull hermes3:3b
pause
goto menu

:list
ollama list
pause
goto menu

:rmgemma
ollama rm gemma4:e2b
pause
goto menu

:rmhermes
ollama rm hermes3:3b
pause
goto menu

:diag
where ollama
echo.
ollama list
echo.
ollama ps
pause
goto menu
