@echo off
title Imbalance
cd /d "%~dp0"
echo.
echo   Imbalance
echo   ---------

where node >nul 2>nul
if errorlevel 1 (
  echo   Node.js is not installed. Imbalance needs it to run.
  echo.
  where winget >nul 2>nul
  if errorlevel 1 (
    echo   Download the LTS version from https://nodejs.org, install it,
    echo   then double-click Start Imbalance again.
    start "" https://nodejs.org
    pause
    exit /b 1
  )
  choice /m "  Install Node.js now"
  if errorlevel 2 exit /b 1
  winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
  echo.
  echo   Done. Double-click Start Imbalance again to open the app.
  pause
  exit /b 0
)

node tools\launch.mjs
if errorlevel 1 pause
