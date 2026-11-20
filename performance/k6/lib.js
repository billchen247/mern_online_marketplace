import http from 'k6/http';
import { check, group, sleep } from 'k6';

export const BASE = __ENV.API_URL || 'http://localhost:5055/api/v1';
const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } };

/** Browses the public catalog the way an anonymous visitor would. */
export function browse() {
  group('browse', () => {
    check(http.get(`${BASE}/home`), { 'home 200': (r) => r.status === 200 });
    const list = http.get(`${BASE}/products?limit=12&sort=newest`);
    check(list, { 'products 200': (r) => r.status === 200 });
    const first = list.status === 200 ? list.json('data.0._id') : null;
    if (first) check(http.get(`${BASE}/products/${first}`), { 'product 200': (r) => r.status === 200 });
    check(http.get(`${BASE}/products?search=a&limit=12`), { 'search 200': (r) => r.status === 200 });
    check(http.get(`${BASE}/categories`), { 'categories 200': (r) => r.status === 200 });
  });
  sleep(Math.random() * 1.5 + 0.5);
}

export function login(email, password = 'Password123!') {
  const r = http.post(`${BASE}/auth/login`, JSON.stringify({ email, password }), JSON_HEADERS);
  check(r, { 'login 200': (x) => x.status === 200 });
  return r.status === 200 ? r.json('data.accessToken') : null;
}

/** Authenticated buyer journey: cart read + add item. Does not place orders (keeps stock stable). */
export function buyerJourney(token) {
  const auth = { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } };
  group('buyer', () => {
    check(http.get(`${BASE}/cart`, auth), { 'cart 200': (r) => r.status === 200 });
    check(http.get(`${BASE}/orders`, auth), { 'orders 200': (r) => r.status === 200 });
    check(http.get(`${BASE}/wishlist`, auth), { 'wishlist 200': (r) => r.status === 200 });
  });
  sleep(1);
}

export const thresholds = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<800', 'p(99)<1500'],
  checks: ['rate>0.99'],
};
