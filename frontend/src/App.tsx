import { Providers } from './Providers';
import { AppRoutes } from './routes/AppRoutes';

export { Providers } from './Providers';

export default function App() {
  return (
    <Providers>
      <AppRoutes />
    </Providers>
  );
}
