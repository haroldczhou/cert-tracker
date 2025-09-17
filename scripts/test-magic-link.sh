#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   BASE_URL="https://<your-swa>.azurestaticapps.net" EMAIL="user@school.edu" ./scripts/test-magic-link.sh

BASE_URL=${BASE_URL:-http://localhost:4280}
EMAIL=${EMAIL:-}

if [[ -z "$EMAIL" ]]; then
  echo "EMAIL is required. Example: EMAIL=user@school.edu $0" >&2
  exit 1
fi

echo "Requesting magic link for $EMAIL at $BASE_URL ..."
curl -sS -X POST "$BASE_URL/api/requestMagicLink" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\"}" | jq .

echo "Done. If in dev, response includes 'link'. In production, check the inbox."

