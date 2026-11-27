import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { sellerApi } from '../../api/services';
import { useAction } from '../../hooks/useAction';
import { useAsync } from '../../hooks/useAsync';
import type { Product } from '../../types';
import { formatDateTime } from '../../utils/format';

export function StockDialog({ product, onClose, onDone }: { product: Product | null; onClose: () => void; onDone: () => void }) {
  const [mode, setMode] = useState<'adjustment' | 'set'>('adjustment');
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const history = useAsync(() => (product ? sellerApi.inventory(product._id) : Promise.resolve([])), [product?._id]);
  const { run, busy } = useAction();
  useEffect(() => {
    setValue('');
    setNote('');
  }, [product?._id]);
  if (!product) return null;
  const n = Number(value);
  const invalid = value === '' || !Number.isInteger(n) || (mode === 'adjustment' ? n === 0 : n < 0);
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" aria-labelledby="stock-title">
      <DialogTitle id="stock-title">Inventory · {product.name}</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>
          Current stock: <b>{product.stock}</b>
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <TextField
            select
            size="small"
            label="Action"
            value={mode}
            onChange={(e) => setMode(e.target.value as typeof mode)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="adjustment">Adjust by (+/−)</MenuItem>
            <MenuItem value="set">Set to</MenuItem>
          </TextField>
          <TextField
            size="small"
            type="number"
            label={mode === 'adjustment' ? 'Amount' : 'New quantity'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <TextField size="small" label="Note" value={note} onChange={(e) => setNote(e.target.value)} fullWidth />
        </Stack>
        <Typography variant="subtitle2">History</Typography>
        {history.data?.length ? (
          history.data.slice(0, 8).map((h) => (
            <Typography key={h._id} variant="body2" color="text.secondary">
              {formatDateTime(h.createdAt)} · {h.delta > 0 ? '+' : ''}
              {h.delta} → {h.stockAfter} ({h.reason}
              {h.note ? `: ${h.note}` : ''})
            </Typography>
          ))
        ) : (
          <Typography variant="body2" color="text.secondary">
            No history yet.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          disabled={invalid || busy}
          onClick={async () => {
            if (await run(() => sellerApi.adjustStock(product._id, { [mode]: n, note: note || undefined }), 'Stock updated')) {
              onDone();
              onClose();
            }
          }}
        >
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
}
