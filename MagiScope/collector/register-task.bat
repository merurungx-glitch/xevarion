@echo off
rem MagiScope：run-pc.bat を1時間ごとに自動で動かすように Windows に登録する（やめるときは unregister-task.bat）
chcp 65001 >nul
schtasks /Create /F /SC HOURLY /MO 1 /TN "MagiScope FANZA" /TR "\"%~dp0run-pc.bat\""
echo.
echo 登録しました。まず1回動かします…
call "%~dp0run-pc.bat"
pause
