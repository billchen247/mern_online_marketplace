import { MenuItem, TextField } from '@mui/material';

export function StatusFilter({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <TextField select size="small" label="Status" value={value} onChange={(e) => onChange(e.target.value)} sx={{ minWidth: 160 }}>
      <MenuItem value="">All</MenuItem>
      {options.map((o) => (
        <MenuItem key={o} value={o}>
          {o.replace(/_/g, ' ')}
        </MenuItem>
      ))}
    </TextField>
  );
}
