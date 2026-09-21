@echo off
rem ============================================================
rem  MagiScope collector - runs collect.py and pushes the JSON to
rem  the magiscope-data branch on GitHub. No API keys are used.
rem  (Japanese notes are in README.md)
rem ============================================================
setlocal
set REPO=https://github.com/merurungx-glitch/xevarion.git
set WORK=%LOCALAPPDATA%\MagiScope\data
set LOG=%LOCALAPPDATA%\MagiScope\last-run.log
if not exist "%LOCALAPPDATA%\MagiScope" mkdir "%LOCALAPPDATA%\MagiScope"

rem --- python or the py launcher ---
set PY=python
where python >nul 2>nul || set PY=py -3

echo [%date% %time%] start > "%LOG%"
if not exist "%WORK%\.git" (
  mkdir "%WORK%" 2>nul
  git -C "%WORK%" init -q -b magiscope-data
  git -C "%WORK%" remote add origin %REPO%
)
git -C "%WORK%" fetch -q --depth 1 origin magiscope-data >> "%LOG%" 2>&1
git -C "%WORK%" reset -q --hard FETCH_HEAD >> "%LOG%" 2>&1
set PYTHONIOENCODING=utf-8
%PY% "%~dp0collect.py" --out "%WORK%" %* >> "%LOG%" 2>&1
git -C "%WORK%" add -A >> "%LOG%" 2>&1
git -C "%WORK%" -c user.name=magiscope-pc -c user.email=magiscope-pc@users.noreply.github.com commit -q -m "MagiScope data (PC)" >> "%LOG%" 2>&1
git -C "%WORK%" push -q -f origin HEAD:magiscope-data >> "%LOG%" 2>&1
if errorlevel 1 (echo [%date% %time%] PUSH FAILED >> "%LOG%") else (echo [%date% %time%] done >> "%LOG%")
endlocal
