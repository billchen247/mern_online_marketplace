import { browse, thresholds } from './lib.js';
// Default is a short soak so it is runnable locally; set SOAK_DURATION=30m for a real one.
export const options = { vus: 10, duration: __ENV.SOAK_DURATION || '2m', thresholds };
export default browse;
