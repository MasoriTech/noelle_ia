@echo off
title Yoru Agent Runtime V24

echo ================================
echo Agent Identity Runtime Boot
echo ================================

echo Verificando ambiente Node...

if not exist node_modules (
  npm install
)

echo Iniciando aplicativo...
npm start