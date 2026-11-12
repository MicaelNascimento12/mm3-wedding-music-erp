' ============================================================================
' Gestao de Casamentos - Para o servidor em segundo plano (porta 8000)
' ============================================================================
Option Explicit
Dim sh
Set sh = CreateObject("WScript.Shell")
sh.Run "powershell -NoProfile -WindowStyle Hidden -Command ""Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }""", 0, True
MsgBox "Servidor do Gestao de Casamentos encerrado.", vbInformation, "Gestao de Casamentos"
