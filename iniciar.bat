
@echo off
title Noelle Companion 2026

echo ================================
echo Boot Runtime Tabs V20
echo ================================

if not exist node_modules (
  echo Instalando dependencias...
  npm install
)

echo Iniciando app...
npm start
