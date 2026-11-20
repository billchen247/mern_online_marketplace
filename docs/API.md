# REST API

Base URL: `/api/v1` (health check: `GET /health`, outside the prefix). All bodies are JSON.

**Envelope** — success: `{ "success": true, "message": "…", "data": … }`; lists add `"pagination": { page, limit, total, totalPages, hasNext, hasPrev }`.
Errors: `{ "success": false, "message": "…", "code"?: "INSUFFICIENT_STOCK", "errors"?: [{ path, message }] }` with the matching HTTP status (400 validation, 401 unauthenticated, 403 forbidden, 404, 409 conflict, 429 rate limit / lockout).

**Auth:** `Authorization: Bearer <accessToken>`. The refresh token is an httpOnly cookie sent to `/auth/refresh`.
Legend: 🌐 public · 🔑 any signed-in user · 🛍 seller · 🛡 admin.

## Auth
| Method & path | Access | Notes |
| --- | --- | --- |
| `POST /auth/register` | 🌐 | `{ name, email, password }` → `{ user, accessToken }` |
| `POST /auth/login` | 🌐 | Locks the account for 15 min after 5 failures |
| `POST /auth/refresh` | 🌐 (cookie) | Rotates the refresh token; reuse of an old one revokes the session |
| `POST /auth/logout` | 🌐 | Clears the cookie |
| `GET /auth/me` | 🔑 | Current user |

## Public catalogue
| Method & path | Notes |
| --- | --- |
| `GET /settings/public` | Marketplace name, shipping/tax display values |
| `GET /home` | `featured`, `popular`, `newArrivals`, `recommended`, `shops`, `categories` |
| `GET /categories`, `/categories/:id` | |
| `GET /products` | `search, category, shop, minPrice, maxPrice, rating, inStock, sort, page, limit` |
| `GET /products/:id` | Includes `related` |
| `GET /shops`, `/shops/:id` | |
| `GET /products/:id/reviews` | Paginated |

## Buyer (🔑)
| Method & path | Notes |
| --- | --- |
| `GET/PATCH /users/me` | Profile, optional password change |
| `GET/POST /users/me/addresses`, `PATCH/DELETE /users/me/addresses/:id` | |
| `GET /notifications`, `POST /notifications/read-all`, `PATCH /notifications/:id/read` | |
| `POST /seller-applications`, `GET /seller-applications/me` | |
| `GET /cart?coupon=`, `POST /cart/items`, `PATCH/DELETE /cart/items/:id`, `DELETE /cart` | Prices are recomputed on every read |
| `GET /wishlist`, `POST /wishlist/items`, `DELETE /wishlist/items/:productId`, `POST /wishlist/items/:productId/move-to-cart` | |
| `POST /orders/checkout` | Header `Idempotency-Key`; body `{ addressId, paymentMethod: card\|paypal\|cod, paymentToken?, couponCode? }`. `409 INSUFFICIENT_STOCK` if stock ran out |
| `GET /orders`, `GET /orders/:id` | Own orders only |
| `POST /orders/:id/cancel`, `POST /orders/:id/returns`, `GET /returns` | Cancel before shipping; returns after delivery |
| `GET /products/:id/reviews/me`, `POST /products/:id/reviews`, `PATCH/DELETE /reviews/:id` | Only purchasers can review |

## Seller (🛍 — `/seller/*`)
`GET/POST /shops`, `GET/PATCH/DELETE /shops/:id` · `GET/POST /products`, `GET/PATCH/DELETE /products/:id`, `PATCH /products/:id/stock`, `GET /products/:id/inventory` · `POST /uploads` (multipart `images`, ≤ 8 files, JPEG/PNG/WebP ≤ 5 MB) · `GET /orders`, `GET /orders/:id`, `PATCH /orders/:id/status`, `PATCH /orders/:id/tracking` · `GET /dashboard`, `/analytics?days=`, `/earnings`, `/payouts`, `POST /payouts` (simulated).
A seller can only see and modify their own shops, products and orders (`403/404` otherwise).

## Admin (🛡 — `/admin/*`)
`GET /dashboard` · `GET /users`, `GET/PATCH /users/:id` (status, add/remove roles) · `GET /audit-logs` · `GET /seller-applications`, `PATCH /seller-applications/:id` · `GET /sellers`, `PATCH /sellers/:id` · `GET /shops`, `PATCH /shops/:id` · `GET /products`, `PATCH /products/:id` · `GET/POST /categories`, `PATCH/DELETE /categories/:id` · `GET /orders`, `GET /orders/:id`, `POST /seller-orders/:id/cancel` · `GET /returns`, `PATCH /returns/:id` · `GET /reviews` · `GET/PATCH /settings`.

## Example
```bash
curl -s -X POST localhost:5000/api/v1/auth/login -H 'content-type: application/json' \
  -d '{"email":"alice@example.com","password":"Password123!"}'
curl -s localhost:5000/api/v1/cart -H "authorization: Bearer $TOKEN"
```
