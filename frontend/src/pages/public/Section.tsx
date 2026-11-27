import ArrowForward from '@mui/icons-material/ArrowForward';
import { Box, Button, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { ProductCard, productGridSx } from '../../components/ProductCard';
import type { Product } from '../../types';

export function Section({ title, to, products }: { title: string; to?: string; products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <Box component="section" aria-label={title} sx={{ mb: 5 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {to && (
          <Button component={RouterLink} to={to} endIcon={<ArrowForward />}>
            View all
          </Button>
        )}
      </Stack>
      <Box sx={productGridSx}>
        {products.map((p) => (
          <ProductCard key={p._id} product={p} />
        ))}
      </Box>
    </Box>
  );
}
