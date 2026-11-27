import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Avatar, Box, Button, Divider, Link, Pagination, Rating, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link as RouterLink } from 'react-router-dom';
import { catalogApi } from '../../api/services';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { AsyncView, EmptyState } from '../../components/StateViews';
import { useAuth } from '../../contexts/AuthContext';
import { useAction } from '../../hooks/useAction';
import { useAsync } from '../../hooks/useAsync';
import type { Review } from '../../types';
import { formatDate } from '../../utils/format';
import { reviewFormSchema } from '../../validation/schemas';

type ReviewForm = { rating: number; title?: string; comment: string };

export default function ReviewSection({ productId, onChanged }: { productId: string; onChanged: () => void }) {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const reviews = useAsync(() => catalogApi.reviews(productId, page), [productId, page]);
  const mine = useAsync(() => (user ? catalogApi.reviewState(productId) : Promise.resolve(null)), [productId, user?.id]);
  const { run, busy } = useAction();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const form = useForm<ReviewForm>({ resolver: zodResolver(reviewFormSchema), defaultValues: { rating: 0, title: '', comment: '' } });

  const existing = mine.data?.review;
  const startEdit = () => {
    if (existing) form.reset({ rating: existing.rating, title: existing.title ?? '', comment: existing.comment });
    setEditing(true);
  };
  const submit = form.handleSubmit(async (v) => {
    const r = await run(
      () => (existing ? catalogApi.updateReview(existing._id, v) : catalogApi.createReview(productId, v)),
      existing ? 'Review updated' : 'Thanks for your review!',
    );
    if (r) {
      setEditing(false);
      form.reset({ rating: 0, title: '', comment: '' });
      mine.reload();
      reviews.reload();
      onChanged();
    }
  });
  const remove = async () => {
    if (!existing) return;
    if ((await run(() => catalogApi.deleteReview(existing._id), 'Review deleted')) !== undefined) {
      setConfirmDelete(false);
      mine.reload();
      reviews.reload();
      onChanged();
    }
  };

  return (
    <Box component="section" aria-label="Reviews" sx={{ mt: 5 }}>
      <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 700 }}>
        Customer reviews
      </Typography>
      {user && mine.data && (mine.data.eligible || editing) && (
        <Box component="form" onSubmit={submit} noValidate sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2, mb: 3 }}>
          <Typography sx={{ fontWeight: 600, mb: 1 }}>{existing ? 'Edit your review' : 'Write a review'}</Typography>
          <Controller
            name="rating"
            control={form.control}
            render={({ field, fieldState }) => (
              <Box>
                <Rating value={field.value} onChange={(_, v) => field.onChange(v ?? 0)} aria-label="Your rating" />
                {fieldState.error && (
                  <Typography color="error" variant="caption" sx={{ display: 'block' }}>
                    {fieldState.error.message}
                  </Typography>
                )}
              </Box>
            )}
          />
          <TextField {...form.register('title')} label="Title (optional)" size="small" fullWidth sx={{ my: 1 }} />
          <TextField
            {...form.register('comment')}
            label="Your review"
            multiline
            minRows={3}
            fullWidth
            size="small"
            error={Boolean(form.formState.errors.comment)}
            helperText={form.formState.errors.comment?.message}
          />
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            <Button type="submit" variant="contained" disabled={busy}>
              {existing ? 'Save changes' : 'Submit review'}
            </Button>
            {editing && <Button onClick={() => setEditing(false)}>Cancel</Button>}
          </Stack>
        </Box>
      )}
      {user && existing && !editing && (
        <Alert
          severity="info"
          sx={{ mb: 2 }}
          action={
            <>
              <Button size="small" onClick={startEdit}>
                Edit
              </Button>
              <Button size="small" color="error" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            </>
          }
        >
          You reviewed this product ({existing.rating}★).
        </Alert>
      )}
      {user && mine.data && !mine.data.hasPurchased && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Only buyers who have received this product can review it.
        </Alert>
      )}
      {!user && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Link component={RouterLink} to="/login">
            Sign in
          </Link>{' '}
          to review products you purchased.
        </Alert>
      )}
      <AsyncView state={reviews}>
        {(r) =>
          r.data.length === 0 ? (
            <EmptyState title="No reviews yet" description="Be the first to share your experience." />
          ) : (
            <Stack spacing={2} divider={<Divider />}>
              {r.data.map((rv: Review) => (
                <Stack key={rv._id} direction="row" spacing={2} data-testid="review">
                  <Avatar>{typeof rv.buyer === 'object' ? rv.buyer.name[0] : '?'}</Avatar>
                  <Box>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Rating value={rv.rating} readOnly size="small" />
                      <Typography variant="caption" color="text.secondary">
                        {typeof rv.buyer === 'object' ? rv.buyer.name : ''} · {formatDate(rv.createdAt)}
                      </Typography>
                    </Stack>
                    {rv.title && <Typography sx={{ fontWeight: 600 }}>{rv.title}</Typography>}
                    <Typography>{rv.comment}</Typography>
                  </Box>
                </Stack>
              ))}
              {r.pagination.totalPages > 1 && <Pagination count={r.pagination.totalPages} page={page} onChange={(_, p) => setPage(p)} />}
            </Stack>
          )
        }
      </AsyncView>
      <ConfirmDialog
        open={confirmDelete}
        title="Delete review?"
        message="Your review will be permanently removed."
        destructive
        confirmLabel="Delete"
        busy={busy}
        onClose={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </Box>
  );
}