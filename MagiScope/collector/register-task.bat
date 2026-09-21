@echo off
rem ============================================================
rem  MagiScope - register the hourly auto collection (no admin needed)
rem  Double-click this file. Details: register-task.ps1 / README.md
rem ============================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0register-task.ps1"
echo.
pause
