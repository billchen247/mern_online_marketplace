import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import { Providers } from '../src/App';
import { loginAs, type Persona } from './mocks';

export function renderApp(ui: ReactElement, opts: { route?: string; as?: Persona | null } = {}) {
  loginAs(opts.as ?? null);
  return render(
    <MemoryRouter initialEntries={[opts.route ?? '/']}>
      <Providers>{ui}</Providers>
    </MemoryRouter>,
  );
}

/** Waits for the auth bootstrap (refresh) to finish. */
export const settled = () => waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument());
