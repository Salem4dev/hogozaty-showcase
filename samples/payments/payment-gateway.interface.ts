export interface CreateCheckoutParams {
  /** Minor-unit amount (e.g. 1000 = 10.00 EGP) */
  amountMinor: number;
  currencyCode: string;
  idempotencyKey: string;
  reservationId: string;
  customerEmail?: string;
  customerName?: string;
  /** Where Paymob (or any hosted-checkout PSP) should redirect after payment */
  returnUrl?: string;
}

export interface CreateCheckoutResult {
  /** PSP's internal payment-intent / order ID */
  intentId: string;
  /**
   * Hosted checkout page URL.
   * Present for Paymob (redirect flow).
   * Absent for manual/stub provider.
   */
  checkoutUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface RefundParams {
  intentId: string;
  amountMinor: number;
}

export interface ParsedWebhookPayload {
  providerEventId?: string;
  pspPaymentIntentId: string;
  pspProvider: string;
  status: 'succeeded' | 'failed' | 'refunded';
  refundedAmountMinor?: number;
  metadata?: Record<string, unknown>;
}

export interface PaymentGateway {
  readonly providerName: string;

  createCheckout(params: CreateCheckoutParams): Promise<CreateCheckoutResult>;
  refund(params: RefundParams): Promise<void>;
  /**
   * Parse and verify an incoming callback/webhook.
   * Throws if the HMAC signature or payload structure is invalid.
   */
  verifyAndParseWebhook(
    rawBody: Buffer | string,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<ParsedWebhookPayload>;
}

export const PAYMENT_GATEWAY = Symbol('PAYMENT_GATEWAY');
