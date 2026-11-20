import { createTheme } from '@mui/material';

export const buildTheme = (primary = '#4f46e5') =>
  createTheme({
    palette: { primary: { main: primary }, secondary: { main: '#f59e0b' }, background: { default: '#f6f7fb' } },
    shape: { borderRadius: 10 },
    typography: { fontFamily: '"Inter","Roboto","Helvetica","Arial",sans-serif', button: { textTransform: 'none', fontWeight: 600 } },
    components: {
      MuiButton: { defaultProps: { disableElevation: true } },
      MuiCard: { styleOverrides: { root: { borderRadius: 12 } } },
    },
  });
