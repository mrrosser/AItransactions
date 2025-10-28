import { getDB } from './ensure';

export type InboundRow = {
  id?: number;
  source: string;
  event_type: string;
  payload: unknown;
  signature_valid: boolean;
  received_at: number;
};

export function saveInbound(event: InboundRow) {
  const db = getDB();
  db.prepare(
    'INSERT INTO inbound_events(source,event_type,payload,signature_valid,received_at) VALUES (?,?,?,?,?)',
  ).run(
    event.source,
    event.event_type,
    JSON.stringify(event.payload),
    event.signature_valid ? 1 : 0,
    event.received_at,
  );
}

export function listInbound(limit = 100): InboundRow[] {
  const db = getDB();
  const rows = db
    .prepare(
      'SELECT id,source,event_type,payload,signature_valid,received_at FROM inbound_events ORDER BY id DESC LIMIT ?',
    )
    .all(limit) as Array<{
    id: number;
    source: string;
    event_type: string;
    payload: string;
    signature_valid: number;
    received_at: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    source: row.source,
    event_type: row.event_type,
    payload: JSON.parse(row.payload),
    signature_valid: Boolean(row.signature_valid),
    received_at: row.received_at,
  }));
}
