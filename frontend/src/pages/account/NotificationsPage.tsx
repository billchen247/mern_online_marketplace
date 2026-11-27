import { Button, Card, CardContent, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { userApi } from '../../api/services';
import { AsyncView, EmptyState } from '../../components/StateViews';
import { Pager, PageHeader } from '../../components/common';
import { useAction } from '../../hooks/useAction';
import { useAsync } from '../../hooks/useAsync';
import { formatDateTime } from '../../utils/format';

export function NotificationsPage() {
  const [page, setPage] = useState(1);
  const state = useAsync(() => userApi.notifications(page), [page]);
  const { run } = useAction();
  return (
    <>
      <PageHeader
        title="Notifications"
        actions={
          <Button
            onClick={async () => {
              if (await run(() => userApi.readAllNotifications(), 'All marked as read')) state.reload();
            }}
          >
            Mark all as read
          </Button>
        }
      />
      <AsyncView state={state}>
        {(r) =>
          r.data.length === 0 ? (
            <EmptyState title="You're all caught up" />
          ) : (
            <Stack spacing={1}>
              {r.data.map((n) => (
                <Card key={n._id} variant="outlined" sx={{ borderLeft: 4, borderLeftColor: n.read ? 'divider' : 'primary.main' }}>
                  <CardContent sx={{ py: 1.5 }}>
                    <Stack direction="row" sx={{ justifyContent: 'space-between' }}>
                      <Typography sx={{ fontWeight: n.read ? 400 : 700 }}>{n.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDateTime(n.createdAt)}
                      </Typography>
                    </Stack>
                    <Typography variant="body2">{n.message}</Typography>
                    <Stack direction="row" spacing={1}>
                      {n.link && (
                        <Button size="small" component={RouterLink} to={n.link}>
                          View
                        </Button>
                      )}
                      {!n.read && (
                        <Button
                          size="small"
                          onClick={async () => {
                            if (await run(() => userApi.readNotification(n._id))) state.reload();
                          }}
                        >
                          Mark read
                        </Button>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              ))}
              <Pager pagination={r.pagination} onChange={setPage} />
            </Stack>
          )
        }
      </AsyncView>
    </>
  );
}
