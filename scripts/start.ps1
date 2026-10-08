# Chạy bằng Docker (khi máy đã có Docker Desktop): npm run start:docker
# Không có Docker thì dùng `npm run local` (PostgreSQL nhúng, không cần cài gì).
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

function Step($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Check($what) { if ($LASTEXITCODE -ne 0) { throw "Lỗi ở bước: $what" } }

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  Write-Host "Không tìm thấy Docker. Dùng: npm.cmd run local" -ForegroundColor Red
  exit 1
}
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
if (-not (Test-Path node_modules)) { npm install; Check "npm install" }

Step "Khởi động PostgreSQL (Docker)"
docker compose up -d --wait db; Check "docker compose up db (Docker Desktop đã mở chưa?)"

Step "Migration + seed"
npm run db:migrate; Check "db:migrate"
npm run db:seed;    Check "db:seed"

Start-Job -ScriptBlock {
  for ($i = 0; $i -lt 60; $i++) {
    try { Invoke-WebRequest http://localhost:3000/api/health -UseBasicParsing | Out-Null; break } catch { Start-Sleep 1 }
  }
  Start-Process http://localhost:3000
} | Out-Null

Step "Chạy ứng dụng tại http://localhost:3000. Ctrl+C để dừng."
npm run dev
