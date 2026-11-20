export const FULFILLMENT_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

export const ORDER_STATUSES = [
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'partially_fulfilled',
  'partially_refunded',
  'refunded',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const TRANSITIONS: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export function canTransition(from: FulfillmentStatus, to: FulfillmentStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function allowedTransitions(from: FulfillmentStatus): FulfillmentStatus[] {
  return TRANSITIONS[from] ?? [];
}

/** Derives the parent order status from seller-order statuses and refund state. */
export function deriveOrderStatus(
  fulfillment: FulfillmentStatus[],
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded' | 'partially_refunded',
): OrderStatus {
  if (paymentStatus === 'refunded') return 'refunded';
  if (paymentStatus === 'partially_refunded') return 'partially_refunded';
  if (fulfillment.length === 0) return 'pending';
  const active = fulfillment.filter((s) => s !== 'cancelled');
  if (active.length === 0) return 'cancelled';
  if (active.every((s) => s === 'delivered')) return 'delivered';
  if (active.every((s) => s === 'shipped' || s === 'delivered')) return 'shipped';
  if (active.some((s) => s === 'shipped' || s === 'delivered')) return 'partially_fulfilled';
  if (active.some((s) => s === 'processing')) return 'processing';
  return paymentStatus === 'paid' ? 'paid' : 'pending';
}
