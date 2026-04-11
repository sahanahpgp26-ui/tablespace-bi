import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city');
  const type = searchParams.get('type');
  const includeSnapshots = searchParams.get('snapshots') === 'true';

  let query = 'SELECT * FROM centres WHERE 1=1';
  const params: (string | number | null)[] = [];
  if (city) { query += ' AND city = ?'; params.push(city); }
  if (type) { query += ' AND centre_type = ?'; params.push(type); }
  query += ' ORDER BY city, occupied_seats DESC';

  const centres = db.prepare(query).all(...params) as Record<string, unknown>[];

  if (includeSnapshots) {
    const centresWithSnaps = centres.map(centre => {
      const snaps = db.prepare(
        'SELECT date, occupied_seats, available_seats, revenue FROM centre_snapshots WHERE centre_id = ? ORDER BY date DESC LIMIT 90'
      ).all(centre.id as number);
      return { ...centre, snapshots: snaps };
    });
    return NextResponse.json(centresWithSnaps);
  }

  return NextResponse.json(centres);
}
