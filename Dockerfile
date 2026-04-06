# ---- builder stage ----
FROM python:3.13-slim AS builder

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc \
    && rm -rf /var/lib/apt/lists/*

COPY api/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --prefix=/install -r /tmp/requirements.txt

# ---- final stage ----
FROM python:3.13-slim

COPY --from=builder /install /usr/local

RUN groupadd --system appgroup \
    && useradd --system --gid appgroup appuser

WORKDIR /app
COPY api/ /app/
COPY api/entrypoint.sh /entrypoint.sh

RUN sed -i 's/\r$//' /entrypoint.sh && chmod +x /entrypoint.sh

USER appuser

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
