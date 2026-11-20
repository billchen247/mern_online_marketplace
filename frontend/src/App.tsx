import { CssBaseline, ThemeProvider } from '@mui/material';
import { useMemo, type ReactNode } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { NotifyProvider } from './contexts/NotifyContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { buildTheme } from './layouts/theme';
import { AppRoutes } from './routes/AppRoutes';

function Themed({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const theme = useMemo(() => buildTheme(settings.primaryColor), [settings.primaryColor]);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

/** Provider stack shared by the app and by tests (router is supplied by the caller). */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <Themed>
        <ErrorBoundary>
          <NotifyProvider>
            <AuthProvider>
              <CartProvider>{children}</CartProvider>
            </AuthProvider>
          </NotifyProvider>
        </ErrorBoundary>
      </Themed>
    </SettingsProvider>
  );
}

export default function App() {
  return (
    <Providers>
      <AppRoutes />
    </Providers>
  );
}
