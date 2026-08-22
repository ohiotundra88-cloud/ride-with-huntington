/**
 * Payment provider abstraction.
 *
 * The hub ships with the demo provider (no real money moves). When a Stripe
 * account exists, add a `StripeProvider` that implements this same interface
 * plus a signature-verified webhook route at /api/public/webhooks/stripe —
 * no routes, tables or components need to change.
 */

export type PaymentProviderId = "demo" | "stripe";

export interface CheckoutRequest {
  orderId: string;
  amount: number;
  currency: string;
  description: string;
  supporterEmail: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutResult {
  provider: PaymentProviderId;
  sessionId: string;
  paymentId: string | null;
  /** Where to send the buyer. Null when the provider settles in-app (demo). */
  redirectUrl: string | null;
  /** True when the order can be marked paid right away (demo mode only). */
  settledImmediately: boolean;
}

export interface RefundResult {
  provider: PaymentProviderId;
  refundId: string;
  amount: number;
}

export interface PaymentProvider {
  id: PaymentProviderId;
  /** True when real money moves — drives the demo banners in the UI. */
  live: boolean;
  createCheckout(req: CheckoutRequest): Promise<CheckoutResult>;
  refund(paymentId: string | null, amount: number): Promise<RefundResult>;
}
