import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export function GET() {
  const db = getDb();
  const zones = db.prepare('SELECT * FROM geo_zones ORDER BY expansion_score DESC').all();
  return NextResponse.json(zones);
}
