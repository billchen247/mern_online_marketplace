#!/usr/bin/env bash
# Performance suite runner (k6). Kept OUT of the normal CI pipeline on purpose.
#
#   npm run test:performance                 # smoke + load against a throw-away in-memory API
#   SCENARIOS="smoke load stress spike soak" npm run test:performance
#   API_URL=https://my-api.onrender.com/api/v1 SCENARIOS=smoke npm run test:performance   # existing target, no local server
#
# Without API_URL the script starts the in-memory seeded API (never Atlas) on port 5055 with rate limiting off.
set -euo pipefail
cd "$(dirname "$0")/.."

command -v k6 >/dev/null || { echo "k6 is not installed (brew install k6 / https://k6.io/docs/get-started/installation/)"; exit 1; }
SCENARIOS="${SCENARIOS:-smoke load}"
OUT="performance/results"
mkdir -p "$OUT"

SERVER_PID=""
cleanup() { [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true; }
trap cleanup EXIT

if [ -z "${API_URL:-}" ]; then
  export API_URL="http://localhost:5055/api/v1"
  PORT=5055 NODE_ENV=development RATE_LIMIT_ENABLED=false npm run dev:memory -w backend >"$OUT/server.log" 2>&1 &
  SERVER_PID=$!
  echo "Waiting for in-memory API..."
  for _ in $(seq 1 90); do curl -fs "http://localhost:5055/health" >/dev/null 2>&1 && break; sleep 1; done
  curl -fs "http://localhost:5055/health" >/dev/null || { echo "API did not start; see $OUT/server.log"; exit 1; }
fi

status=0
for s in $SCENARIOS; do
  echo "=== k6 $s against $API_URL ==="
  k6 run --quiet --summary-export "$OUT/$s.json" "performance/k6/$s.js" | tee "$OUT/$s.txt" || status=$?
done
exit $status
