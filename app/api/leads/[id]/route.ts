import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(params.id);
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const activities = db.prepare('SELECT * FROM activities WHERE lead_id = ? ORDER BY created_at DESC').all(params.id);
  return NextResponse.json({ ...lead as object, activities });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const body = await req.json();
  const allowed = ['stage', 'score', 'status', 'notes', 'close_date', 'expected_revenue', 'budget_per_seat'];
  const updates = Object.entries(body).filter(([k]) => allowed.includes(k));
  if (!updates.length) return NextResponse.json({ error: 'No valid fields' }, { status: 400 });

  const setClauses = [...updates.map(([k]) => `${k} = ?`), "updated_at = datetime('now')"].join(', ');
  const values = [...updates.map(([, v]) => v as string | number | null), params.id];
  db.prepare(`UPDATE leads SET ${setClauses} WHERE id = ?`).run(...values);

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(params.id);
  return NextResponse.json(lead);
}
