@echo off
echo Installing Dead-Click Radar dependencies...

echo Installing root dependencies...
call npm install

echo Installing core package dependencies...
cd packages\core
call npm install
cd ..\..

echo Installing demo package dependencies...
cd apps\demo
call npm install
cd ..\..

echo Building core library...
cd packages\core
call npm run build
cd ..\..

echo Setup complete!
echo.
echo To start demo: cd apps\demo && npm run dev
pause