FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# ADDED: Non-root user for container security (semgrep: missing-user)
RUN adduser --disabled-password --no-create-home appuser

# CHANGED: Create data dir + set ownership before switching to non-root user
RUN mkdir -p /app/data && chown -R appuser:appuser /app

EXPOSE 8000
USER appuser

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
