@echo off
setlocal
set "APP_DIR=%~dp0"
powershell.exe -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:8787/__quit' -TimeoutSec 1 | Out-Null } catch {}"
timeout /t 1 /nobreak >nul
start "" /min powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%APP_DIR%scripts\server.ps1" -Root "%APP_DIR%dist" -Port 8787
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8787"
endlocal
