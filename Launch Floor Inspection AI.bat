@echo off
rem Double-click to start the Floor Inspection AI backend + ngrok and open the app.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-public.ps1" %*
