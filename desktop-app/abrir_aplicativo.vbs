' ============================================================================
' Gestao de Casamentos - Abre o sistema como APLICATIVO DO COMPUTADOR
' 1. Garante que o servidor esta rodando (inicia escondido se necessario)
' 2. Abre uma janela propria (sem barra de endereco / abas) no Edge ou Chrome
' ============================================================================
Option Explicit

Const APP_URL = "http://localhost:8000/dashboard"

Dim fso, sh, scriptDir, i, navegador
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

If Not ServidorAtivo() Then
  sh.Run "wscript.exe """ & scriptDir & "\servidor_oculto.vbs""", 0, True
  For i = 1 To 40
    If ServidorAtivo() Then Exit For
    WScript.Sleep 500
  Next
  If Not ServidorAtivo() Then
    MsgBox "O servidor nao respondeu em 20 segundos." & vbCrLf & _
      "Veja o arquivo backend\logs\servidor.log para detalhes.", vbExclamation, "Gestao de Casamentos"
    WScript.Quit 1
  End If
End If

navegador = ""
If fso.FileExists(sh.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\Microsoft\Edge\Application\msedge.exe") Then
  navegador = sh.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\Microsoft\Edge\Application\msedge.exe"
ElseIf fso.FileExists(sh.ExpandEnvironmentStrings("%ProgramFiles%") & "\Microsoft\Edge\Application\msedge.exe") Then
  navegador = sh.ExpandEnvironmentStrings("%ProgramFiles%") & "\Microsoft\Edge\Application\msedge.exe"
ElseIf fso.FileExists(sh.ExpandEnvironmentStrings("%ProgramFiles%") & "\Google\Chrome\Application\chrome.exe") Then
  navegador = sh.ExpandEnvironmentStrings("%ProgramFiles%") & "\Google\Chrome\Application\chrome.exe"
End If

If navegador <> "" Then
  sh.Run """" & navegador & """ --app=" & APP_URL & " --start-maximized", 1, False
Else
  sh.Run APP_URL, 1, False
End If

Function ServidorAtivo()
  Dim http
  ServidorAtivo = False
  On Error Resume Next
  Set http = CreateObject("MSXML2.ServerXMLHTTP.6.0")
  http.setTimeouts 1000, 1000, 1500, 1500
  http.Open "GET", "http://127.0.0.1:8000/health", False
  http.Send
  If Err.Number = 0 Then
    If http.Status = 200 Then ServidorAtivo = True
  End If
  Err.Clear
  On Error GoTo 0
End Function
