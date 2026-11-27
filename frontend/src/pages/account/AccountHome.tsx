import { Box, Button, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { PageHeader } from '../../components/common';
import { useAuth } from '../../contexts/AuthContext';

export function AccountHome() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader title={`Hello, ${user?.name.split(' ')[0]}`} subtitle="Manage your orders, addresses and account settings." />
      <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
        {user?.roles.map((r) => (
          <Chip key={r} label={r} color={r === 'user' ? 'default' : 'primary'} />
        ))}
      </Stack>
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' } }}>
        {[
          ['Orders', 'Track and manage your purchases', '/account/orders'],
          ['Addresses', 'Edit your shipping addresses', '/account/addresses'],
          ['Wishlist', 'Products you saved for later', '/wishlist'],
          ...(user?.roles.includes('seller')
            ? [['Seller portal', 'Manage your shops and orders', '/seller']]
            : [['Become a seller', 'Apply to sell on the marketplace', '/account/become-seller']]),
        ].map(([t, d, to]) => (
          <Card key={to} variant="outlined">
            <CardContent>
              <Typography variant="h6">{t}</Typography>
              <Typography color="text.secondary" sx={{ mb: 1 }}>
                {d}
              </Typography>
              <Button component={RouterLink} to={to}>
                Open
              </Button>
            </CardContent>
          </Card>
        ))}
      </Box>
    </>
  );
}
