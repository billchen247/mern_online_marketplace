#!/usr/bin/env bash
# Lighthouse audit of the production build against a throw-away in-memory API. Not part of CI.
#   bash performance/lighthouse.sh            (needs Chrome/Chromium; set CHROME_PATH if it is not auto-detected)
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=performance/results; mkdir -p "$OUT"
PIDS=()
cleanup() { for p in "${PIDS[@]:-}"; do kill "$p" 2>/dev/null || true; done; pkill -f "vite preview" 2>/dev/null || true; }
trap cleanup EXIT

PORT=5055 RATE_LIMIT_ENABLED=false npm run dev:memory -w backend >"$OUT/lh-server.log" 2>&1 & PIDS+=($!)
(cd frontend && VITE_API_BASE_URL=http://localhost:5055/api/v1 npx vite build >/dev/null && npx vite preview --port 4173 --strictPort >"../$OUT/lh-preview.log" 2>&1) & PIDS+=($!)
for _ in $(seq 1 90); do curl -fs localhost:5055/health >/dev/null && curl -fs localhost:4173 >/dev/null && break; sleep 1; done

PID=$(curl -s 'localhost:5055/api/v1/products?limit=1' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).data[0]._id))')
for page in "home:/" "products:/products" "product-detail:/products/$PID" "login:/login"; do
  name=${page%%:*}; path=${page#*:}
  npx --yes lighthouse "http://localhost:4173$path" --quiet --chrome-flags="--headless=new --no-sandbox --disable-gpu" \
    --output=json --output=html --output-path="$OUT/lh-$name" >/dev/null
  node -e 'const r=require(process.argv[1]);const c=r.categories;console.log(process.argv[2].padEnd(15),Object.entries(c).map(([k,v])=>k+"="+Math.round(v.score*100)).join(" "),"LCP="+r.audits["largest-contentful-paint"].displayValue,"TBT="+r.audits["total-blocking-time"].displayValue,"CLS="+r.audits["cumulative-layout-shift"].displayValue)' "$PWD/$OUT/lh-$name.report.json" "$name"
done
