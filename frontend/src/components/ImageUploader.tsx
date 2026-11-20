import AddPhotoAlternate from '@mui/icons-material/AddPhotoAlternate';
import Close from '@mui/icons-material/Close';
import { Box, Button, IconButton, Stack, Typography } from '@mui/material';
import { useRef, useState } from 'react';
import { sellerApi } from '../api/services';
import { useNotify } from '../contexts/NotifyContext';
import type { ImageRef } from '../types';
import { getErrorMessage } from '../utils/errors';
import { imageUrl } from '../utils/format';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Client-side pre-checks (UX only — the server re-validates type via magic bytes and size). */
export function validateImageFile(f: { type: string; size: number; name: string }): string | null {
  if (!ALLOWED_TYPES.includes(f.type)) return `${f.name}: only JPEG, PNG or WebP images are allowed`;
  if (f.size > MAX_IMAGE_BYTES) return `${f.name}: file is larger than 5 MB`;
  return null;
}

export function ImageUploader({ label, value, onChange, max = 1 }: { label: string; value: ImageRef[]; onChange: (v: ImageRef[]) => void; max?: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { error } = useNotify();

  const onFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const files = Array.from(list).slice(0, Math.max(0, max - value.length));
    const problem = files.map(validateImageFile).find(Boolean);
    if (problem) return error(problem);
    setBusy(true);
    try {
      const uploaded = await sellerApi.upload(files);
      onChange(max === 1 ? uploaded.slice(0, 1) : [...value, ...uploaded]);
    } catch (e) {
      error(getErrorMessage(e));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom>{label}</Typography>
      <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
        {value.map((img, i) => (
          <Box key={img.url + i} sx={{ position: 'relative' }}>
            <Box component="img" src={imageUrl(img.url)} alt={`${label} ${i + 1}`} sx={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 1, border: 1, borderColor: 'divider' }} />
            <IconButton size="small" aria-label={`Remove ${label} ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))} sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
              <Close fontSize="inherit" />
            </IconButton>
          </Box>
        ))}
        {(max === 1 || value.length < max) && (
          <Button component="label" variant="outlined" startIcon={<AddPhotoAlternate />} disabled={busy}>
            {busy ? 'Uploading…' : max === 1 && value.length ? 'Replace' : 'Upload'}
            <input ref={input} hidden type="file" accept={ALLOWED_TYPES.join(',')} multiple={max > 1} aria-label={`Upload ${label}`} onChange={(e) => void onFiles(e.target.files)} />
          </Button>
        )}
      </Stack>
      <Typography variant="caption" color="text.secondary">JPEG, PNG or WebP, up to 5 MB each.</Typography>
    </Box>
  );
}
