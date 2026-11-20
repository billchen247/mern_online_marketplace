import { browse, buyerJourney, login, thresholds } from './lib.js';
export const options = { vus: 1, duration: '30s', thresholds };
export default function () {
  browse();
  const t = login('alice@example.com');
  if (t) buyerJourney(t);
}
