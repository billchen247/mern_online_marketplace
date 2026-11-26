import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

/** Access token lives in memory only; the refresh token is an httpOnly cookie managed by the API. */
let accessToken: string | null = null;
let onAuthFailure: (() => void) | null = null;
export const setAccessToken = (t: string | null) => {
  accessToken = t;
};
export const getAccessToken = () => accessToken;
export const setAuthFailureHandler = (fn: (() => void) | null) => {
  onAuthFailure = fn;
};

export const api = axios.create({ baseURL: API_BASE_URL, withCredentials: true, timeout: 20000 });

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshing: Promise<string | null> | null = null;
export async function refreshAccessToken(): Promise<string | null> {
  refreshing ??= axios
    .post(`${API_BASE_URL}/auth/refresh`, undefined, { withCredentials: true })
    .then((r) => {
      accessToken = r.data.data.accessToken as string;
      return accessToken;
    })
    .catch(() => {
      accessToken = null;
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isAuthCall = original?.url?.includes('/auth/');
    if (error.response?.status === 401 && original && !original._retried && !isAuthCall && accessToken) {
      original._retried = true;
      const token = await refreshAccessToken();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api.request(original);
      }
      onAuthFailure?.();
    }
    return Promise.reject(error);
  },
);

/** Unwrap `{ success, message, data }`. */
export async function unwrap<T>(p: Promise<{ data: { data: T } }>): Promise<T> {
  return (await p).data.data;
}
/** Unwrap a paginated envelope. */
export async function unwrapPaged<T>(p: Promise<{ data: { data: T[]; pagination: import('../types').Pagination } }>) {
  const r = (await p).data;
  return { data: r.data, pagination: r.pagination };
}
