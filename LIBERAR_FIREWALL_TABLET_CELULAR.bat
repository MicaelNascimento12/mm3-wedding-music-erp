@echo off
chcp 65001 >nul
title Liberar porta 8000 no Firewall (Tablet e Celular)

net session >nul 2>&1
if errorlevel 1 (
  echo [ATENCAO] Clique com o botao direito neste arquivo e escolha
  echo           "Executar como administrador".
  pause
  exit /b 1
)

echo [1/2] Marcando a rede de casa como PRIVADA (o Windows bloqueia o acesso em rede Publica)...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-NetConnectionProfile | Where-Object NetworkCategory -eq 'Public' | ForEach-Object { Write-Host ('   - ' + $_.InterfaceAlias + ' (' + $_.Name + '): Publica -> Privada'); Set-NetConnectionProfile -InterfaceIndex $_.InterfaceIndex -NetworkCategory Private }"

echo [2/2] Liberando a porta 8000...
netsh advfirewall firewall delete rule name="Gestao de Casamentos (porta 8000)" >nul 2>&1
netsh advfirewall firewall add rule name="Gestao de Casamentos (porta 8000)" dir=in action=allow protocol=TCP localport=8000 profile=private

echo.
echo Porta 8000 liberada na rede PRIVADA (Wi-Fi de casa).
echo O Redmi Pad Pro e o Poco X6 ja podem sincronizar com este computador.
pause
