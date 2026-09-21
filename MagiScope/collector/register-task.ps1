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
$log = Join-Path $env:LOCALAPPDATA "MagiScope\last-run.log"
# 2026-09-21k: 前は結果をログにだけ書いていたので、数十分のあいだ画面が止まって見えた。
# 裏で動かし、ログに増えた行をこの画面にそのまま流す（窓を閉じても取得は続く）。
$busy = Get-CimInstance Win32_Process -Filter "Name like 'python%'" -ErrorAction SilentlyContinue |
  Where-Object { $_.CommandLine -match "collect\.py" }
if ($busy) {
  Write-Host "（すでに取得が動いています。その様子を表示します）" -ForegroundColor Yellow
  $proc = Get-Process -Id ($busy | Select-Object -First 1).ProcessId -ErrorAction SilentlyContinue
} else {
  $proc = Start-Process -FilePath "cmd.exe" -ArgumentList ('/c "' + (Join-Path $here "run-pc.bat") + '"') -WindowStyle Hidden -PassThru
  Start-Sleep -Seconds 2
}
Write-Host "※ この窓は閉じてもかまいません（取得は裏で続きます。あとで check-task.bat で確認できます）" -ForegroundColor Cyan
Write-Host "※ 初めてのときは GitHub のログイン画面が出ることがあります。ほかの窓のうしろに隠れていないか見てください" -ForegroundColor Cyan
Write-Host ""
$t0 = Get-Date; $shown = 0; $lastLine = Get-Date
while ($true) {
  $alive = $proc -and -not $proc.HasExited
  if (Test-Path $log) {
    $all = @(Get-Content $log -Encoding UTF8 -ErrorAction SilentlyContinue)
    if ($all.Count -lt $shown) { $shown = 0 }
    for ($i = $shown; $i -lt $all.Count; $i++) {
      $m = [int]((Get-Date) - $t0).TotalMinutes
      Write-Host ("  [{0,3}分] {1}" -f $m, $all[$i]); $lastLine = Get-Date
    }
    $shown = $all.Count
  }
  if (-not $alive) { break }
  if (((Get-Date) - $lastLine).TotalSeconds -ge 60) {
    Write-Host ("  …取得中（" + [int]((Get-Date) - $t0).TotalMinutes + "分経過・1件ずつ間をあけて読むので時間がかかります）") -ForegroundColor DarkGray
    $lastLine = Get-Date
  }
  Start-Sleep -Seconds 3
}
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
