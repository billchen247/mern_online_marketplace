# Performance

Performance testing is **separate from the normal pipeline** (`npm test`, CI): it is slower, machine-dependent and needs extra tools. Results are written to `performance/results/` (git-ignored).

## What was measured, and how

All numbers below were measured on a **developer laptop (Apple Silicon, macOS)**, with the API, MongoDB (an **in-memory `mongodb-memory-server`** instance seeded with the demo data) and the k6 load generator **all on the same machine**, rate limiting disabled. That means:

- They show the application's *relative* behaviour and catch regressions; they are **not** a capacity forecast for Render + Atlas, where network latency, a shared free-tier CPU and cold starts will dominate.
- MongoDB Atlas was not used (the machine's IP isn't allow-listed), so no number here includes a real network hop to a database.

### k6 (`npm run test:performance`)

Requires [k6](https://k6.io). Scenarios live in `performance/k6/`; `performance/run.sh` starts the in-memory API on port 5055 and runs them.

```bash
npm run test:performance                                   # smoke + load
SCENARIOS="smoke load stress spike soak" npm run test:performance
SOAK_DURATION=30m SCENARIOS=soak npm run test:performance   # a real soak
API_URL=https://<api>.onrender.com/api/v1 SCENARIOS=smoke npm run test:performance   # existing deployment
```

| Scenario | Shape | Traffic |
| --- | --- | --- |
| smoke | 1 VU, 30 s | browse + login + cart/orders/wishlist reads |
| load | ramp to 20 VUs (30 s), hold 1 min, ramp down | browse; every 3rd iteration also authenticated reads |
| stress | 20 → 50 → 100 VUs over 90 s | browse (home, list, detail, search, categories) |
| spike | 5 → 100 VUs in 5 s, hold 20 s, back to 5 | browse |
| soak | 10 VUs, 2 min by default (configurable) | browse |

Thresholds (smoke/load/soak): `http_req_failed < 1%`, `p(95) < 800 ms`, `p(99) < 1500 ms`, checks `> 99%`; stress/spike use `p(95) < 2000 ms`. The scenarios deliberately **do not place orders** so stock and data stay stable across runs.

**Results (actual run):**

| Scenario | Requests | Req/s | avg | median | p90 | p95 | max | Failed | Checks | Peak VUs | Thresholds |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| smoke | 117 | 3.7 | 10.6 ms | 2.8 ms | 64.6 ms | 68.1 ms | 74.3 ms | 0% | 100% | 1 | pass |
| load | 6,259 | 59.1 | 2.7 ms | 2.0 ms | 5.5 ms | 8.2 ms | 59.6 ms | 0% | 100% | 20 | pass |
| stress | 17,430 | 163.6 | 2.4 ms | 2.0 ms | 4.0 ms | 5.2 ms | 48.8 ms | 0% | 100% | 100 | pass |
| spike | 10,495 | 204.0 | 2.5 ms | 2.1 ms | 4.4 ms | 5.7 ms | 27.5 ms | 0% | 100% | 100 | pass |
| soak (2 min) | 4,680 | 38.4 | 2.8 ms | 2.0 ms | 5.4 ms | 9.0 ms | 46.7 ms | 0% | 100% | 10 | pass |

Reading the results:
- The smoke p90/p95 (~65 ms) is the **login request** (bcrypt hashing is intentionally slow); the other scenarios are almost entirely cheap read endpoints, so their percentiles are tiny.
- **No breaking point was found**: even at 100 VUs the API never exceeded 49 ms max latency with zero errors. Finding the limit would need much higher load, a remote database, or write-heavy scenarios (checkout), none of which were run.
- The soak was **2 minutes, not hours**, so it says nothing about memory leaks or connection-pool exhaustion over long periods. Run `SOAK_DURATION=30m` (or longer) against a staging deployment for that.
- The 5-failed-login lockout and auth rate limiter are real protections; rate limiting was turned off for these runs so the limiter itself wasn't measured.

### Lighthouse (`bash performance/lighthouse.sh`)

Audits the **production build** served by `vite preview` (port 4173) against the in-memory API, in headless Chromium, with Lighthouse's default mobile emulation and simulated throttling. Needs Chrome/Chromium (`CHROME_PATH`); Lighthouse itself is fetched with `npx`.

**Results (actual run, one run per page — Lighthouse scores vary by a few points between runs):**

| Page | Performance | Accessibility | Best practices | SEO | FCP | LCP | TBT | CLS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Home `/` | 95 | 94 | 96 | 92 | 0.6 s | 2.8 s | 70 ms | 0 |
| Products `/products` | 82 | 99 | 96 | 92 | 0.6 s | 3.4 s | 50 ms | 0.021 |
| Product detail | 84 | 99 | 96 | 92 | 0.6 s | 4.5 s | 80 ms | 0 |
| Login `/login` | 94 | 100 | 96 | 91 | 0.6 s | 3.1 s | 30 ms | 0 |

Findings worth acting on (read from the Lighthouse JSON; none fixed yet):
- **LCP is the weak spot** (2.8–4.5 s on the mobile profile). I did not identify the exact LCP element. Contributing factors I can confirm: the seed data uses remote `picsum.photos` images (so image fetch time is outside our control and unrepresentative of Cloudinary), and product images are only requested after the API payload arrives. Ideas to try, then re-measure: `fetchpriority="high"` / explicit dimensions on the first product images, resized images via Cloudinary transformations, and prefetching the home payload.
- **Accessibility 94 on the home page:** the failing audits are **color contrast** (body text in MUI typography) and **heading order** (an `h6` follows the page's heading levels out of sequence). Both are small CSS/markup fixes.
- **`errors-in-console`** is a `401 Unauthorized`: on every page load the SPA calls `POST /auth/refresh` to restore a session, and for an anonymous visitor that correctly returns 401, which the browser logs. Harmless functionally but it costs a best-practices point; a non-secret "has session" hint cookie would avoid the call.
- `robots.txt`, `llms.txt` and the "agentic browsing" category are informational; the app ships no `robots.txt` yet.
- The JS is split (vendor ~304 kB, MUI ~373 kB, lazy per-page chunks); MUI dominates the initial payload.

These are lab numbers from a laptop, not field data.
