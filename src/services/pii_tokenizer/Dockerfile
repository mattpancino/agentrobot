# Multi-stage lightweight sovereign PII tokenizer container
FROM python:3.13-slim as builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY src/services/pii_tokenizer/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.13-slim as runner

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY src/ /app/src/

ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1
ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "exec uvicorn src.services.pii_tokenizer.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
