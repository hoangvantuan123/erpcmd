@echo off
title Build ERPSYN CLI App
echo ============================================================
echo   🚀 DANG BIEN DICH ERPSYN CODEX CLI (.EXE)
echo ============================================================
echo.
echo Dang bien dich Golang sang file Console/CMD executable...
go build -ldflags "-s -w" -o erpsyn.exe main.go

if %errorlevel% equ 0 (
    echo.
    echo ============================================================
    echo   ✔ BUILD THANH CONG!
    echo   File ung dung: erpsyn.exe
    echo   Cach chay:
    echo     1. Chay truc tiep bang CMD: .\erpsyn.exe
    echo     2. Hoac nhap dup chuot vao file erpsyn.exe
    echo ============================================================
) else (
    echo [X] Co loi xay ra trong qua trinh bien dich!
)
pause
