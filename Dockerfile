# ---- frontend: static SPA build ----
FROM node:22-slim AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---- runtime: FastAPI serves API + static frontend (same origin) ----
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend/ ./backend/
COPY --from=frontend /app/build ./build
EXPOSE 8000
# Koyeb always defines $PORT (defaults to the lowest exposed port).
CMD ["sh", "-c", "uvicorn server:app --app-dir backend --host 0.0.0.0 --port ${PORT:-8000}"]
