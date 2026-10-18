#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
python3 - <<'PY'
import os
import secrets
from pathlib import Path

target = Path('.env.v2')
if target.exists():
    print('Keeping existing .env.v2 unchanged.')
else:
    password = secrets.token_hex(24)
    fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as output:
        output.write('COMPOSE_FILE=docker-compose.yml\n')
        output.write('POSTGRES_PASSWORD=' + password + '\n')
    print('Created private .env.v2 with a random local database password.')
print('From the repository root, load it with: set -a; . ./.env.v2; set +a')
PY
