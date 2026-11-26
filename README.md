# MERN Online Marketplace

A multi-vendor online marketplace built with **MongoDB, Express 5, React 19 and Node 22** (TypeScript throughout).
Buyers shop across many independent sellers in a single checkout; sellers run several shops from one portal; admins moderate everything.

> **Payments, payouts and shipping are simulated.** No real money moves and no card data is stored. The UI says so wherever it matters.

## Features

| Area      | What you get                                                                                                                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Buyer     | Home, server-side search/filter/sort/pagination, product detail, cart (with coupons), wishlist, checkout (simulated payment), orders, cancel / return / refund, reviews, addresses, notifications            |
| Seller    | Application + admin approval, dashboard, **multiple shops**, product CRUD with image upload, inventory + stock history, per-seller order fulfilment with tracking, simulated earnings / commission / payouts |
| Admin     | Dashboard, users + additive roles, seller applications, sellers, shops, products, categories, orders, returns and refunds, review moderation, marketplace settings                                            |
| Platform  | Roles are an additive array (`user`, `seller`, `admin`) enforced on the server; JWT access token + rotating httpOnly refresh cookie with reuse detection; rate limiting; Helmet; Zod validation everywhere    |
| Ordering  | One parent `Order` + one `SellerOrder` per seller, price/name/image snapshots, atomic stock decrement, `Idempotency-Key` support, server-side commission                                                      |

## Repository layout

```
backend/      Express REST API (routes → controllers → services → models), seed script, Vitest + Supertest tests
frontend/     React + Vite + MUI storefront, seller portal and admin back office, Vitest + RTL + MSW tests
e2e/          Playwright scenarios (self-contained: in-memory seeded API, never touches Atlas)
performance/  k6 scenarios + runner (kept out of the normal CI pipeline)
docs/         ARCHITECTURE, DATABASE, API, DEPLOYMENT, TESTING, PERFORMANCE
render.yaml   Render blueprint (static site + web service)
```

## Quick start

Requires Node 22+ and npm 10+.

```bash
npm install
cp backend/.env.example backend/.env        # then edit — see "Configuration"
npm run seed                                 # idempotent demo data
npm run dev                                  # API :5000, web :5173
```

No MongoDB handy? Run the API on a throw-away, pre-seeded in-memory database (what the e2e tests use):

```bash
npm run dev:memory -w backend                # API on :5000 with demo data
npm run dev -w frontend
```

### Demo accounts

All demo accounts use the password **`Password123!`** (seed data only — never reuse it anywhere real).

| Role                     | Email                                                                  |
| ------------------------ | ---------------------------------------------------------------------- |
| Buyer                    | `alice@example.com`, `bob@example.com`, `carol@example.com`, `dave@example.com` |
| Buyer with a pending seller application | `erin@example.com`                                      |
| Seller                   | `sam.seller@example.com`, `sofia.seller@example.com`, `sunny.seller@example.com` |
| Admin                    | `admin@example.com`                                                    |
| Admin **and** seller     | `admin.seller1@example.com`, `admin.seller2@example.com`               |

Coupon: `WELCOME10`. Test payment token: `tok_visa` (simulated).

### Configuration

Backend variables live in `backend/.env` (git-ignored; template in `backend/.env.example`). Highlights:

| Variable                                | Notes                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `MONGODB_URI`                           | MongoDB Atlas (or local) connection string. **Never commit it.**                                  |
| `JWT_SECRET`, `JWT_REFRESH_SECRET`      | ≥ 16 chars, required in production                                                                |
| `CLIENT_URL`                            | Allowed CORS origin (the frontend URL)                                                            |
| `COOKIE_SAMESITE`, `COOKIE_SECURE`      | Use `none` + `true` when frontend and API are on different sites (Render)                         |
| `CLOUDINARY_*`                          | Optional. Without them uploads fall back to local disk (`backend/uploads`, ephemeral on Render)   |
| `ALLOW_SEED`                            | Must be `true` for destructive `npm run seed -- --reset`; refused in production                   |

Frontend: `VITE_API_BASE_URL` (defaults to `http://localhost:3000/api/v1`).

> **Atlas note:** Atlas only accepts connections from allow-listed IPs. Add your IP under *Network Access* before running `npm run seed` or `npm run dev` against it.

## Scripts (repo root)

| Command                   | What it does                                                           |
| ------------------------- | ---------------------------------------------------------------------- |
| `npm run dev`             | API + web with hot reload                                              |
| `npm run build`           | Type-check and build backend and frontend                              |
| `npm run lint`            | ESLint (zero warnings allowed)                                         |
| `npm run typecheck`       | `tsc --noEmit` in both workspaces                                      |
| `npm test`                | Backend + frontend tests                                               |
| `npm run test:coverage`   | Same, with coverage thresholds (80 / 80 / 80 lines-statements-functions, 70 branches) |
| `npm run test:e2e`        | Playwright (starts its own in-memory API + Vite)                       |
| `npm run test:performance`| k6 smoke + load (needs `k6`); see `docs/PERFORMANCE.md`                |
| `npm run seed`            | Idempotent seed; `-- --reset` wipes first (needs `ALLOW_SEED=true`)    |

## Documentation

- [Architecture](docs/ARCHITECTURE.md) · [Database](docs/DATABASE.md) · [API](docs/API.md)
- [Deployment (Render)](docs/DEPLOYMENT.md) · [Testing](docs/TESTING.md) · [Performance](docs/PERFORMANCE.md)

## Known limitations

- Payments, refunds, payouts and shipping carriers are **simulated**.
- Local-disk image uploads are lost on Render's free tier; configure Cloudinary for persistence.
- No email delivery (notifications are in-app only); no real-time updates.
- Free-tier Render services sleep when idle, so the first request after a pause is slow.
