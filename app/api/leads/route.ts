import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const stage = searchParams.get('stage');
  const city = searchParams.get('city');
  const status = searchParams.get('status') || 'active';

  let query = 'SELECT * FROM leads WHERE 1=1';
  const params: (string | number | bigint | null)[] = [];

  if (stage) { query += ' AND stage = ?'; params.push(stage); }
  if (city) { query += ' AND city = ?'; params.push(city); }
  if (status !== 'all') { query += ' AND status = ?'; params.push(status); }
  query += ' ORDER BY score DESC, created_at DESC';

  const leads = db.prepare(query).all(...params);
  return NextResponse.json(leads);
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const {
    company, contact_name, email, phone, city, seats_required,
    budget_per_seat, stage = 'Prospecting', score = 50, source,
    notes, expected_revenue, close_date, account_type = 'Growth',
    industry
  } = body;

  const result = db.prepare(`
    INSERT INTO leads (company, contact_name, email, phone, city, seats_required,
      budget_per_seat, stage, score, source, notes, expected_revenue, close_date,
      account_type, industry, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).run(company, contact_name, email, phone, city, seats_required,
    budget_per_seat, stage, score, source, notes, expected_revenue, close_date,
    account_type, industry);

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(lead, { status: 201 });
}
