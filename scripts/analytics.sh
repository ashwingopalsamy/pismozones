#!/bin/sh
# Runs one Analytics Engine SQL query: npm run analytics -- "SELECT …"
# Needs CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (Account Analytics Read) in the environment.
set -eu
: "${CLOUDFLARE_ACCOUNT_ID:?set CLOUDFLARE_ACCOUNT_ID}"
: "${CLOUDFLARE_API_TOKEN:?set CLOUDFLARE_API_TOKEN (Account Analytics Read)}"
[ $# -eq 1 ] || { echo 'usage: npm run analytics -- "<sql>"' >&2; exit 2; }
curl -s "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/analytics_engine/sql" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" --data "$1"
