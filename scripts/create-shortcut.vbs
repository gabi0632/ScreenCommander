' Creates a desktop shortcut for ScreenCommander
' Run: cscript scripts\create-shortcut.vbs

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

desktopPath = WshShell.SpecialFolders("Desktop")
projectRoot = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))

Set shortcut = WshShell.CreateShortcut(desktopPath & "\ScreenCommander.lnk")
shortcut.TargetPath = projectRoot & "\scripts\start-screencommander.vbs"
shortcut.WorkingDirectory = projectRoot
shortcut.Description = "ScreenCommander - Multi-display streaming management"
shortcut.IconLocation = "shell32.dll,21"
shortcut.Save

WScript.Echo "Desktop shortcut created: " & desktopPath & "\ScreenCommander.lnk"
