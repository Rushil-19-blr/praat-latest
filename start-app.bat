@echo off
echo ========================================
echo  Voice Stress Analysis with Praat
echo ========================================
echo.



echo.
echo Starting Frontend Development Server...
start "Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo  Application Started Successfully!
echo ========================================
echo.
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo.
echo Press any key to close this window...
pause > nul






