import { browse, thresholds } from './lib.js';
export const options = {
  stages: [{ duration: '10s', target: 5 }, { duration: '5s', target: 100 }, { duration: '20s', target: 100 }, { duration: '5s', target: 5 }, { duration: '10s', target: 5 }],
  thresholds: { ...thresholds, http_req_duration: ['p(95)<2000'] },
};
export default browse;
