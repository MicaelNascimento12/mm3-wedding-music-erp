@echo off
chcp 65001 >nul
title Gerador de Aplicativo Android (.APK) - Gestao de Casamentos
echo ============================================================================
echo   GERADOR AUTOMATICO DE APLICATIVO ANDROID (.APK)
echo   Compativel com: Redmi Pad Pro (Tablet) e Poco X6 (Celular)
echo ============================================================================
echo.

cd /d "%~dp0"

echo [1/3] Compilando interface atualizada do sistema...
call npm --prefix frontend run build

echo [2/3] Sincronizando arquivos com o projeto Android (Capacitor)...
pushd frontend
call npx cap sync android
popd

echo [3/3] Gerando o instalador Gestao-de-Casamentos.apk...
if exist "%~dp0.android-sdk\platforms" (
    rem Ambiente antigo dentro da pasta do projeto
    set "ANDROID_HOME=%~dp0.android-sdk"
    for /d %%i in ("%~dp0.android-sdk\jdk21\jdk*") do set "JAVA_HOME=%%i"
) else (
    rem Prepara JDK 21 + Android SDK automaticamente (so baixa na primeira vez)
    set "SDK_DIR=%LOCALAPPDATA%\GestaoCasamentos\android-sdk"
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\preparar_android_sdk.ps1"
    if errorlevel 1 (
        echo.
        echo [ERRO] Nao foi possivel preparar o JDK/Android SDK. Verifique a internet.
        pause
        exit /b 1
    )
)
if defined SDK_DIR for /f "usebackq tokens=1,* delims==" %%a in ("%SDK_DIR%\env.txt") do set "%%a=%%b"
set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
set "PATH=%JAVA_HOME%\bin;%PATH%"
echo    JAVA_HOME=%JAVA_HOME%
echo    ANDROID_HOME=%ANDROID_HOME%

rem O Android Gradle nao aceita caminhos com acento (ex.: "Area de Trabalho").
rem Mapeia temporariamente a pasta "frontend" para uma letra de unidade livre.
set "BUILD_DRIVE="
for %%d in (W V U T S R Q P O N M L K J) do (
    if not defined BUILD_DRIVE if not exist %%d:\ set "BUILD_DRIVE=%%d:"
)
if not defined BUILD_DRIVE (
    echo [ERRO] Nenhuma letra de unidade livre para a compilacao.
    pause
    exit /b 1
)
subst %BUILD_DRIVE% "%~dp0frontend"
pushd %BUILD_DRIVE%\android
call gradlew.bat assembleDebug --no-daemon
popd
subst %BUILD_DRIVE% /d

if exist "frontend\android\app\build\outputs\apk\debug\app-debug.apk" (
    copy /Y "frontend\android\app\build\outputs\apk\debug\app-debug.apk" "Gestao-de-Casamentos.apk" >nul
    echo.
    echo ============================================================================
    echo   SUCESSO! O APLICATIVO FOI GERADO EM:
    echo   %~dp0Gestao-de-Casamentos.apk
    echo ============================================================================
) else (
    echo.
    echo [ERRO] Nao foi possivel gerar o arquivo APK.
)
pause
