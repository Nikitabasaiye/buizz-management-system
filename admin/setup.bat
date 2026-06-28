@echo off
echo ====================================
echo Buizz Admin App Setup
echo ====================================
echo.

echo [1/3] Installing dependencies...
call npm install

echo.
echo [2/3] Creating logs directory...
if not exist logs mkdir logs

echo.
echo [3/3] Setup complete!
echo.
echo ====================================
echo Quick Start:
echo ====================================
echo.
echo Development: npm run dev
echo Production:  npm start
echo PM2:         npm run pm2:start
echo.
echo App will run on: http://localhost:5001
echo.
echo Default admin secret: change-this-admin-secret
echo.
echo See QUICKSTART.md for testing guide
echo ====================================
pause
