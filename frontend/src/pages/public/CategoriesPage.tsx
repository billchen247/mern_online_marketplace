import { Box, Card, CardActionArea, CardContent, Container, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { catalogApi } from '../../api/services';
import { AsyncView, EmptyState } from '../../components/StateViews';
import { useAsync } from '../../hooks/useAsync';

export default function CategoriesPage() {
  const state = useAsync(() => catalogApi.categories(), []);
  return (
    <Container sx={{ py: 3 }}>
      <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 3 }}>Categories</Typography>
      <AsyncView state={state}>
        {(cats) => cats.length === 0 ? <EmptyState title="No categories" /> : (
          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' } }}>
            {cats.filter((c) => !c.parentCategory).map((c) => (
              <Card key={c._id} variant="outlined"><CardActionArea component={RouterLink} to={`/products?category=${c.slug}`}><CardContent><Typography variant="h6">{c.name}</Typography><Typography variant="body2" color="text.secondary">{c.description}</Typography></CardContent></CardActionArea></Card>
            ))}
          </Box>
        )}
      </AsyncView>
    </Container>
  );
}
