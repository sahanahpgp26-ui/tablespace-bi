import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export function GET(req: NextRequest) {
  const db = getDb();
  const q = new URL(req.url).searchParams.get('q')?.trim();
  if (!q || q.length < 2) return NextResponse.json({ leads: [], centres: [], zones: [] });

  const like = `%${q}%`;

  const leads = db.prepare(
    "SELECT id, company, contact_name, city, stage, score FROM leads WHERE company LIKE ? OR contact_name LIKE ? LIMIT 10"
  ).all(like, like);

  const centres = db.prepare(
    "SELECT id, name, city, centre_type FROM centres WHERE name LIKE ? OR city LIKE ? LIMIT 10"
  ).all(like, like);

  const zones = db.prepare(
    "SELECT id, zone_name, city, expansion_score, recommendation FROM geo_zones WHERE zone_name LIKE ? OR city LIKE ? LIMIT 10"
  ).all(like, like);

  return NextResponse.json({ leads, centres, zones });
}
