@echo off
rem ============================================================
rem  MagiScope：1時間ごとの自動取得を Windows に登録する
rem   ・PC の電源が入っていれば1時間ごとに動く
rem   ・PC を切っていた時間の分は、次に起動したときに1回だけ追いかけて動く
rem   ・再起動しても登録は残る／画面には何も出ない
rem  ★ 中身は register-task.ps1（1行に押しこむと引き金の形を作れないため分けた）
rem  やめるときは unregister-task.bat
rem ============================================================
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0register-task.ps1"
if errorlevel 1 (
  echo.
  echo 登録できませんでした。この bat を「管理者として実行」してみてください。
  pause
  exit /b 1
)
echo まず1回動かします（数分かかります。この画面は閉じずにお待ちください）…
call "%~dp0run-pc.bat"
echo.
echo 完了しました。MagiScope の「設定 → データソース」で「◯分前に更新」と出れば成功です。
pause
