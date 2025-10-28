import { getDB } from './ensure';

export type ReceiptRow = {
  id: number;
  rail: string;
  status: string;
  payload: unknown;
  createdAt: number;
};

export function saveReceipt(rail: string, status: string, payload: unknown) {
  const db = getDB();
  db.prepare(
    'INSERT INTO receipts(rail,status,payload,created_at) VALUES (?,?,?,?)',
  ).run(rail, status, JSON.stringify(payload), Date.now());
}

export function listReceipts(limit = 500): ReceiptRow[] {
  const db = getDB();
  const rows = db
    .prepare(
      'SELECT id,rail,status,payload,created_at FROM receipts ORDER BY id DESC LIMIT ?',
    )
    .all(limit) as Array<{
    id: number;
    rail: string;
    status: string;
    payload: string;
    created_at: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    rail: row.rail,
    status: row.status,
    payload: JSON.parse(row.payload),
    createdAt: row.created_at,
  }));
}
