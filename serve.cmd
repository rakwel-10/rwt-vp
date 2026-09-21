@echo off
REM RWT-iDecide - serve the funnel over http.
REM
REM You do not need this to view the funnel: just open index.html.
REM It is here for the two cases that need a real origin - posting to the
REM GoHighLevel webhook, and running tools/overflow.html.

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto nonode

start "" http://localhost:8080
node serve.js 8080
goto :eof

:nonode
echo Node was not found on this machine.
echo Open this folder in VS Code and use the Live Server extension instead.
pause
