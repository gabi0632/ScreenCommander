' ScreenCommander Launcher
' Double-click to start backend + kiosk

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

projectRoot = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
WshShell.CurrentDirectory = projectRoot

' Find electron.exe in pnpm store
electronExe = ""
pnpmDir = projectRoot & "\node_modules\.pnpm"
If fso.FolderExists(pnpmDir) Then
    For Each folder In fso.GetFolder(pnpmDir).SubFolders
        If Left(folder.Name, 9) = "electron@" Then
            candidate = folder.Path & "\node_modules\electron\dist\electron.exe"
            If fso.FileExists(candidate) Then
                electronExe = candidate
                Exit For
            End If
        End If
    Next
End If

If electronExe = "" Then
    ' Fallback
    electronExe = projectRoot & "\node_modules\electron\dist\electron.exe"
End If

nodeExe = "C:\Program Files\nodejs\node.exe"
backendScript = projectRoot & "\packages\backend\dist\index.js"
kioskScript = projectRoot & "\packages\kiosk\dist\main\index.js"

' Set environment
WshShell.Environment("Process")("NODE_ENV") = "production"
WshShell.Environment("Process")("PORT") = "3000"
WshShell.Environment("Process")("HOST") = "0.0.0.0"
WshShell.Environment("Process")("DATABASE_URL") = "file:" & projectRoot & "\packages\backend\prisma\dev.db"

' Start backend (hidden)
WshShell.Run """" & nodeExe & """ """ & backendScript & """", 0, False

' Wait for backend
WScript.Sleep 5000

' Start kiosk (hidden)
WshShell.Run """" & electronExe & """ """ & kioskScript & """", 0, False
