@echo off
title VELUM Produccion - server (no cerrar esta ventana)
cd /d "C:\Users\Nissei\Velum\app"
echo Iniciando VELUM Produccion en http://0.0.0.0:3001 ...
npm start -- -H 0.0.0.0 -p 3001
echo.
echo El server se detuvo. Revisa el error de arriba.
pause
