import ArrowForward from '@mui/icons-material/ArrowForward';
import LocalShipping from '@mui/icons-material/LocalShippingOutlined';
import Verified from '@mui/icons-material/VerifiedUserOutlined';
import Storefront from '@mui/icons-material/Storefront';
import { Avatar, Box, Button, Card, CardActionArea, CardContent, Chip, Container, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { catalogApi } from '../../api/services';
import { ProductCard, productGridSx } from '../../components/ProductCard';
import { AsyncView, ProductGridSkeleton } from '../../components/StateViews';
import { useSettings } from '../../contexts/SettingsContext';
import { useAsync } from '../../hooks/useAsync';
import type { Product } from '../../types';
import { imageUrl } from '../../utils/format';

function Section({ title, to, products }: { title: string; to?: string; products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <Box component="section" aria-label={title} sx={{ mb: 5 }}>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>{title}</Typography>
        {to && <Button component={RouterLink} to={to} endIcon={<ArrowForward />}>View all</Button>}
      </Stack>
      <Box sx={productGridSx}>{products.map((p) => <ProductCard key={p._id} product={p} />)}</Box>
    </Box>
  );
}

function Promo({ icon, title, text, bg }: { icon: ReactNode; title: string; text: string; bg: string }) {
  return (
    <Card sx={{ bgcolor: bg, color: 'white' }} elevation={0}>
      <CardContent><Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>{icon}<Box><Typography sx={{ fontWeight: 700 }}>{title}</Typography><Typography variant="body2">{text}</Typography></Box></Stack></CardContent>
    </Card>
  );
}

export default function HomePage() {
  const state = useAsync(() => catalogApi.home(), []);
  const { settings } = useSettings();
  return (
    <>
      <Box sx={{ background: `linear-gradient(135deg, ${settings.primaryColor}, #7c3aed)`, color: 'white', py: { xs: 6, md: 9 } }}>
        <Container>
          <Typography variant="h3" component="h1" sx={{ fontWeight: 800, fontSize: { xs: '2rem', md: '3rem' } }}>{settings.marketplaceName}</Typography>
          <Typography variant="h6" sx={{ mt: 1, maxWidth: 560, opacity: 0.95 }}>{settings.tagline}. One cart, many independent shops.</Typography>
          <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
            <Button component={RouterLink} to="/products" variant="contained" color="secondary" size="large">Shop now</Button>
            <Button component={RouterLink} to="/shops" variant="outlined" size="large" sx={{ color: 'white', borderColor: 'white' }}>Browse shops</Button>
          </Stack>
        </Container>
      </Box>
      <Container sx={{ py: 4 }}>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, mb: 5 }}>
          <Promo bg="#0ea5e9" icon={<LocalShipping fontSize="large" />} title={`Free shipping over $${settings.shipping.freeShippingThreshold}`} text="Shipping is calculated per seller at checkout." />
          <Promo bg="#16a34a" icon={<Verified fontSize="large" />} title="Verified sellers" text="Every seller is reviewed by our team." />
          <Promo bg="#f97316" icon={<Storefront fontSize="large" />} title="Shop many stores at once" text="Buy from several sellers in a single checkout." />
        </Box>
        <AsyncView state={state} loadingLabel="Loading marketplace…">
          {(h) => (
            <>
              <Box component="section" aria-label="Categories" sx={{ mb: 5 }}>
                <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 2 }}>Shop by category</Typography>
                <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
                  {h.categories.map((c) => (
                    <Chip key={c._id} component={RouterLink} to={`/products?category=${c.slug}`} clickable label={c.name} color="primary" variant="outlined" sx={{ fontSize: 15, py: 2.2, px: 1 }} />
                  ))}
                </Stack>
              </Box>
              <Section title="Featured products" to="/products?sortBy=rating" products={h.featured} />
              <Section title="Popular right now" to="/products?sortBy=popularity" products={h.popular} />
              <Section title="New arrivals" to="/products?sortBy=newest" products={h.newArrivals} />
              <Section title="Recommended for you" to="/products?sortBy=rating" products={h.recommended} />
              <Box component="section" aria-label="Featured shops" sx={{ mb: 2 }}>
                <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 2 }}>Featured shops</Typography>
                <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' } }}>
                  {h.shops.map((s) => (
                    <Card key={s._id} variant="outlined">
                      <CardActionArea component={RouterLink} to={`/shops/${s._id}`}>
                        <CardContent>
                          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                            <Avatar src={s.logo ? imageUrl(s.logo.url) : undefined} alt="" sx={{ width: 56, height: 56 }}>{s.name[0]}</Avatar>
                            <Box sx={{ minWidth: 0 }}>
                              <Typography noWrap sx={{ fontWeight: 700 }}>{s.name}</Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.description}</Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  ))}
                </Box>
              </Box>
            </>
          )}
        </AsyncView>
        {state.loading && !state.data && <ProductGridSkeleton />}
      </Container>
    </>
  );
}
