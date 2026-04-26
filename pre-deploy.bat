@echo off
echo 🔍 Vercel Deployment Pre-Check
echo =======================================
echo.

REM Check Node version
for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✓ Node version: %NODE_VERSION%

REM Check npm version
for /f "tokens=*" %%i in ('npm -v') do set NPM_VERSION=%%i
echo ✓ npm version: %NPM_VERSION%

REM Check if .env file exists
if exist .env (
  echo ✓ .env file found
) else (
  echo ✗ .env file NOT found - create from .env.example
)

REM Check if node_modules exists
if exist node_modules (
  echo ✓ node_modules directory found
) else (
  echo ⚠ node_modules NOT found - run 'npm install'
)

REM Check api/index.js
if exist api\index.js (
  echo ✓ api/index.js found
) else (
  echo ✗ api/index.js NOT found
)

REM Check vercel.json
if exist vercel.json (
  echo ✓ vercel.json found
) else (
  echo ✗ vercel.json NOT found
)

echo.
echo =======================================
echo Pre-check complete! Ready to deploy to Vercel.
pause
