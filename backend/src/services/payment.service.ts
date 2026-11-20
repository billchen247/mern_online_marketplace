import crypto from 'node:crypto';

export type PaymentMethod = 'card' | 'paypal' | 'cod';

export interface ChargeRequest {
  amount: number;
  method: PaymentMethod;
  token?: string;
  reference: string;
}
export interface ChargeResult {
  success: boolean;
  reference: string;
  status: 'paid' | 'pending';
  failureReason?: string;
}

/** Abstraction so a real provider (e.g. Stripe PaymentIntents) can replace the simulation. */
export interface PaymentProvider {
  charge(req: ChargeRequest): Promise<ChargeResult>;
  refund(reference: string, amount: number): Promise<{ success: boolean; reference: string }>;
}

/**
 * SIMULATED provider — no money moves. Token "tok_decline" always fails; any other token succeeds.
 * Cash on delivery stays pending.
 */
export class SimulatedPaymentProvider implements PaymentProvider {
  async charge(req: ChargeRequest): Promise<ChargeResult> {
    const reference = `SIM-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    if (req.amount < 0) return { success: false, reference, status: 'pending', failureReason: 'Invalid amount' };
    if (req.token === 'tok_decline') {
      return { success: false, reference, status: 'pending', failureReason: 'Your (simulated) card was declined' };
    }
    return { success: true, reference, status: req.method === 'cod' ? 'pending' : 'paid' };
  }
  async refund(reference: string) {
    return { success: true, reference: `${reference}-REF` };
  }
}

let provider: PaymentProvider = new SimulatedPaymentProvider();
export const getPaymentProvider = () => provider;
export const setPaymentProvider = (p: PaymentProvider) => {
  provider = p;
};
