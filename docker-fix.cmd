@echo off
rem ============================================================================
rem  SUA LOI "Docker Desktop is unable to start"
rem   - Go file o dia ao docker_data.vhdx neu con bi gan vao Windows (vd. sau khi nen bi gian doan)
rem   - Tat sach Docker Desktop + WSL, roi mo lai Docker Desktop
rem  Chay: chuot phai -> "Run as administrator". KHONG xoa du lieu.
rem ============================================================================
chcp 65001 >nul
setlocal

net session >nul 2>&1
if errorlevel 1 (
  echo Can quyen Admin: chuot phai docker-fix.cmd -^> "Run as administrator".
  goto :end
)

echo [1/4] Tat Docker Desktop...
taskkill /im "Docker Desktop.exe" /f >nul 2>&1
taskkill /im "com.docker.backend.exe" /f >nul 2>&1
taskkill /im "com.docker.build.exe" /f >nul 2>&1

echo [2/4] Tat WSL...
wsl --shutdown
timeout /t 5 /nobreak >nul

echo [3/4] Go file o dia ao neu con bi gan (bao loi "not attached" la binh thuong)...
set "VHDX="
if exist "%LOCALAPPDATA%\Docker\wsl\disk\docker_data.vhdx" set "VHDX=%LOCALAPPDATA%\Docker\wsl\disk\docker_data.vhdx"
if not defined VHDX if exist "%LOCALAPPDATA%\Docker\wsl\data\ext4.vhdx" set "VHDX=%LOCALAPPDATA%\Docker\wsl\data\ext4.vhdx"
if defined VHDX (
  set "DP=%TEMP%\docker-detach.txt"
  > "%TEMP%\docker-detach.txt" echo select vdisk file="%VHDX%"
  >> "%TEMP%\docker-detach.txt" echo detach vdisk
  diskpart /s "%TEMP%\docker-detach.txt"
  del "%TEMP%\docker-detach.txt" >nul 2>&1
) else (
  echo Khong thay file o dia ao tren o C - bo qua.
)

echo [4/4] Mo lai Docker Desktop (cho 1-2 phut den khi bieu tuong mau xanh)...
if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"

echo.
echo Doi bieu tuong Docker mau xanh, roi bam dup setup-docker.cmd (hoac dev.cmd).
echo Neu van loi "unable to start": KHOI DONG LAI MAY roi mo Docker Desktop.

:end
echo.
pause
