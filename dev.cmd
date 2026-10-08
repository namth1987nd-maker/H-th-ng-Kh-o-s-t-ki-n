@echo off
rem ============================================================================
rem  CHE DO PHAT TRIEN - bam dup de chay. KHONG build image Docker.
rem   - Database: PostgreSQL trong Docker (chi container "db").
rem   - App: chay thang tren may bang "next dev" -> sua code la trang tu cap nhat.
rem  Can: Docker Desktop dang chay (bieu tuong xanh).
rem ============================================================================
chcp 65001 >nul
cd /d "%~dp0"
if not exist .env copy .env.example .env >nul

echo [1/4] Khoi dong database (Docker)...
rem tat app/worker ban production (neu dang chay) de giai phong cong 3000
docker compose stop app worker >nul 2>&1
docker compose up -d --wait db || goto :error

echo [2/4] Kiem tra thu vien (chi cai them khi package.json thay doi)...
call npm install --no-audit --no-fund --loglevel=error || goto :error

echo [3/4] Migration + seed...
call npm run db:migrate || goto :error
call npm run db:seed || goto :error

echo.
echo [4/4] Dang chay app tai http://localhost:3000
echo       Sua code -^> luu file -^> trang tu cap nhat, KHONG can build.
echo       Nhan Ctrl+C de dung.
echo.
start "" cmd /c "timeout /t 10 /nobreak >nul & start http://localhost:3000"
call npm run dev
goto :eof

:error
echo.
echo LOI - xem thong bao o tren (Docker Desktop da mo chua?).
pause
