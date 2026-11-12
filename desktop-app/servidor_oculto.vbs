' ============================================================================
' Gestao de Casamentos - Servidor em segundo plano (sem janela preta)
' Inicia o servidor FastAPI na porta 8000 de forma invisivel.
' Se o servidor ja estiver rodando, nao faz nada.
' ============================================================================
Option Explicit

Dim fso, sh, scriptDir, rootDir, uvicorn, logDir, logPath, cmd
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
rootDir = fso.GetParentFolderName(scriptDir)

If ServidorAtivo() Then WScript.Quit 0

uvicorn = rootDir & "\backend\.venv\Scripts\uvicorn.exe"
If Not fso.FileExists(uvicorn) Then
  MsgBox "Nao encontrei o servidor em:" & vbCrLf & uvicorn, vbCritical, "Gestao de Casamentos"
  WScript.Quit 1
End If

logDir = rootDir & "\backend\logs"
If Not fso.FolderExists(logDir) Then fso.CreateFolder logDir
logPath = logDir & "\servidor.log"

sh.CurrentDirectory = rootDir
cmd = "cmd /c """"" & uvicorn & """ app.main:app --app-dir backend --host 0.0.0.0 --port 8000 > """ & logPath & """ 2>&1"""
sh.Run cmd, 0, False

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
