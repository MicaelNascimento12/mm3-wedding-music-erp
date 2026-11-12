@echo off
chcp 65001 >nul
title Preparar Gestao de Casamentos neste computador
cd /d "%~dp0"

echo ============================================================================
echo   PREPARANDO O "GESTAO DE CASAMENTOS" NESTE COMPUTADOR
echo ============================================================================
echo.

where python >nul 2>&1
if errorlevel 1 (
  echo [FALTA] Python nao encontrado.
  echo         Instale em https://www.python.org/downloads/
  echo         IMPORTANTE: marque a opcao "Add python.exe to PATH" na instalacao.
  echo         Depois feche esta janela e execute este arquivo novamente.
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [FALTA] Node.js nao encontrado.
  echo         Instale a versao LTS em https://nodejs.org/
  echo         Depois feche esta janela e execute este arquivo novamente.
  pause
  exit /b 1
)

echo [1/3] Criando ambiente Python do servidor...
if not exist "backend\.venv\Scripts\python.exe" (
  python -m venv backend\.venv
)
backend\.venv\Scripts\python.exe -m pip install --upgrade pip >nul
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements-casa.txt
if errorlevel 1 (
  echo [ERRO] Falha ao instalar as dependencias do Python.
  pause
  exit /b 1
)

echo.
echo [2/3] Instalando dependencias da interface (pode levar alguns minutos)...
call npm --prefix frontend install
if errorlevel 1 (
  echo [ERRO] Falha ao instalar as dependencias do Node.js.
  pause
  exit /b 1
)

echo.
echo [3/3] Instalando como aplicativo do computador...
call INSTALAR_APP_COMPUTADOR.bat
