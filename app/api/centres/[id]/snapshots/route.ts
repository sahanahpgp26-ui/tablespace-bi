import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const snapshots = db.prepare(
    'SELECT date, occupied_seats, available_seats, revenue FROM centre_snapshots WHERE centre_id = ? ORDER BY date ASC'
  ).all(params.id);
  return NextResponse.json(snapshots);
}
