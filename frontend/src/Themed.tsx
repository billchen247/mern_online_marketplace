import { CssBaseline, ThemeProvider } from '@mui/material';
import { useMemo, type ReactNode } from 'react';
import { useSettings } from './contexts/SettingsContext';
import { buildTheme } from './layouts/theme';

export function Themed({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const theme = useMemo(() => buildTheme(settings.primaryColor), [settings.primaryColor]);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
