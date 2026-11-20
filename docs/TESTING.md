# Testing

| Layer | Tooling | Location | Command |
| --- | --- | --- | --- |
| Backend unit + API integration | Vitest, Supertest, mongodb-memory-server | `backend/tests` | `npm test -w backend` |
| Frontend unit + component/page | Vitest, React Testing Library, MSW, jsdom | `frontend/tests` | `npm test -w frontend` |
| End-to-end | Playwright (Chromium) | `e2e/tests` | `npm run test:e2e` |
| Performance (separate) | k6 | `performance/k6` | `npm run test:performance` |

Everything except Atlas-dependent work is hermetic: backend tests use an in-memory MongoDB; e2e starts its own seeded in-memory API (`npm run dev:memory -w backend`) and Vite on separate ports, so it **never touches Atlas**.

## Coverage thresholds
Enforced in both workspaces: **80% statements / functions / lines, 70% branches** (`npm run test:coverage` fails below them). Thresholds are not lowered and no source files are excluded except `main.tsx`, type declarations and entry/boot files.

## What is covered
- **Backend:** pricing and commission maths, order-status derivation, auth (register/login/lockout/refresh rotation), catalogue queries, cart rules, multi-seller checkout (stock, idempotency, coupon, per-seller split), seller isolation, admin moderation, returns/refunds, role enforcement on every portal.
- **Frontend:** utilities (pricing, roles, format, errors), the API client (bearer header, single-flight 401 → refresh → retry, failure handler) and every service call, role guards, login/register, cart/checkout/orders flows, product pages, and every seller/admin page rendered against MSW fixtures and driven through its actions (dialogs, confirmations, filters, forms).
- **E2E:** buyer journey; seller onboarding + admin approval; seller catalogue; multi-seller checkout; fulfilment through delivery; admin back office; role-boundary checks.

## Notes on the frontend page tests
`frontend/tests/mocks.ts` holds the MSW handlers and fixtures; `tests/render.tsx` mounts the real providers and router and can log in as `buyer`, `seller` or `admin`. `tests/portals.test.tsx` contains a generic "explorer" that clicks every action button inside a page (confirming dialogs) so handlers are exercised; it asserts the page stays alive, while the targeted tests in `buyer.test.tsx`, `components.test.tsx` and `api.test.ts` assert specific behaviour. The explorer is deliberately broad rather than deep — treat it as a smoke net, not proof of every business rule.

## CI
`.github/workflows/ci.yml`: install → lint → typecheck → coverage → build, then Playwright in a second job. Performance tests are intentionally not run in CI.
