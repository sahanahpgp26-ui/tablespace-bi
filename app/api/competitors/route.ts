import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export function GET() {
  const db = getDb();
  const competitors = db.prepare('SELECT * FROM competitors ORDER BY risk_level DESC, cities_count DESC').all() as Record<string, unknown>[];

  // Attach pricing history per competitor
  const result = competitors.map(comp => {
    const pricing = db.prepare(
      'SELECT city, price_per_seat, recorded_at FROM pricing_history WHERE competitor_id = ? ORDER BY recorded_at DESC LIMIT 24'
    ).all(comp.id as number);

    // Market share history (8 quarters)
    const msh = db.prepare(
      'SELECT share_pct, quarter, year FROM market_share_history WHERE company = ? ORDER BY year, quarter'
    ).all(comp.name as string);

    return { ...comp, pricing_history: pricing, market_share_trend: msh };
  });

  // Also get TableSpace market share
  const tsShare = db.prepare(
    "SELECT share_pct, quarter, year FROM market_share_history WHERE company = 'TableSpace' ORDER BY year, quarter"
  ).all();

  // Overall market share by quarter (all companies, averaged across cities)
  const allShare = db.prepare(`
    SELECT company, quarter, year, AVG(share_pct) as share_pct
    FROM market_share_history
    GROUP BY company, quarter, year
    ORDER BY year, quarter
  `).all();

  return NextResponse.json({ competitors: result, tablespace_share: tsShare, all_share: allShare });
}
