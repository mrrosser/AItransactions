import { getDB } from './ensure';

export type MandateRow = {
  id?: number;
  issuer_did: string;
  subject_did: string;
  scope: string;
  max_amount_minor: number;
  currency: string;
  expires_at: number;
};

export function listMandates(limit = 50) {
  const db = getDB();
  return db
    .prepare('SELECT * FROM mandates ORDER BY id DESC LIMIT ?')
    .all(limit) as MandateRow[];
}

export function createMandate(mandate: MandateRow) {
  const db = getDB();
  const result = db
    .prepare(
      'INSERT INTO mandates(issuer_did,subject_did,scope,max_amount_minor,currency,expires_at) VALUES (?,?,?,?,?,?)',
    )
    .run(
      mandate.issuer_did,
      mandate.subject_did,
      mandate.scope,
      mandate.max_amount_minor,
      mandate.currency,
      mandate.expires_at,
    );

  return { id: result.lastInsertRowid, ...mandate };
}

export function deleteMandate(id: number) {
  const db = getDB();
  db.prepare('DELETE FROM mandates WHERE id=?').run(id);
}
