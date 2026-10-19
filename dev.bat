@echo off
setlocal
title ERPSYS Desktop Live Dev (Hot-Reload)
taskkill /IM ERPSYN-Desktop.exe /F >nul 2>&1
echo ============================================================
echo   🚀 DANG KHOI CHAY ERPSYS DESKTOP (CHE DO DEV LIVE RELOAD)
echo ============================================================
echo.
echo - Vite Frontend Dev : http://127.0.0.1:5183
echo - Go API Backend    : http://127.0.0.1:5184
echo - Cua so ERPSYS se tu dong bat len o man hinh chinh.
echo.
echo * Luu y: Cua so CMD nay can giu nguyen de duy tri Live Dev / Hot-Reload!
echo   Moi khi ban sua code React, cua so ERPSYS se tu cap nhat ngay lap tuc.
echo   Nhap Ctrl+C de dung khi hoan tat.
echo.
call node scripts/dev-desktop.mjs
pause
