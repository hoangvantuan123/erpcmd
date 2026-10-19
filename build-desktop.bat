@echo off
setlocal
title Build ERPSYN Desktop
echo ============================================================
echo   Build ERPSYN Desktop (Go + React + Tailwind + Glide)
echo ============================================================
echo.
call npm run build:desktop
if errorlevel 1 (
    echo.
    echo [X] Build failed. Check the output above.
    pause
    exit /b 1
)
echo.
echo Application created: ERPSYN-Desktop.exe
pause
