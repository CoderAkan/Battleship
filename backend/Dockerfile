# syntax=docker/dockerfile:1
FROM python:3.13-slim

# System deps. cryptography (pulled in by pyjwt[crypto]) sometimes needs
# build tools on slim images; we use the prebuilt wheel by adding nothing
# extra. If you ever see a build error about cryptography, uncomment the
# build-essentials line below.
#
# RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first — this layer caches as long as requirements.txt
# doesn't change, so code edits don't trigger a full reinstall.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code.
COPY . .

# Fly's internal default; can be overridden by the runtime.
EXPOSE 8000

# Run uvicorn directly — single worker because the multiplayer module
# uses in-memory state. Multiple workers would mean players on different
# workers can't see each other's rooms.
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]