import { Typography } from '@mui/material';
import type { Address } from '../../types';

export function AddressBlock({ a }: { a: Omit<Address, '_id'> }) {
  return (
    <Typography variant="body2" component="address" sx={{ fontStyle: 'normal' }}>
      <b>{a.recipientName}</b> · {a.phone}
      <br />
      {a.addressLine1}
      {a.addressLine2 ? `, ${a.addressLine2}` : ''}
      <br />
      {a.city}, {a.state} {a.postalCode}, {a.country}
    </Typography>
  );
}
