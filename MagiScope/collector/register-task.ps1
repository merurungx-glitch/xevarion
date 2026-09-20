#
# MagiScope：1時間ごとの自動取得を Windows に登録する
#
# ★★ 2026-09-21 これまで register-task.bat の中に PowerShell を1行で書いていたが、
#    「-Once ＋ 繰り返し」だけの引き金は、環境によってはタスクごと消えてしまうことがある
#    （実際に登録が消えていて、FANZA が2時間止まっていた）。
#    そこで **毎日 00:05 の引き金に「1時間おき・24時間」の繰り返しを差し込む**、
#    いちばん確実な形に変えた。これなら再起動しても、日をまたいでも消えない。
#
# ・毎日 00:05 から 1時間ごと（＝1日24回）
# ・サインインしたときにも1回
# ・PC が切れていて逃した分は、次に起動したとき1回だけ追いかける（StartWhenAvailable）
# ・バッテリー動作でも動く／画面には何も出さない（wscript）
#
$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$vbs  = Join-Path $here "run-hidden.vbs"
$name = "MagiScope collector"

# 古い登録（名前がちがうものも含めて）を消してから入れ直す
foreach ($old in @("MagiScope FANZA", $name)) {
  try { Unregister-ScheduledTask -TaskName $old -Confirm:$false -ErrorAction Stop } catch {}
}

$action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument ('"' + $vbs + '"')

# ① 毎日 00:05 スタート ＋ 1時間ごとに24時間くり返す（これがふだんの動き）
$daily = New-ScheduledTaskTrigger -Daily -At "00:05"
$rep   = (New-ScheduledTaskTrigger -Once -At (Get-Date) `
            -RepetitionInterval (New-TimeSpan -Hours 1) `
            -RepetitionDuration (New-TimeSpan -Days 1)).Repetition
$daily.Repetition = $rep

# ② サインインしたときにも1回（PC を切っていた日の取りこぼし用）
$logon = New-ScheduledTaskTrigger -AtLogOn

$set = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew `
        -ExecutionTimeLimit (New-TimeSpan -Hours 2)
# 「もう動く予定が無いときに消す」を必ず切る（これが原因で消えることがある）
$set.DeleteExpiredTaskAfter = ""

Register-ScheduledTask -TaskName $name -Action $action -Trigger $daily, $logon -Settings $set -Force | Out-Null

$t = Get-ScheduledTask -TaskName $name
Write-Host ""
Write-Host "登録しました： $($t.TaskName)  （状態 $($t.State)）"
Write-Host "  ・毎日 00:05 から 1時間ごと"
Write-Host "  ・サインインしたときにも1回"
Write-Host "  ・切っていた分は、次に起動したとき1回だけ追いかけます"
Write-Host ""
