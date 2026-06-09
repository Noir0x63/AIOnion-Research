@echo off
title Tor Dark Web Agent Launcher
cls
echo ==================================================
echo         Tor Dark Web Agent - Launcher
echo ==================================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please download and install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b
)

:: Run the agent UI
echo Starting Web UI server...
echo.
echo Opening GUI in your default browser at http://localhost:3000 ...
start http://localhost:3000
npm run ui

if %errorlevel% neq 0 (
    echo.
    echo [INFO] Agent execution stopped or failed.
    echo.
    pause
)
