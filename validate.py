#!/usr/bin/env python3
"""Validate Python syntax of key backend files."""

import ast
import sys
from pathlib import Path

files_to_check = [
    "api/models/waitlist_entry.py",
    "api/repositories/waitlist_repository.py",
    "api/services/waitlist_service.py",
    "api/services/clase_template_service.py",
    "api/routers/inscripciones.py",
    "api/routers/pagos.py",
]

errors = []
for file in files_to_check:
    path = Path(file)
    if not path.exists():
        errors.append(f"File not found: {file}")
        continue
    
    try:
        with open(path, "r", encoding="utf-8") as f:
            code = f.read()
        ast.parse(code)
        print(f"✓ {file}")
    except SyntaxError as e:
        errors.append(f"Syntax error in {file}: {e}")
    except Exception as e:
        errors.append(f"Error in {file}: {e}")

if errors:
    print("\nErrors found:")
    for error in errors:
        print(f"✗ {error}")
    sys.exit(1)
else:
    print("\n✓ All files validated successfully!")
    sys.exit(0)
