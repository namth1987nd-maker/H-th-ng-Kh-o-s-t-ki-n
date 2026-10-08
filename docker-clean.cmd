@echo off
rem ============================================================================
rem  DON RAC DOCKER - giai phong o C
rem   Buoc 1: xoa container da dung, image khong dung, cache build cu (> 3 ngay).
rem   Buoc 2: nen file o dia ao docker_data.vhdx de tra dung luong ve o C (can quyen Admin).
rem  KHONG xoa volume -> du lieu database (phieu, cau hoi, cau tra loi) duoc giu nguyen.
rem  Cach chay day du: chuot phai file nay -> "Run as administrator".
rem ============================================================================
chcp 65001 >nul
cd /d "%~dp0"
setlocal

echo.
echo ===== Dung luong Docker TRUOC khi don =====
docker system df
if errorlevel 1 (
  echo Docker Desktop chua chay - mo Docker Desktop roi chay lai file nay.
  goto :end
)

echo.
echo ===== Buoc 1/2: Don rac ben trong Docker =====
echo - Xoa container da dung (khong xoa container dang chay)...
docker container prune -f
echo - Xoa image khong con dung (giu image cua du an dang dung)...
docker image prune -a -f
echo - Xoa cache build cu hon 3 ngay (giu cache moi de lan build sau van nhanh)...
docker builder prune -a -f --filter "until=72h"
echo - Xoa network khong dung...
docker network prune -f
echo   (KHONG xoa volume: du lieu database duoc giu nguyen)

echo.
echo ===== Dung luong Docker SAU khi don =====
docker system df

rem ---------------------------------------------------------------------------
echo.
echo ===== Buoc 2/2: Nen file o dia ao tren o C =====
net session >nul 2>&1
if errorlevel 1 (
  echo [BO QUA] Can quyen Admin de nen o dia ao.
  echo          Chuot phai docker-clean.cmd -^> "Run as administrator" de lay lai dung luong o C.
  goto :end
)

set "VHDX="
if exist "%LOCALAPPDATA%\Docker\wsl\disk\docker_data.vhdx" set "VHDX=%LOCALAPPDATA%\Docker\wsl\disk\docker_data.vhdx"
if not defined VHDX if exist "%LOCALAPPDATA%\Docker\wsl\data\ext4.vhdx" set "VHDX=%LOCALAPPDATA%\Docker\wsl\data\ext4.vhdx"
if not defined VHDX (
  echo Khong tim thay file o dia ao Docker tren o C - co the da chuyen sang o khac. Bo qua.
  goto :end
)

echo File: %VHDX%
echo Kich thuoc truoc khi nen:
powershell -NoProfile -Command "'{0:N1} GB' -f ((Get-Item -LiteralPath $env:VHDX).Length / 1GB)"

echo - Tat Docker Desktop va WSL (bat buoc truoc khi nen)...
taskkill /im "Docker Desktop.exe" /f >nul 2>&1
taskkill /im "com.docker.backend.exe" /f >nul 2>&1
wsl --shutdown
timeout /t 5 /nobreak >nul

echo - Dang nen (co the mat vai phut, dung tat cua so)...
set "DP=%TEMP%\docker-compact.txt"
> "%DP%" echo select vdisk file="%VHDX%"
>> "%DP%" echo attach vdisk readonly
rem noerr: nen loi van chay tiep lenh detach -> khong de o dia ao bi gan lai (lam Docker khong mo duoc)
>> "%DP%" echo compact vdisk noerr
>> "%DP%" echo detach vdisk noerr
diskpart /s "%DP%"
del "%DP%" >nul 2>&1

echo.
echo Kich thuoc sau khi nen:
powershell -NoProfile -Command "'{0:N1} GB' -f ((Get-Item -LiteralPath $env:VHDX).Length / 1GB)"

echo - Mo lai Docker Desktop...
if exist "%ProgramFiles%\Docker\Docker\Docker Desktop.exe" start "" "%ProgramFiles%\Docker\Docker\Docker Desktop.exe"

:end
echo.
echo Xong.
pause
