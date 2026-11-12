@echo off
chcp 65001 >nul
title Desinstalar Gestao de Casamentos do Computador
cd /d "%~dp0"

echo Removendo atalhos e inicializacao automatica...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Remove-Item -Force -ErrorAction SilentlyContinue (Join-Path ([Environment]::GetFolderPath('Desktop')) 'Gestao de Casamentos.lnk');" ^
  "Remove-Item -Force -Recurse -ErrorAction SilentlyContinue (Join-Path ([Environment]::GetFolderPath('Programs')) 'Gestao de Casamentos');" ^
  "Remove-Item -Force -ErrorAction SilentlyContinue (Join-Path ([Environment]::GetFolderPath('Startup')) 'Gestao de Casamentos - Servidor.lnk');" ^
  "Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"

echo.
echo Atalhos removidos e servidor encerrado. Seus dados (banco de dados) NAO foram apagados.
pause
