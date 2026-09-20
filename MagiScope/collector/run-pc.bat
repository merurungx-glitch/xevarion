@echo off
rem ============================================================
rem  MagiScope：ランキングを取って GitHub（magiscope-data ブランチ）に置く
rem  カラオケ DAM・国内アニメ（Annict）・FANZA同人・DLsite を、この PC から取ります。
rem  鍵は使いません。最初の1回だけ GitHub のログイン画面が出ます（Git の通常のログイン）。
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
python "%~dp0collect.py" --out "%WORK%" %*
git -C "%WORK%" add -A
git -C "%WORK%" -c user.name=magiscope-pc -c user.email=magiscope-pc@users.noreply.github.com commit -q -m "MagiScope data (PC)"
git -C "%WORK%" push -q origin HEAD:magiscope-data
endlocal
