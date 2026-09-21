# MagiScope：自動取得がちゃんと動いているかを見る
$name = "MagiScope collector"
$t = Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
if (-not $t) {
  Write-Host "登録が見つかりません。register-task.bat を1回実行してください。" -ForegroundColor Red
} else {
  $i = Get-ScheduledTaskInfo -TaskName $name
  Write-Host ("状態      : " + $t.State)
  Write-Host ("前回の実行: " + $i.LastRunTime + "（結果 " + $i.LastTaskResult + "／0 なら成功）")
  Write-Host ("次回の実行: " + $i.NextRunTime)
}
$log = Join-Path $env:LOCALAPPDATA "MagiScope\last-run.log"
if (Test-Path $log) {
  Write-Host ""
  Write-Host "最後の取得の記録（last-run.log の最後の15行）：" -ForegroundColor Cyan
  Get-Content $log -Tail 15 -Encoding UTF8 | ForEach-Object { Write-Host "  $_" }
}
