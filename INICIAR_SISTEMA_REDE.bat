@echo off
chcp 65001 >nul
title Sistema Musical de Casamentos - Servidor PC + Redmi Pad Pro + Poco X6
echo ============================================================================
echo   INICIANDO SISTEMA MUSICAL DE CASAMENTOS (PC + TABLET + CELULAR)
echo ============================================================================
echo.
echo 1. Compilando interface atualizada...
call npm --prefix frontend run build
echo.
echo ============================================================================
echo   ACESSO NOS SEUS DISPOSITIVOS (CONECTADOS NO MESMO WI-FI / ROTEADOR):
echo ============================================================================
echo   - No seu Computador: http://localhost:8000
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    echo   - No Redmi Pad Pro e no Poco X6, abra o Chrome e digite: http:%%a:8000
)
echo   (Use o IP 192.168.x.x. NUNCA use "localhost" no Tablet/Celular.)
echo ============================================================================
echo.
powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if not errorlevel 1 (
    echo [OK] O servidor JA ESTA RODANDO neste computador na porta 8000.
    echo      Nao e preciso abrir de novo. Use os enderecos acima no Tablet/Celular.
    pause
    exit /b 0
)
backend\.venv\Scripts\uvicorn.exe app.main:app --app-dir backend --host 0.0.0.0 --port 8000
pause
