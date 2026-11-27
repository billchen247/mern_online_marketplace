import { zodResolver } from '@hookform/resolvers/zod';
import { tableSx } from './AdminShared';
import Add from '@mui/icons-material/Add';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { adminApi } from '../../api/services';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FormText } from '../../components/FormFields';
import { AsyncView, EmptyState } from '../../components/StateViews';
import { PageHeader, StatusChip } from '../../components/common';
import { useAction } from '../../hooks/useAction';
import { useAsync } from '../../hooks/useAsync';
import type { Category } from '../../types';
import { categoryFormSchema } from '../../validation/schemas';

type CatForm = { name: string; description?: string; parentCategory?: string; status: 'active' | 'inactive' };
export function AdminCategoriesPage() {
  const state = useAsync(() => adminApi.categories(), []);
  const { run, busy } = useAction();
  const [edit, setEdit] = useState<Category | 'new' | null>(null);
  const [del, setDel] = useState<Category | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CatForm>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: '', description: '', parentCategory: '', status: 'active' },
  });
  useEffect(() => {
    if (edit && edit !== 'new')
      reset({
        name: edit.name,
        description: edit.description ?? '',
        parentCategory: edit.parentCategory ?? '',
        status: edit.status ?? 'active',
      });
    else reset({ name: '', description: '', parentCategory: '', status: 'active' });
  }, [edit, reset]);
  const submit = handleSubmit(async (v) => {
    const body = { ...v, parentCategory: v.parentCategory || null };
    const r = await run(
      () => (edit === 'new' ? adminApi.createCategory(body) : adminApi.updateCategory((edit as Category)._id, body)),
      edit === 'new' ? 'Category created' : 'Category updated',
    );
    if (r) {
      setEdit(null);
      state.reload();
    }
  });
  return (
    <>
      <PageHeader
        title="Categories"
        actions={
          <Button variant="contained" startIcon={<Add />} onClick={() => setEdit('new')}>
            Add category
          </Button>
        }
      />
      <AsyncView state={state}>
        {(cats) =>
          cats.length === 0 ? (
            <EmptyState title="No categories" />
          ) : (
            <Paper variant="outlined" sx={tableSx}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Slug</TableCell>
                    <TableCell>Parent</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cats.map((c) => (
                    <TableRow key={c._id}>
                      <TableCell>{c.name}</TableCell>
                      <TableCell>{c.slug}</TableCell>
                      <TableCell>{cats.find((x) => x._id === c.parentCategory)?.name ?? '—'}</TableCell>
                      <TableCell>
                        <StatusChip status={c.status ?? 'active'} />
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" onClick={() => setEdit(c)}>
                          Edit
                        </Button>
                        <Button size="small" color="error" onClick={() => setDel(c)}>
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )
        }
      </AsyncView>
      <Dialog open={edit !== null} onClose={() => setEdit(null)} fullWidth maxWidth="xs" aria-labelledby="cat-title">
        <form onSubmit={submit} noValidate>
          <DialogTitle id="cat-title">{edit === 'new' ? 'Add category' : 'Edit category'}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <FormText label="Name" fieldError={errors.name} {...register('name')} />
              <FormText label="Description" multiline minRows={2} fieldError={errors.description} {...register('description')} />
              <Controller
                name="parentCategory"
                control={control}
                render={({ field }) => (
                  <TextField select size="small" label="Parent category" {...field} value={field.value ?? ''}>
                    <MenuItem value="">None</MenuItem>
                    {(state.data ?? [])
                      .filter((c) => edit === 'new' || c._id !== (edit as Category | null)?._id)
                      .map((c) => (
                        <MenuItem key={c._id} value={c._id}>
                          {c.name}
                        </MenuItem>
                      ))}
                  </TextField>
                )}
              />
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <TextField select size="small" label="Status" {...field}>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </TextField>
                )}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEdit(null)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={busy}>
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      <ConfirmDialog
        open={Boolean(del)}
        title="Delete category?"
        message={`“${del?.name}” will be deleted. Categories that still contain products cannot be deleted.`}
        destructive
        confirmLabel="Delete"
        busy={busy}
        onClose={() => setDel(null)}
        onConfirm={async () => {
          if (del && (await run(() => adminApi.deleteCategory(del._id), 'Category deleted')) !== undefined) {
            setDel(null);
            state.reload();
          }
        }}
      />
    </>
  );
}
