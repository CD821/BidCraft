@echo off
powershell.exe -NoProfile -Command "try { Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:8787/__quit' | Out-Null } catch {}"
