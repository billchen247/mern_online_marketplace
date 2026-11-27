import { Container } from '@mui/material';
import { useParams } from 'react-router-dom';
import { catalogApi } from '../../api/services';
import { AsyncView } from '../../components/StateViews';
import { useAsync } from '../../hooks/useAsync';
import type { Product } from '../../types';
import Detail from './ProductDetail';

export default function ProductDetailPage() {
  const { id = '' } = useParams();
  const state = useAsync(() => catalogApi.product(id), [id]);
  return (
    <Container sx={{ py: 3 }}>
      <AsyncView state={state} loadingLabel="Loading product…">
        {(p) => <Detail product={p as Product & { related: Product[] }} reload={state.reload} />}
      </AsyncView>
    </Container>
  );
}