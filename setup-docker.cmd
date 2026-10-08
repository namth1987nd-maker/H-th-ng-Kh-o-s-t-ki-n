@echo off
rem Bam dup file nay de: build + khoi dong he thong bang Docker, ghi log ra setup-log.txt,
rem roi mo trinh duyet neu app da chay. Can Docker Desktop dang chay (bieu tuong mau xanh).
chcp 65001 >nul
cd /d "%~dp0"

if not exist .env copy .env.example .env >nul

echo.
echo [1/3] Dang build va khoi dong (lan dau mat 5-10 phut, dung tat cua so nay)...
echo ===== %date% %time% : docker compose up -d --build ===== > setup-log.txt
docker compose up -d --build >> setup-log.txt 2>&1
set BUILD_EXIT=%ERRORLEVEL%

echo [2/3] Kiem tra trang thai va ghi log...
echo. >> setup-log.txt
echo ===== docker compose ps -a ===== >> setup-log.txt
docker compose ps -a >> setup-log.txt 2>&1
echo. >> setup-log.txt
echo ===== logs migrate ===== >> setup-log.txt
docker compose logs --no-color migrate >> setup-log.txt 2>&1
echo. >> setup-log.txt
echo ===== logs app (100 dong cuoi) ===== >> setup-log.txt
docker compose logs --no-color --tail 100 app >> setup-log.txt 2>&1
echo. >> setup-log.txt
echo ===== ket thuc: %date% %time% (build exit %BUILD_EXIT%) ===== >> setup-log.txt

docker compose ps --status running --services 2>nul | findstr /x app >nul
if %ERRORLEVEL%==0 (
  echo [3/3] THANH CONG - dang mo http://localhost:3000
  timeout /t 5 /nobreak >nul
  start "" http://localhost:3000
) else (
  echo [3/3] CHUA CHAY DUOC - xem setup-log.txt, hoac nhan Claude "xong" de Claude doc log.
)

echo.
pause
