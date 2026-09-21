#
# MagiScope：1時間ごとの自動取得を Windows に登録する
#
# ★★ 2026-09-21e 「register が実行できない」の真因は2つだった。
#   ① bat が UTF-8 の日本語＋LF 改行で、cmd が行を読みちがえて途中で止まっていた
#      → bat は英数字だけ＋CRLF にし、日本語の案内はこの ps1（BOM 付き）に寄せた
#   ② 「サインインしたとき」の引き金をユーザー指定なしで作ると<b>全ユーザー向け</b>になり、
#      管理者でないと Access is denied になる
#      → 引き金もタスクの持ち主も<b>いまのユーザー</b>にしぼった（管理者はいらない）
#
# ・毎日 00:05 から 1時間ごと（＝1日24回）／サインインしたときにも1回
# ・PC が切れていて逃した分は、次に起動したとき1回だけ追いかける（StartWhenAvailable）
# ・画面には何も出さない（wscript）
#
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$vbs  = Join-Path $here "run-hidden.vbs"
$name = "MagiScope collector"
$me   = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

Write-Host "MagiScope の自動取得を登録します（ユーザー: $me）" -ForegroundColor Cyan

# 前提の確認（入っていないと取得できない）
foreach ($cmd in @("git")) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    Write-Host "[!] $cmd が見つかりません。Git for Windows を入れてから、もう一度この bat を実行してください。" -ForegroundColor Red
    exit 1
  }
}
if (-not (Get-Command python -ErrorAction SilentlyContinue) -and -not (Get-Command py -ErrorAction SilentlyContinue)) {
  Write-Host "[!] Python が見つかりません。python.org から Python を入れてください。" -ForegroundColor Red
  exit 1
}

# 古い登録を消してから入れ直す
foreach ($old in @("MagiScope FANZA", $name)) {
  try { Unregister-ScheduledTask -TaskName $old -Confirm:$false -ErrorAction Stop } catch {}
}

$action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument ('"' + $vbs + '"') -WorkingDirectory $here

$daily = New-ScheduledTaskTrigger -Daily -At "00:05"
$daily.Repetition = (New-ScheduledTaskTrigger -Once -At (Get-Date) `
    -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration (New-TimeSpan -Days 1)).Repetition
$logon = New-ScheduledTaskTrigger -AtLogOn -User $me

$set = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew `
        -ExecutionTimeLimit (New-TimeSpan -Hours 2)
$set.DeleteExpiredTaskAfter = ""
$who = New-ScheduledTaskPrincipal -UserId $me -LogonType Interactive -RunLevel Limited

try {
  Register-ScheduledTask -TaskName $name -Action $action -Trigger $daily, $logon -Settings $set -Principal $who -Force | Out-Null
} catch {
  Write-Host "[!] 登録できませんでした： $($_.Exception.Message)" -ForegroundColor Red
  Write-Host "    この bat を右クリック →「管理者として実行」でも試してみてください。" -ForegroundColor Yellow
  exit 1
}

$t = Get-ScheduledTask -TaskName $name
Write-Host ""
Write-Host "登録しました： $($t.TaskName)（状態 $($t.State)）" -ForegroundColor Green
Write-Host "  ・毎日 00:05 から 1時間ごと／サインインしたときにも1回"
Write-Host "  ・切っていた分は、次に起動したとき1回だけ追いかけます"
Write-Host ""
Write-Host "いまから1回目を動かします（数分〜十数分かかります。初回だけ GitHub のログイン画面が出ます）…" -ForegroundColor Cyan
& cmd /c ('"' + (Join-Path $here "run-pc.bat") + '"')
$log = Join-Path $env:LOCALAPPDATA "MagiScope\last-run.log"
if (Test-Path $log) {
  $tail = Get-Content $log -Tail 3 -Encoding UTF8
  Write-Host ""
  Write-Host "最後の記録：" ; $tail | ForEach-Object { Write-Host "  $_" }
  if ($tail -match "PUSH FAILED") {
    Write-Host "[!] GitHub へのアップロードに失敗しました。GitHub にログインしてから check-task.bat で確かめてください。" -ForegroundColor Red
  } else {
    Write-Host "完了です。MagiScope の「マイページ → 設定 → データの取得」に「◯分前」と出れば成功です。" -ForegroundColor Green
  }
}
