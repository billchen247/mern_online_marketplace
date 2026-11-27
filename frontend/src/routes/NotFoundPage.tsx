import { Button, Container, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <Container sx={{ maxWidth: 'sm', py: 10 }}>
      <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center' }}>
        <Typography variant="h3" component="h1">
          404
        </Typography>
        <Typography color="text.secondary">We couldn’t find the page you’re looking for.</Typography>
        <Button component={RouterLink} to="/" variant="contained">
          Back to home
        </Button>
      </Stack>
    </Container>
  );
}
