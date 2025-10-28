import fetch from 'cross-fetch';
import { safeLog } from '../utils';

type VisaAIPurpose = 'TIP' | 'PURCHASE' | 'SUBSCRIPTION';

export type VisaAIRequest = {
  amountMinor: number;
  currency: string;
  purpose: VisaAIPurpose;
  memo?: string;
  counterparty?: string;
};

export type VisaAIResponse = {
  status: string;
  reference?: string;
  raw?: unknown;
};

async function fetchVisaToken() {
  const clientId = process.env.VISA_AI_CLIENT_ID;
  const clientSecret = process.env.VISA_AI_CLIENT_SECRET;
  const baseUrl = process.env.VISA_AI_API_BASE;

  if (!clientId || !clientSecret || !baseUrl) {
    throw new Error('Visa AI credentials are not configured');
  }

  const response = await fetch(`${baseUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    throw new Error(`Visa AI oauth error ${response.status}`);
  }

  const data = await response.json();
  return data.access_token as string;
}

export async function createVisaAIPayment(
  request: VisaAIRequest,
): Promise<VisaAIResponse> {
  const live =
    process.env.VISA_AI_LIVE === 'true' &&
    process.env.PAYMENTS_DRY_RUN !== 'true';
  const agentId = process.env.VISA_AI_AGENT_ID || 'agent:demo';

  if (!live) {
    safeLog('visa.ai.simulated', { agentId, request });
    return {
      status: 'SIMULATED',
      reference: `visa-ai-simulated-${Date.now()}`,
      raw: { agentId, request },
    };
  }

  const baseUrl = process.env.VISA_AI_API_BASE;
  if (!baseUrl) throw new Error('Visa AI API base not configured');

  const token = await fetchVisaToken();

  const payload = {
    agentId,
    operation: 'CARD_PAYMENT',
    context: {
      amountMinor: request.amountMinor,
      currency: request.currency,
      purpose: request.purpose,
      memo: request.memo,
      counterparty: request.counterparty,
    },
  };

  const response = await fetch(`${baseUrl}/agents/${agentId}/actions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Visa AI action error ${response.status}`);
  }

  const result = await response.json();
  safeLog('visa.ai.action', { agentId, result });

  return {
    status: result.status || 'QUEUED',
    reference: result.reference || result.id,
    raw: result,
  };
}
