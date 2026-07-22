# --- Stage 1: Build the React Frontend ---
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Package the FastAPI Backend ---
FROM python:3.11-slim
WORKDIR /app

# Install git
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all application code
COPY . .

# Copy compiled frontend from Step 1
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

EXPOSE 8000
ENV PORT=8000

# Run the FastAPI server
CMD ["python", "app.py"]
