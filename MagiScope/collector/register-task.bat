@echo off
rem ============================================================
rem  MagiScope：1時間ごとの自動取得を Windows に登録する
rem   ・PC の電源が入っていれば1時間ごとに動く
rem   ・PC を切っていた時間の分は、次に起動したときに1回だけ追いかけて動く（StartWhenAvailable）
rem   ・再起動しても登録は残る／画面には何も出ない
rem  やめるときは unregister-task.bat
rem ============================================================
chcp 65001 >nul
rem 前の版（FANZA だけの登録）が残っていたら消す
schtasks /Delete /F /TN "MagiScope FANZA" >nul 2>nul
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$a = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument ('\"' + '%~dp0run-hidden.vbs' + '\"');" ^
  "$t1 = New-ScheduledTaskTrigger -AtLogOn;" ^
  "$t2 = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) -RepetitionInterval (New-TimeSpan -Hours 1);" ^
  "$s = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Hours 2);" ^
  "Register-ScheduledTask -TaskName 'MagiScope collector' -Action $a -Trigger $t1,$t2 -Settings $s -Force | Out-Null;" ^
  "Write-Host '登録しました（1時間ごと・ログオン時・見逃した分は起動時に追いかけます）'"
echo.
echo まず1回動かします（数分かかります。画面はこのまま閉じずにお待ちください）…
call "%~dp0run-pc.bat"
echo.
echo 完了しました。
pause
