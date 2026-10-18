@echo off
title MESSYN - Desktop Agent Workspace
echo ============================================================
echo   🚀 DANG KHOI CHAY PHAN MEM MESSYN HERDR DESKTOP
echo ============================================================
echo.
echo [1] Khoi dong Backend Engine ket noi SQLite messyn_data.db...
start /b node web/server.js
timeout /t 1 >nul
echo [2] Dang mo cua so phan mem desktop doc lap (App Window Mode)...
where msedge >nul 2>nul
if %errorlevel% equ 0 (
    start msedge.exe --app="http://localhost:8080/" --window-size=1560,940
) else (
    where chrome >nul 2>nul
    if %errorlevel% equ 0 (
        start chrome.exe --app="http://localhost:8080/" --window-size=1560,940
    ) else (
        start http://localhost:8080/
    )
)
echo.
echo [✔] Phan mem dang chay o che do Desktop App doc lap!
