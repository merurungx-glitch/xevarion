@echo off
setlocal
rem 2026-09-21k: upload after each stage (sales first), so an interrupted run still publishes.
set REPO=https://github.com/merurungx-glitch/xevarion.git
set WORK=%LOCALAPPDATA%\MagiScope\data
set LOG=%LOCALAPPDATA%\MagiScope\last-run.log
if not exist "%LOCALAPPDATA%\MagiScope" mkdir "%LOCALAPPDATA%\MagiScope"
if exist "%LOG%" copy /y "%LOG%" "%LOCALAPPDATA%\MagiScope\prev-run.log" >nul
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
set FAILED=0
call :stage "campaign,dlsite" %*
call :stage "movie,special" %*
call :stage "fanza" %*
call :stage "danime,fbooks,fvideo" %*
call :stage "karaoke,music,anime" %*
if "%FAILED%"=="1" (echo [%date% %time%] PUSH FAILED >> "%LOG%") else (echo [%date% %time%] done >> "%LOG%")
endlocal
goto :eof

:stage
echo [%date% %time%] stage %~1 >> "%LOG%"
%PY% "%~dp0collect.py" --out "%WORK%" --only %~1 %2 %3 %4 %5 %6 >> "%LOG%" 2>&1
git -C "%WORK%" add -A >> "%LOG%" 2>&1
git -C "%WORK%" -c user.name=magiscope-pc -c user.email=magiscope-pc@users.noreply.github.com commit -q -m "MagiScope data (PC %~1)" >> "%LOG%" 2>&1
git -C "%WORK%" push -q -f origin HEAD:magiscope-data >> "%LOG%" 2>&1
if errorlevel 1 (set FAILED=1& echo [%date% %time%] push failed %~1 >> "%LOG%") else (echo [%date% %time%] pushed %~1 >> "%LOG%")
goto :eof
