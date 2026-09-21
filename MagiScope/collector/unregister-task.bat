@echo off
powershell -NoProfile -ExecutionPolicy Bypass -Command "Unregister-ScheduledTask -TaskName 'MagiScope collector' -Confirm:$false -ErrorAction SilentlyContinue; Unregister-ScheduledTask -TaskName 'MagiScope FANZA' -Confirm:$false -ErrorAction SilentlyContinue; Write-Host 'removed'"
pause
