@echo off
rem ============================================================
rem  MagiScope：自動取得がちゃんと登録されているか見る
rem  （「見つかりません」と出たら register-task.bat を1回実行してください）
rem ============================================================
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$n='MagiScope collector';" ^
  "$t=Get-ScheduledTask -TaskName $n -ErrorAction SilentlyContinue;" ^
  "if(-not $t){ Write-Host '登録が見つかりません。register-task.bat を1回実行してください。' -ForegroundColor Red; exit }" ^
  "$i=Get-ScheduledTaskInfo -TaskName $n;" ^
  "Write-Host ('状態      : ' + $t.State);" ^
  "Write-Host ('前回の実行: ' + $i.LastRunTime + '  （結果 ' + $i.LastTaskResult + '  0 なら成功）');" ^
  "Write-Host ('次回の実行: ' + $i.NextRunTime)"
echo.
pause
