@echo off
chcp 65001 >nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "Unregister-ScheduledTask -TaskName 'MagiScope collector' -Confirm:$false; Write-Host '自動取得をやめました'"
schtasks /Delete /F /TN "MagiScope FANZA" >nul 2>nul
pause
