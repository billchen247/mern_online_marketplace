import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export function Promo({ icon, title, text, bg }: { icon: ReactNode; title: string; text: string; bg: string }) {
  return (
    <Card sx={{ bgcolor: bg, color: 'white' }} elevation={0}>
      <CardContent>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          {icon}
          <Box>
            <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
            <Typography variant="body2">{text}</Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}
