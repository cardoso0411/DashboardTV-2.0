@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0" || goto :directory_error

set "PORT=3339"
set "NODE_ENV=production"
set "PM2_HOME=%USERPROFILE%\.pm2"
set "HEALTH_URL=http://127.0.0.1:3339/api/health"
set "DASHBOARD_URL=http://127.0.0.1:3339/#painel-tv"
set "CHROME_PROFILE=%LOCALAPPDATA%\DashboardTVChrome"

where npm.cmd >nul 2>&1 || goto :npm_missing
echo Compilando o Dashboard TV...
call npm.cmd run build
if errorlevel 1 goto :build_error

call :check_server
if not errorlevel 1 goto :server_ready

where pm2.cmd >nul 2>&1 || goto :pm2_missing
call pm2.cmd describe dashboard >nul 2>&1
if errorlevel 1 (
    echo Iniciando o backend pelo PM2...
    call pm2.cmd start "%CD%\backend\server.js" --name dashboard --cwd "%CD%" --time --restart-delay 5000 --max-restarts 10
    if errorlevel 1 goto :pm2_error
    call pm2.cmd save --force
    if errorlevel 1 goto :pm2_error
) else (
    echo Recuperando o backend no PM2...
    call pm2.cmd restart dashboard --update-env
    if errorlevel 1 goto :pm2_error
)

echo Aguardando o servidor responder na porta 3339...
set /a "TRIES=0"
:wait_server
call :check_server
if not errorlevel 1 goto :server_ready
set /a "TRIES+=1"
if %TRIES% geq 45 goto :server_timeout
timeout /t 1 /nobreak >nul
goto :wait_server

:server_ready
set "CHROME="
for %%I in (chrome.exe) do if not "%%~$PATH:I"=="" set "CHROME=%%~$PATH:I"
if not defined CHROME if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined CHROME if exist "%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe" set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if not defined CHROME goto :chrome_missing

echo Abrindo o Painel TV no Chrome...
start "" "%CHROME%" --kiosk --no-first-run --no-default-browser-check --disable-session-crashed-bubble --disable-pinch --overscroll-history-navigation=0 "--user-data-dir=%CHROME_PROFILE%" "%DASHBOARD_URL%"
if errorlevel 1 goto :chrome_error
exit /b 0

:check_server
powershell.exe -NoProfile -NonInteractive -Command "try { $r = Invoke-RestMethod -Uri '%HEALTH_URL%' -TimeoutSec 3; if ($r.status -eq 'ok') { exit 0 } } catch {}; exit 1" >nul 2>&1
exit /b %errorlevel%

:directory_error
echo ERRO: Nao foi possivel acessar a pasta do projeto.
goto :fail
:npm_missing
echo ERRO: npm.cmd nao foi encontrado no PATH.
goto :fail
:build_error
echo ERRO: A compilacao falhou. O Chrome nao sera aberto.
goto :fail
:pm2_missing
echo ERRO: O servidor nao respondeu e pm2.cmd nao foi encontrado no PATH.
goto :fail
:pm2_error
echo ERRO: Nao foi possivel iniciar o backend pelo PM2. Consulte os logs do PM2.
goto :fail
:server_timeout
echo ERRO: O servidor nao respondeu em %HEALTH_URL% apos 45 segundos.
echo Consulte: pm2.cmd logs dashboard
goto :fail
:chrome_missing
echo ERRO: Google Chrome nao foi encontrado nos caminhos habituais.
goto :fail
:chrome_error
echo ERRO: Nao foi possivel abrir o Google Chrome.
goto :fail
:fail
pause
exit /b 1
