import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AsyncView } from '../src/components/AsyncView';
import { EmptyState } from '../src/components/EmptyState';
import { Pager } from '../src/components/Pager';
import { StatusChip } from '../src/components/StatusChip';
import { TrendChart } from '../src/components/TrendChart';

describe('independent shared components', () => {
  it('renders loading, failure, and loaded async states', () => {
    const reload = vi.fn();
    const { rerender } = render(
      <AsyncView state={{ data: null, loading: true, error: null, reload }} loadingLabel="Loading orders">
        {(value: string) => <span>{value}</span>}
      </AsyncView>,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Loading orders');

    rerender(
      <AsyncView state={{ data: null, loading: false, error: 'Could not load', reload }}>
        {(value: string) => <span>{value}</span>}
      </AsyncView>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(reload).toHaveBeenCalledOnce();

    rerender(
      <AsyncView state={{ data: 'Orders ready', loading: false, error: null, reload }}>
        {(value: string) => <span>{value}</span>}
      </AsyncView>,
    );
    expect(screen.getByText('Orders ready')).toBeInTheDocument();
  });

  it('renders empty state, formatted status, and chart independently', () => {
    render(
      <>
        <EmptyState title="No orders" description="Try again later" />
        <StatusChip status="partially_fulfilled" />
        <TrendChart data={[{ date: '2026-01-01', revenue: 25, orders: 1 }]} />
      </>,
    );
    expect(screen.getByText('No orders')).toBeInTheDocument();
    expect(screen.getByText('Partially Fulfilled')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Revenue trend, total 25.00 dollars over 1 days' })).toBeInTheDocument();
  });

  it('forwards pagination changes', () => {
    const onChange = vi.fn();
    render(<Pager pagination={{ page: 1, totalPages: 2, limit: 10, total: 15 }} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Go to page 2' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });
});
