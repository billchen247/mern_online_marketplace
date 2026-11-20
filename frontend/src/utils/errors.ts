import axios from 'axios';

/** Extracts a readable message from an API error envelope. */
export function getErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string; errors?: { message?: string }[] } | undefined;
    if (data?.errors?.length && data.errors[0]?.message) return `${data.message ?? ''} ${data.errors.map((e) => e.message).join('; ')}`.trim();
    if (data?.message) return data.message;
    if (err.code === 'ERR_NETWORK') return 'Cannot reach the server. Check your connection.';
    return err.message || fallback;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
