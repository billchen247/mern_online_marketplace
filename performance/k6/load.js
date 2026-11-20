import { browse, buyerJourney, login, thresholds } from './lib.js';
export const options = {
  stages: [{ duration: '30s', target: 20 }, { duration: '1m', target: 20 }, { duration: '15s', target: 0 }],
  thresholds,
};
export function setup() {
  return { token: login('alice@example.com') };
}
export default function (d) {
  browse();
  if (d.token && __ITER % 3 === 0) buyerJourney(d.token);
}
