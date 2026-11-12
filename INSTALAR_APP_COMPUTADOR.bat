@echo off
chcp 65001 >nul
title Instalar Gestao de Casamentos como Aplicativo do Computador
cd /d "%~dp0"

echo ============================================================================
echo   INSTALANDO "GESTAO DE CASAMENTOS" COMO APLICATIVO DO COMPUTADOR
echo ============================================================================
echo.

echo [1/4] Compilando a interface do sistema...
call npm --prefix frontend run build >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Falha ao compilar o frontend. Rode "npm --prefix frontend run build" para ver o erro.
  pause
  exit /b 1
)

echo [2/4] Gerando icone do aplicativo...
if not exist "desktop-app\icone-casamentos.ico" (
  powershell -NoProfile -ExecutionPolicy Bypass -File "desktop-app\gerar_icone.ps1" >nul
)

echo [3/4] Criando atalhos (Area de Trabalho, Menu Iniciar e Inicializacao do Windows)...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$root = (Resolve-Path '.').Path;" ^
  "$ws = New-Object -ComObject WScript.Shell;" ^
  "$icon = Join-Path $root 'desktop-app\icone-casamentos.ico';" ^
  "$abrir = Join-Path $root 'desktop-app\abrir_aplicativo.vbs';" ^
  "$servidor = Join-Path $root 'desktop-app\servidor_oculto.vbs';" ^
  "$parar = Join-Path $root 'desktop-app\parar_servidor.vbs';" ^
  "$desk = [Environment]::GetFolderPath('Desktop');" ^
  "$menu = Join-Path ([Environment]::GetFolderPath('Programs')) 'Gestao de Casamentos';" ^
  "$startup = [Environment]::GetFolderPath('Startup');" ^
  "New-Item -ItemType Directory -Force -Path $menu | Out-Null;" ^
  "function Atalho($dest, $script, $desc) { $s = $ws.CreateShortcut($dest); $s.TargetPath = \"$env:WINDIR\System32\wscript.exe\"; $s.Arguments = '\"' + $script + '\"'; $s.WorkingDirectory = $root; $s.IconLocation = $icon; $s.Description = $desc; $s.Save() }" ^
  "Atalho (Join-Path $desk 'Gestao de Casamentos.lnk') $abrir 'Abrir Gestao de Casamentos';" ^
  "Atalho (Join-Path $menu 'Gestao de Casamentos.lnk') $abrir 'Abrir Gestao de Casamentos';" ^
  "Atalho (Join-Path $menu 'Parar Servidor.lnk') $parar 'Encerrar servidor em segundo plano';" ^
  "Atalho (Join-Path $startup 'Gestao de Casamentos - Servidor.lnk') $servidor 'Inicia o servidor junto com o Windows';"

echo [4/4] Iniciando o servidor em segundo plano...
wscript.exe "desktop-app\servidor_oculto.vbs"

echo.
echo ============================================================================
echo   PRONTO! O aplicativo foi instalado no seu computador:
echo.
echo   - Atalho "Gestao de Casamentos" na Area de Trabalho e no Menu Iniciar
echo   - O servidor liga sozinho (escondido) toda vez que o Windows iniciar
echo   - Tablet e Celular podem sincronizar a qualquer momento pelo Wi-Fi
echo.
echo   Dica: abra o atalho, clique com o botao direito no icone da barra de
echo   tarefas e escolha "Fixar na barra de tarefas".
echo ============================================================================
echo.
echo   (Opcional) Para liberar o Tablet/Celular no Firewall do Windows, execute
echo   o arquivo LIBERAR_FIREWALL_TABLET_CELULAR.bat como Administrador.
echo.
pause
