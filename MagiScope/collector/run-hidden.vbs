' MagiScope: run run-pc.bat without showing a window (for the scheduled task)
Set sh = CreateObject("WScript.Shell")
sh.Run """" & Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\")) & "run-pc.bat""", 0, True
