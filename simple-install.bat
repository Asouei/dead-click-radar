@echo off
echo Cleaning old installations...
rmdir /s /q node_modules 2>nul
rmdir /s /q packages\core\node_modules 2>nul
rmdir /s /q apps\demo\node_modules 2>nul
del pnpm-lock.yaml 2>nul
del package-lock.json 2>nul

echo Installing core package...
cd packages\core
call npm install
if %errorlevel% neq 0 (
    echo Core install failed!
    pause
    exit /b 1
)

echo Building core package...
call npm run build
if %errorlevel% neq 0 (
    echo Core build failed!
    pause
    exit /b 1
)

echo Installing demo package...
cd ..\..\apps\demo
call npm install
if %errorlevel% neq 0 (
    echo Demo install failed!
    pause
    exit /b 1
)

echo Success! Now run: cd apps\demo && npm run dev
pause