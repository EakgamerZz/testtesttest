@echo off
echo Starting Local Server for Persona Audio Visualizer...
echo This fixes the issue where sound disappears when using the visualizer.
echo.
echo Please wait... opening website...
start http://localhost:8000
python -m http.server 8000
pause
