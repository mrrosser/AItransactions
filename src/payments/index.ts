import { z } from 'zod';
import { Intent as AP2Intent, Mandate, signMandateJWT } from './ap2';
import { X402Intent, createTransfer } from './coinbase/x402';
import { createVisaAIPayment } from './visa/ai';
import { getAttestation } from './cloudflare/attestation';
import { safeLog } from './utils';

export const PaymentPlan = z.object({ mandate: Mandate, intent: AP2Intent });
export type PaymentPlan = z.infer<typeof PaymentPlan>;

export type Receipt = {
  rail: 'X402' | 'CARD';
  status: string;
  details?: any;
};

export async function execute(plan: PaymentPlan): Promise<Receipt> {
  const mandateJwt = await signMandateJWT(
    plan.mandate,
    process.env.AP2_SIGNING_KEY_PEM || '',
  );

  const cf = await getAttestation();
  safeLog('ap2.mandate.jwt', { jwt: `${mandateJwt.slice(0, 42)}...` });

  if (plan.intent.rail === 'X402') {
    const transfer = await createTransfer({
      amountMinor: plan.intent.amountMinor,
      to: plan.intent.counterparty,
      memo: plan.intent.memo,
    } as X402Intent);

    return { rail: 'X402', status: transfer.status, details: { cf, transfer } };
  }

  const visaResult = await createVisaAIPayment({
    amountMinor: plan.intent.amountMinor,
    currency: plan.intent.currency,
    purpose: plan.mandate.scope,
    memo: plan.intent.memo,
    counterparty: plan.intent.counterparty,
  });

  return {
    rail: 'CARD',
    status: visaResult.status || 'QUEUED',
    details: { cf, visa: visaResult },
  };
}

export const payments = { execute };
