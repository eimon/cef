#!/bin/sh
set -e

alembic upgrade head
python scripts/seed_admin.py

exec "$@"
