# Explicit build: Railway's auto-detection failed on this directory, and a
# webhook receiver is not worth debugging a builder heuristic over.
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Unbuffered so log lines reach Railway as they happen, not at flush time.
ENV PYTHONUNBUFFERED=1

# One worker: the dedup + delivery log is a SQLite file on a single volume, so
# a second process would keep its own state and send its own copy of every DM.
# Shell form on purpose — $PORT is injected at runtime.
CMD gunicorn --workers 1 --threads 8 --timeout 60 --bind 0.0.0.0:$PORT app:app
