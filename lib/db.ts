// Uses node:sqlite — built into Node.js v22.5.0+. No native compilation needed.
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

// On Vercel/serverless: use /tmp (ephemeral, re-seeded on cold start — fine for demo)
// On local dev: use persistent data/ folder
const DB_PATH = process.env.VERCEL || process.env.USE_TMP_DB
  ? '/tmp/tablespace.db'
  : path.join(process.cwd(), 'data', 'tablespace.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

type SqlParam = string | number | bigint | null | boolean;

// Thin wrapper that makes node:sqlite look like better-sqlite3
class DbWrapper {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
    this.db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  }

  prepare(sql: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stmt = (this.db.prepare as any)(sql);
    return {
      all: (...params: SqlParam[]): Record<string, unknown>[] => {
        return stmt.all(...params) as Record<string, unknown>[];
      },
      get: (...params: SqlParam[]): Record<string, unknown> | undefined => {
        return stmt.get(...params) as Record<string, unknown> | undefined;
      },
      run: (...params: SqlParam[]): { lastInsertRowid: number; changes: number } => {
        const r = stmt.run(...params);
        return { lastInsertRowid: Number(r.lastInsertRowid), changes: r.changes };
      },
    };
  }

  exec(sql: string) {
    return this.db.exec(sql);
  }

  transaction(fn: () => void) {
    return () => {
      this.db.exec('BEGIN');
      try { fn(); this.db.exec('COMMIT'); }
      catch (e) { this.db.exec('ROLLBACK'); throw e; }
    };
  }
}

let _db: DbWrapper | null = null;

export function getDb(): DbWrapper {
  if (_db) return _db;
  const raw = new DatabaseSync(DB_PATH);
  _db = new DbWrapper(raw);
  initSchema(_db);
  return _db;
}

function initSchema(db: DbWrapper) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company TEXT NOT NULL,
      contact_name TEXT, email TEXT, phone TEXT, city TEXT,
      seats_required INTEGER, budget_per_seat REAL,
      stage TEXT DEFAULT 'Prospecting', score INTEGER DEFAULT 50,
      source TEXT, status TEXT DEFAULT 'active', notes TEXT,
      expected_revenue REAL, close_date TEXT,
      account_type TEXT DEFAULT 'Growth', industry TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT, lead_id INTEGER,
      type TEXT, subject TEXT, description TEXT, due_date TEXT,
      completed INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS competitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
      cities_count INTEGER, total_sqft INTEGER, price_per_seat REAL,
      occupancy_est REAL, review_score REAL, trend TEXT,
      risk_level TEXT, notes TEXT, updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS pricing_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT, competitor_id INTEGER,
      city TEXT, price_per_seat REAL, recorded_at TEXT, source_method TEXT
    );
    CREATE TABLE IF NOT EXISTS centres (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL,
      city TEXT, sqft INTEGER, total_seats INTEGER,
      occupied_seats INTEGER, available_seats INTEGER,
      non_usable_seats INTEGER, revenue_per_seat REAL,
      centre_type TEXT, status TEXT, lat REAL, lng REAL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS centre_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT, centre_id INTEGER,
      date TEXT, occupied_seats INTEGER, available_seats INTEGER,
      revenue REAL, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS geo_zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT, city TEXT, zone_name TEXT,
      expansion_score REAL, nightlight_index REAL, search_growth REAL,
      enterprise_density REAL, competitor_count INTEGER,
      avg_price_per_seat REAL, infra_notes TEXT, recommendation TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS market_share_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT, company TEXT, city TEXT,
      share_pct REAL, quarter INTEGER, year INTEGER,
      source_note TEXT, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT,
      email TEXT,
      city TEXT,
      target_revenue REAL DEFAULT 0,
      avatar_color TEXT DEFAULT '#f97316',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Migrations: add columns that may not exist in older DBs
  const migrations = [
    "ALTER TABLE leads ADD COLUMN assigned_to TEXT DEFAULT NULL",
    "ALTER TABLE leads ADD COLUMN probability INTEGER DEFAULT NULL",
    "ALTER TABLE activities ADD COLUMN employee_id INTEGER DEFAULT NULL",
  ];
  for (const m of migrations) {
    try { db.exec(m); } catch { /* column already exists */ }
  }
}

export default getDb;
