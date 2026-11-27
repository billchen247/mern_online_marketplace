import { Button, Container, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export function Forbidden() {
  return (
    <Container sx={{ maxWidth: 'sm', py: 10 }}>
      <Stack spacing={2} role="alert" sx={{ alignItems: 'center', textAlign: 'center' }}>
        <Typography variant="h4" component="h1">
          Access denied
        </Typography>
        <Typography color="text.secondary">Your account does not have permission to view this page.</Typography>
        <Button component={RouterLink} to="/" variant="contained">
          Back to home
        </Button>
      </Stack>
    </Container>
  );
}
