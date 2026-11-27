import { useLocation } from 'react-router-dom';

export function useRedirect() {
  const loc = useLocation();
  return ((loc.state as { from?: string } | null)?.from ?? '/') as string;
}
