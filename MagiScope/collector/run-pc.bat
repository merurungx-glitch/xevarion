@echo off
rem ============================================================
rem  MagiScope：FANZA同人のランキングを取って GitHub に置く（この PC から）
rem  FANZA は日本からしか見られないので、GitHub の自動実行（海外）の代わりにここで取る。
rem  鍵は使わない。最初の1回だけ GitHub のログイン画面が出る（Git の通常のログイン）。
rem ============================================================
chcp 65001 >nul
setlocal
set REPO=https://github.com/merurungx-glitch/xevarion.git
set WORK=%LOCALAPPDATA%\MagiScope\data
if not exist "%WORK%\.git" (
  mkdir "%WORK%" 2>nul
  git -C "%WORK%" init -q -b magiscope-data
  git -C "%WORK%" remote add origin %REPO%
)
git -C "%WORK%" fetch -q --depth 1 origin magiscope-data && git -C "%WORK%" reset -q --hard FETCH_HEAD
python "%~dp0collect.py" --out "%WORK%" --only fanza
git -C "%WORK%" add -A
git -C "%WORK%" -c user.name=magiscope-pc -c user.email=magiscope-pc@users.noreply.github.com commit -q -m "FANZA (PC)"
git -C "%WORK%" push -q origin HEAD:magiscope-data
endlocal
