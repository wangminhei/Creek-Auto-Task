@echo off
title Creek Auto Task
color 0A

cd %~dp0

echo Configuration files checked.

echo Checking dependencies...
if exist "..\node_modules" (
    echo Using node_modules from parent directory...
    cd ..
    CALL npm install @mysten/sui.js dotenv https-proxy-agent
    cd %~dp0
) else (
    echo Installing dependencies in current directory...
    CALL npm install @mysten/sui.js dotenv https-proxy-agent
)
echo Dependencies installation completed!
title Creek Auto Task
echo Starting the bot...
node index.js

pause
exit
