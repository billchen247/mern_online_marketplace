import { browse, thresholds } from './lib.js';
export const options = {
  stages: [{ duration: '30s', target: 20 }, { duration: '30s', target: 50 }, { duration: '30s', target: 100 }, { duration: '15s', target: 0 }],
  // Stress is about finding the breaking point, so thresholds are informative rather than strict.
  thresholds: { ...thresholds, http_req_duration: ['p(95)<2000'] },
};
export default browse;
