# Prepara (uma unica vez) o JDK 21 e o Android SDK necessarios para gerar o APK.
# Instala em %LOCALAPPDATA%\GestaoCasamentos\android-sdk (fora do OneDrive, para nao sincronizar GBs).
# Ao final, grava em "env.txt" as variaveis JAVA_HOME e ANDROID_HOME para o .bat usar.
param([string]$SdkRoot = "$env:LOCALAPPDATA\GestaoCasamentos\android-sdk")

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

New-Item -ItemType Directory -Force -Path $SdkRoot | Out-Null
$tmp = Join-Path $SdkRoot '_downloads'
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

# ---------- JDK 21 ----------
$jdkDir = Join-Path $SdkRoot 'jdk21'
$jdkHome = Get-ChildItem $jdkDir -Directory -Filter 'jdk*' -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $jdkHome) {
    Write-Host '   Baixando JDK 21 (cerca de 200 MB)...'
    $zip = Join-Path $tmp 'jdk21.zip'
    Invoke-WebRequest 'https://api.adoptium.net/v3/binary/latest/21/ga/windows/x64/jdk/hotspot/normal/eclipse' -OutFile $zip -UseBasicParsing
    Write-Host '   Extraindo JDK 21...'
    Expand-Archive $zip -DestinationPath $jdkDir -Force
    Remove-Item $zip -Force
    $jdkHome = Get-ChildItem $jdkDir -Directory -Filter 'jdk*' | Select-Object -First 1
}
$env:JAVA_HOME = $jdkHome.FullName
Write-Host "   JDK: $($env:JAVA_HOME)"

# ---------- Android command-line tools ----------
$sdkManager = Join-Path $SdkRoot 'cmdline-tools\latest\bin\sdkmanager.bat'
if (-not (Test-Path $sdkManager)) {
    Write-Host '   Baixando Android command-line tools...'
    $zip = Join-Path $tmp 'cmdline-tools.zip'
    Invoke-WebRequest 'https://dl.google.com/android/repository/commandlinetools-win-13114758_latest.zip' -OutFile $zip -UseBasicParsing
    $extract = Join-Path $tmp 'cmdline-tools-extract'
    Expand-Archive $zip -DestinationPath $extract -Force
    $dest = Join-Path $SdkRoot 'cmdline-tools\latest'
    New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
    if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
    Move-Item (Join-Path $extract 'cmdline-tools') $dest
    Remove-Item $zip, $extract -Recurse -Force
}

# ---------- Pacotes do SDK ----------
$packages = @('platform-tools', 'platforms;android-36', 'build-tools;35.0.0')
$missing = $packages | Where-Object {
    -not (Test-Path (Join-Path $SdkRoot ($_ -replace ';', '\')))
}
if ($missing) {
    Write-Host '   Aceitando licencas do Android SDK...'
    $yes = ("y`n" * 50)
    $yes | & $sdkManager --sdk_root="$SdkRoot" --licenses | Out-Null
    Write-Host "   Instalando: $($missing -join ', ') (pode demorar alguns minutos)..."
    $yes | & $sdkManager --sdk_root="$SdkRoot" @missing | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar os pacotes do Android SDK.' }
}

Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue

# Arquivo lido pelo .bat
"JAVA_HOME=$($env:JAVA_HOME)`r`nANDROID_HOME=$SdkRoot" |
    Set-Content -Path (Join-Path $SdkRoot 'env.txt') -Encoding ASCII
Write-Host '   Ambiente Android pronto.'
