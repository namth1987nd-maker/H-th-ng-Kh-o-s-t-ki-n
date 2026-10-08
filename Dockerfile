# syntax=docker/dockerfile:1

# ---- Nền chung: Node + LibreOffice (xuất PDF) + font tiếng Việt ----
FROM node:22-bookworm-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends \
      libreoffice-writer libreoffice-calc fonts-liberation fonts-dejavu-core fonts-noto-core \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# ---- Cài toàn bộ dependency (dùng cho build, migrate, worker) ----
# Chỉ chạy lại khi package.json / package-lock.json đổi; cache npm giữ giữa các lần build.
FROM base AS tools
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
COPY . .

# ---- Build Next.js (standalone) ----
# .next/cache giữ giữa các lần build → chỉ biên dịch lại phần code đã đổi.
FROM tools AS build
ENV NEXT_TELEMETRY_DISABLED=1
RUN --mount=type=cache,target=/app/.next/cache npm run build

# ---- Chạy ứng dụng ----
FROM base AS app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY templates ./templates
EXPOSE 3000
CMD ["node", "server.js"]
