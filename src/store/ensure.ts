import Database from 'better-sqlite3'
export function getDB(){ const db=new Database('sqlite.db'); db.pragma('journal_mode = WAL'); return db }
export async function ensureStores(){
  const db=getDB()
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE IF NOT EXISTS mandates (id INTEGER PRIMARY KEY, issuer_did TEXT, subject_did TEXT, scope TEXT, max_amount_minor INTEGER, currency TEXT, expires_at INTEGER);
    CREATE TABLE IF NOT EXISTS receipts (id INTEGER PRIMARY KEY, rail TEXT, status TEXT, payload TEXT, created_at INTEGER);
    CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY, level TEXT, msg TEXT, ts INTEGER);
    CREATE TABLE IF NOT EXISTS inbound_events (id INTEGER PRIMARY KEY, source TEXT, event_type TEXT, payload TEXT, signature_valid INTEGER, received_at INTEGER);
    CREATE TABLE IF NOT EXISTS allowlist (id INTEGER PRIMARY KEY, subject TEXT UNIQUE);
  `)
  const defaults = [
    ['LOOP_ENABLED','false'],
    ['SANDBOX_MODE','true'],
    ['SYNTHETIC_AGENTS','true'],
    ['SYNTHETIC_RATE','10'],
    ['LICENSE_KEY', process.env.LICENSE_KEY || 'lic_dev_please_change']
  ]
  const up = db.prepare('INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)')
  for (const [k,v] of defaults) up.run(k, String(v))
}
