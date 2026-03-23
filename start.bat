@echo off
echo.
echo  NexusChat - Starting local dev servers...
echo.
start "NexusChat Backend :3000" cmd /k "cd /d "%~dp0server" && npm run dev"
timeout /t 2 /nobreak > nul
start "NexusChat Admin :5173" cmd /k "cd /d "%~dp0admin" && npm run dev"
echo.
echo  Both servers started!
echo  Admin panel : http://localhost:5173
echo  Demo widget : http://localhost:3000/demo
echo  Health check: http://localhost:3000/api/health
echo.
pause
