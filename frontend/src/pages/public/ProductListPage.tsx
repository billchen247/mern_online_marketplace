import FilterList from '@mui/icons-material/FilterList';
import { Box, Button, Checkbox, Chip, Container, Drawer, FormControl, FormControlLabel, IconButton, InputLabel, MenuItem, Rating, Select, Slider, Stack, TextField, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { catalogApi } from '../../api/services';
import { EmptyState, ErrorState, ProductGridSkeleton } from '../../components/StateViews';
import { Pager } from '../../components/common';
import { ProductCard, productGridSx } from '../../components/ProductCard';
import { useAsync } from '../../hooks/useAsync';
import { paramsToQuery } from './productQuery';

export { paramsToQuery } from './productQuery';

const SORTS = [
  { value: 'newest:desc', label: 'Newest' },
  { value: 'popularity:desc', label: 'Most popular' },
  { value: 'rating:desc', label: 'Top rated' },
  { value: 'price:asc', label: 'Price: low to high' },
  { value: 'price:desc', label: 'Price: high to low' },
];

export default function ProductListPage() {
  const [sp, setSp] = useSearchParams();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up('md'));
  const [drawer, setDrawer] = useState(false);
  const query = paramsToQuery(sp);
  const cats = useAsync(() => catalogApi.categories(), []);
  const result = useAsync(() => catalogApi.products(query), [sp.toString()]);

  const [price, setPrice] = useState<[number, number]>([query.minPrice ?? 0, query.maxPrice ?? 2000]);
  useEffect(() => setPrice([query.minPrice ?? 0, query.maxPrice ?? 2000]), [query.minPrice, query.maxPrice]);

  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, v]) => (v === undefined || v === '' ? next.delete(k) : next.set(k, v)));
    if (!('page' in patch)) next.delete('page');
    setSp(next);
  };
  const activeFilters = ['search', 'category', 'minPrice', 'maxPrice', 'minRating', 'inStock', 'shop'].filter((k) => sp.get(k));
  const sortValue = `${query.sortBy}:${query.order}`;
  const currentCat = cats.data?.find((c) => c.slug === query.category || c._id === query.category);

  const filters = (
    <Stack spacing={3} sx={{ width: { xs: 280, md: 240 }, p: { xs: 2, md: 0 } }} role="group" aria-label="Filters">
      <Box>
        <Typography gutterBottom sx={{ fontWeight: 700 }}>
          Category
        </Typography>
        <Stack>
          <Button
            size="small"
            sx={{ justifyContent: 'flex-start' }}
            variant={!query.category ? 'contained' : 'text'}
            onClick={() => update({ category: undefined })}
          >
            All categories
          </Button>
          {cats.data
            ?.filter((c) => !c.parentCategory)
            .map((c) => (
              <Button
                key={c._id}
                size="small"
                sx={{ justifyContent: 'flex-start' }}
                variant={query.category === c.slug ? 'contained' : 'text'}
                onClick={() => update({ category: c.slug })}
              >
                {c.name}
              </Button>
            ))}
        </Stack>
      </Box>
      <Box>
        <Typography gutterBottom id="price-label" sx={{ fontWeight: 700 }}>
          Price range
        </Typography>
        <Slider
          value={price}
          min={0}
          max={2000}
          step={10}
          valueLabelDisplay="auto"
          aria-labelledby="price-label"
          onChange={(_, v) => setPrice(v as [number, number])}
          onChangeCommitted={(_, v) =>
            update({
              minPrice: (v as number[])[0] > 0 ? String((v as number[])[0]) : undefined,
              maxPrice: (v as number[])[1] < 2000 ? String((v as number[])[1]) : undefined,
            })
          }
        />
        <Typography variant="body2" color="text.secondary">
          ${price[0]} – ${price[1] >= 2000 ? '2000+' : price[1]}
        </Typography>
      </Box>
      <Box>
        <Typography gutterBottom sx={{ fontWeight: 700 }}>
          Minimum rating
        </Typography>
        <Rating
          value={query.minRating ?? 0}
          onChange={(_, v) => update({ minRating: v ? String(v) : undefined })}
          aria-label="Minimum rating"
        />
        {query.minRating ? (
          <Button size="small" onClick={() => update({ minRating: undefined })}>
            Clear
          </Button>
        ) : null}
      </Box>
      <FormControlLabel
        control={<Checkbox checked={Boolean(query.inStock)} onChange={(e) => update({ inStock: e.target.checked ? 'true' : undefined })} />}
        label="In stock only"
      />
    </Stack>
  );

  return (
    <Container sx={{ py: 3 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 2 }}
      >
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            {currentCat?.name ?? (query.search ? `Results for “${query.search}”` : 'All products')}
          </Typography>
          {result.data && (
            <Typography color="text.secondary" data-testid="result-count">
              {result.data.pagination.total} products
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          {!desktop && (
            <IconButton aria-label="Open filters" onClick={() => setDrawer(true)}>
              <FilterList />
            </IconButton>
          )}
          <TextField
            size="small"
            label="Search"
            defaultValue={query.search ?? ''}
            key={query.search ?? ''}
            onKeyDown={(e) => e.key === 'Enter' && update({ search: (e.target as HTMLInputElement).value.trim() })}
            sx={{ width: 200 }}
          />
          <FormControl size="small" sx={{ minWidth: 190 }}>
            <InputLabel id="sort-label">Sort by</InputLabel>
            <Select
              labelId="sort-label"
              label="Sort by"
              value={SORTS.some((s) => s.value === sortValue) ? sortValue : 'newest:desc'}
              onChange={(e) => {
                const [s, o] = e.target.value.split(':');
                update({ sortBy: s, order: o });
              }}
            >
              {SORTS.map((s) => (
                <MenuItem key={s.value} value={s.value}>
                  {s.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Stack>
      {activeFilters.length > 0 && (
        <Stack direction="row" spacing={1} useFlexGap sx={{ mb: 2, flexWrap: 'wrap' }}>
          {activeFilters.map((k) => (
            <Chip key={k} label={`${k}: ${sp.get(k)}`} onDelete={() => update({ [k]: undefined })} />
          ))}
          <Button size="small" onClick={() => setSp(new URLSearchParams())}>
            Clear all
          </Button>
        </Stack>
      )}
      <Stack direction="row" spacing={4} sx={{ alignItems: 'flex-start' }}>
        {desktop ? (
          <Box sx={{ flexShrink: 0 }}>{filters}</Box>
        ) : (
          <Drawer anchor="left" open={drawer} onClose={() => setDrawer(false)}>
            {filters}
          </Drawer>
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {result.loading && !result.data ? (
            <ProductGridSkeleton />
          ) : result.error ? (
            <ErrorState message={result.error} onRetry={result.reload} />
          ) : result.data && result.data.data.length === 0 ? (
            <EmptyState
              title="No products found"
              description="Try adjusting your search or removing some filters."
              action={<Button onClick={() => setSp(new URLSearchParams())}>Clear filters</Button>}
            />
          ) : (
            <>
              <Box
                sx={{
                  ...productGridSx,
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: 'repeat(3, 1fr)' },
                  opacity: result.loading ? 0.6 : 1,
                }}
              >
                {result.data?.data.map((p) => (
                  <ProductCard key={p._id} product={p} />
                ))}
              </Box>
              <Pager
                pagination={result.data?.pagination}
                onChange={(p) => {
                  update({ page: String(p) });
                  window.scrollTo({ top: 0 });
                }}
              />
            </>
          )}
        </Box>
      </Stack>
    </Container>
  );
}