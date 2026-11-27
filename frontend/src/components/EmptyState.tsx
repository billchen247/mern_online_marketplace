import InboxOutlined from '@mui/icons-material/InboxOutlined';
import { Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', py: 8, color: 'text.secondary' }}>
      {icon ?? <InboxOutlined sx={{ fontSize: 56, opacity: 0.5 }} />}
      <Typography variant="h6" color="text.primary">
        {title}
      </Typography>
      {description && <Typography sx={{ maxWidth: 420 }}>{description}</Typography>}
      {action}
    </Stack>
  );
}
