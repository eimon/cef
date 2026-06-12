#!/bin/sh
set -e

alembic upgrade head

# Seed minimal:
# python scripts/seed_minimal.py

# Seed activo:
# python scripts/seed_admin.py
python scripts/seed_dev.py

exec "$@"
