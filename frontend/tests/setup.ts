import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { setAccessToken } from '../src/api/client';
import { resetSession, server } from './mocks';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' } as never));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetSession();
  setAccessToken(null);
  localStorage.clear();
});
afterAll(() => server.close());

window.scrollTo = () => undefined;
window.matchMedia ??= ((q: string) => ({
  matches: false,
  media: q,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  onchange: null,
  dispatchEvent: () => false,
})) as never;
