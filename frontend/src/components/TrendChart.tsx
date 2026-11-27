import { Box, Stack, Typography } from '@mui/material';

export function TrendChart({ data, label = 'Revenue' }: { data: { date: string; revenue: number; orders: number }[]; label?: string }) {
  const max = Math.max(1, ...data.map((d) => d.revenue));
  const total = data.reduce((s, d) => s + d.revenue, 0);
  return (
    <Box role="img" aria-label={`${label} trend, total ${total.toFixed(2)} dollars over ${data.length} days`}>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'flex-end', height: 140 }}>
        {data.map((d) => (
          <Box
            key={d.date}
            title={`${d.date}: $${d.revenue.toFixed(2)} (${d.orders} orders)`}
            sx={{
              flex: 1,
              bgcolor: d.revenue ? 'primary.main' : 'action.hover',
              borderRadius: 0.5,
              height: `${Math.max(3, (d.revenue / max) * 100)}%`,
              opacity: d.revenue ? 0.9 : 1,
            }}
          />
        ))}
      </Stack>
      <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 0.5 }}>
        <Typography variant="caption" color="text.secondary">
          {data[0]?.date}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {data[data.length - 1]?.date}
        </Typography>
      </Stack>
    </Box>
  );
}
