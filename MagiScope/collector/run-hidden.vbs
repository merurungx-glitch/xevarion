' MagiScope：run-pc.bat を画面に出さずに動かす（自動実行用）
Set sh = CreateObject("WScript.Shell")
sh.Run """" & Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\")) & "run-pc.bat""", 0, False
