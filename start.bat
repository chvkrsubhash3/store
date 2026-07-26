@echo off
echo ============================================================
echo  SecureMart - Unified Full-Stack Platform
echo ============================================================
echo.

WHERE npm >nul 2>nul
IF %ERRORLEVEL% EQU 0 (
    echo [1] Starting SecureMart Platform with npm (Port 3000)...
    npm run dev
) ELSE (
    echo [1] npm not found in system PATH. Attempting pnpm fallback...
    pnpm run dev
)

pause
