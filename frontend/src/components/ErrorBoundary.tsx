import { Button, Container, Stack, Typography } from '@mui/material';
import { Component, type ErrorInfo, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error', error, info.componentStack);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <Container sx={{ maxWidth: 'sm', py: 10 }}>
        <Stack spacing={2} role="alert" sx={{ alignItems: 'center', textAlign: 'center' }}>
          <Typography variant="h4">Something went wrong</Typography>
          <Typography color="text.secondary">An unexpected error occurred. Reloading the page usually fixes it.</Typography>
          <Button variant="contained" onClick={() => window.location.assign('/')}>Back to home</Button>
        </Stack>
      </Container>
    );
  }
}
