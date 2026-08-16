#!/bin/sh
set -e

echo "=== [ApexPOS Backend] Starting Entrypoint ==="

# Wait for PostgreSQL host/port if configured
if [ -n "$POSTGRES_HOST" ]; then
    echo "Waiting for PostgreSQL ($POSTGRES_HOST:$POSTGRES_PORT)..."
    while ! nc -z "$POSTGRES_HOST" "$POSTGRES_PORT"; do
      sleep 0.5
    done
    echo "PostgreSQL is online and reachable!"
fi

# Run Django migrations automatically
echo "Applying database migrations..."
python manage.py migrate --noinput

echo "=== [ApexPOS Backend] Initialization Complete. Executing CMD ==="
exec "$@"
