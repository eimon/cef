#!/bin/sh
set -e

alembic upgrade head

# Seed activo:
python scripts/seed_admin.py
python scripts/seed_dev.py

# Seed minimo:
# "python scripts/seed_minimal.py"

exec "$@"
