# Database

MongoDB via Mongoose. Seed with `npm run seed` (idempotent: re-running updates rather than duplicates).

| Collection | Purpose | Notable fields / indexes |
| --- | --- | --- |
| `users` | Accounts | `email` (unique, lowercase), `roles[]`, `status`, hashed password, refresh-token families, lockout counters; text index on name/email; index on `roles` |
| `addresses` | Buyer address book | `user`, recipient, line1/2, city, state, postal code, country, `isDefault` |
| `sellerapplications` | Become-a-seller requests | `user`, business info, `applicationStatus` (pending/approved/rejected/suspended), reviewer + notes |
| `shops` | A seller may own many | `seller`, `slug` (unique), `status`; text index on name/description |
| `categories` | Product taxonomy | `name`, `slug` (unique), `status` |
| `products` | Catalogue | `shop`, `seller`, `category`, `slug` (unique), `price`, `discount`, `stock`, `sku`, `images[]`, `specifications[]`, `status`, rating + sales counters. Indexes: text (name ×5, description), unique `(shop, sku)`, `(status, category, price)`, `(status, createdAt)`, `(status, salesCount)` |
| `carts`, `wishlists` | Per-user state | Items reference products; prices are read live, never stored |
| `orders` | **Parent** order | `orderNumber` (`MP-…`, unique), `buyer`, shipping address snapshot, totals, payment method/status, `orderStatus`, discount/coupon, `idempotencyKey`. Unique `(buyer, idempotencyKey)` |
| `sellerorders` | **Per-seller** sub-order | `orderNumber`, `parentOrder`, `seller`, item **snapshots**, `commission`, `sellerEarnings`, `fulfillmentStatus`, tracking, `statusHistory[]`. Indexes `(seller, createdAt)`, `(seller, fulfillmentStatus)` |
| `returnrequests` | Return / refund workflow | order, sellerOrder, items, reason, status, refund amount, admin notes |
| `reviews` | Product reviews | one per buyer/product; only purchasers can review; moderation status |
| `inventorylogs` | Stock audit trail | product, delta, stock after, reason (sale/adjustment/cancel/return), note |
| `commissionrecords` | Simulated commission ledger | one per `sellerOrder` (unique) |
| `payoutrecords` | Simulated payouts | `reference` (unique), amount, status |
| `notifications` | In-app notifications | recipient, type, title, message, `read` |
| `auditlogs` | Admin action trail | actor, action, target, metadata |
| `settings` | Singleton (`key: 'marketplace'`) | marketplace name, commission rate, shipping + tax rules, moderation toggles, coupons |

## Order status model

`SellerOrder.fulfillmentStatus`: `pending → processing → shipped → delivered`, or `cancelled` (transitions validated server-side).
`Order.orderStatus` is **derived** from its sub-orders and `paymentStatus` (all cancelled → `cancelled`, taking precedence over `refunded`).

## Seeding safeguards

- Re-runnable: existing records (matched by email, slug, SKU) and stock levels are left untouched, so running it twice never duplicates data.
- `--reset` drops the database and requires `ALLOW_SEED=true`.
- The whole seed script is **refused when `NODE_ENV=production`**.
- Demo password hash is generated at seed time; nothing sensitive is stored in the repo.
