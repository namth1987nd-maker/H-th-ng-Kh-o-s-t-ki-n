@echo off
rem ============================================================================
rem  DAY DU AN LEN GITHUB (ban moi nhat) - bam dup de chay.
rem   Repo: https://github.com/namth1987nd-maker/H-th-ng-Kh-o-s-t-ki-n
rem   - Lan dau: git init, tao nhanh main, gan remote origin.
rem   - Moi lan: them toan bo thay doi, commit, push.
rem   - KHONG day .env (mat khau, khoa bi mat), storage/ (file Excel du lieu that), node_modules, log.
rem ============================================================================
chcp 65001 >nul
cd /d "%~dp0"
setlocal
set "REMOTE=https://github.com/namth1987nd-maker/H-th-ng-Kh-o-s-t-ki-n.git"

where git >nul 2>&1 || (
  echo Chua cai Git. Tai tai https://git-scm.com/download/win , cai xong mo lai file nay.
  goto :end
)

rem ---- 1. Khoi tao repo (chi lan dau) ----
if not exist .git (
  echo [1/5] Khoi tao git...
  git init || goto :error
) else (
  echo [1/5] Da co git - bo qua khoi tao.
)
git branch -M main

rem ---- 2. Ten / email tac gia (chi dat cho repo nay neu may chua co) ----
for /f "delims=" %%E in ('git config user.email') do set "GIT_EMAIL=%%E"
if not defined GIT_EMAIL (
  git config user.name "namth1987nd"
  git config user.email "namth1987nd@gmail.com"
)

rem ---- 3. Gan remote origin ----
git remote get-url origin >nul 2>&1
if errorlevel 1 (
  git remote add origin %REMOTE% || goto :error
) else (
  git remote set-url origin %REMOTE%
)
echo [2/5] Remote: %REMOTE%

rem ---- 4. Them file + kiem tra an toan ----
echo [3/5] Them toan bo thay doi...
git add -A || goto :error

git diff --cached --name-only | findstr /i /r /c:"^\.env$" /c:"^storage/" /c:"\.local-pg/" >nul
if not errorlevel 1 (
  echo.
  echo DUNG LAI: co file nhay cam ^(.env / storage / .local-pg^) sap bi day len. Kiem tra .gitignore.
  git reset >nul
  goto :end
)

echo.
echo Cac file se duoc day len:
git status --short
echo.

git diff --cached --quiet
if errorlevel 1 (
  echo [4/5] Commit...
  git commit -m "Cap nhat he thong khao sat y kien: %date% %time:~0,5%" || goto :error
) else (
  echo [4/5] Khong co thay doi moi - chi day len.
)

rem ---- 5. Push ----
echo [5/5] Day len GitHub (lan dau se hien cua so dang nhap GitHub)...
git push -u origin main
if errorlevel 1 (
  echo.
  echo Push bi tu choi - thuong do repo tren GitHub da co commit khac ^(vd. README tao luc lap repo^).
  echo Dang gop lich su tu GitHub roi day lai...
  git pull origin main --allow-unrelated-histories --no-edit || goto :error
  git push -u origin main || goto :error
)

echo.
echo XONG - xem tai: https://github.com/namth1987nd-maker/H-th-ng-Kh-o-s-t-ki-n
goto :end

:error
echo.
echo LOI - xem thong bao o tren.

:end
echo.
pause
