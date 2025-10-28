import { verifyHMAC } from '../security/verify';
import { saveInbound, listInbound } from '../store/inbound';

type HeaderBag = Record<string, string | string[] | undefined>;
type QueryBag = Record<string, unknown>;

export function handleInbound(
  rawBody: string,
  headers: HeaderBag,
  query: QueryBag,
  bodyParsed: unknown,
) {
  const signatureHeader =
    headers['x-signature'] ?? headers['x-signature-hmac'] ?? '';
  const signature =
    typeof signatureHeader === 'string'
      ? signatureHeader
      : Array.isArray(signatureHeader)
      ? signatureHeader[0] ?? ''
      : '';

  const ok = verifyHMAC(
    rawBody ?? '',
    String(signature ?? ''),
    process.env.WEBHOOK_HMAC_SECRET ?? '',
  );
  const source = String(query.source ?? 'unknown');
  const event_type = String(
    query.event_type ?? (bodyParsed as { type?: string } | undefined)?.type ?? 'event',
  );

  saveInbound({
    source,
    event_type,
    payload: bodyParsed ?? {},
    signature_valid: ok,
    received_at: Date.now(),
  });

  return { ok, source, event_type };
}
export { listInbound };
