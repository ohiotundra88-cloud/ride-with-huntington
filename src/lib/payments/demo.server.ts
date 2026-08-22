import type { CheckoutRequest, CheckoutResult, PaymentProvider, RefundResult } from "./provider";

/**
 * Demo provider: behaves like a real checkout (server-priced order, receipt,
 * refunds) but never charges a card. Swap for a StripeProvider later.
 */
export const demoProvider: PaymentProvider = {
  id: "demo",
  live: false,

  async createCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
    return {
      provider: "demo",
      sessionId: `demo_sess_${req.orderId}`,
      paymentId: `demo_pi_${req.orderId}`,
      redirectUrl: null,
      settledImmediately: true,
    };
  },

  async refund(paymentId: string | null, amount: number): Promise<RefundResult> {
    return {
      provider: "demo",
      refundId: `demo_re_${paymentId ?? crypto.randomUUID()}`,
      amount,
    };
  },
};

/** Resolves the active provider. Add Stripe here once keys are configured. */
export function activeProvider(): PaymentProvider {
  return demoProvider;
}
