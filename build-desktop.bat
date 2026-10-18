@echo off
title Build MESSYN Desktop Native App
echo ============================================================
echo   🚀 DANG BUILD PHAN MEM MESSYN DESKTOP (.EXE)
echo ============================================================
echo.
echo [1] Dong bo ma nguon giao dien vao package...
xcopy /E /I /Y web cmd\gui\web >nul
echo [2] Dang bien dich Golang sang file Windows Native GUI (.exe)...
go build -ldflags "-H windowsgui -s -w" -o MESSYN-Desktop.exe ./cmd/gui
if %errorlevel% equ 0 (
    echo.
    echo ============================================================
    echo   ✔ BUILD THANH CONG!
    echo   File ung dung: MESSYN-Desktop.exe (~10MB)
    echo   Chi can nhap dup vao MESSYN-Desktop.exe de su dung!
    echo ============================================================
) else (
    echo [X] Co loi xay ra trong qua trinh bien dich.
)
pause
