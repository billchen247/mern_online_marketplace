import type { ReactNode } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { NotifyProvider } from './contexts/NotifyContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { Themed } from './Themed';

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
