import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export function GET() {
  const db = getDb();

  // Latest price per competitor per city
  const latest = db.prepare(`
    SELECT ph.competitor_id, COALESCE(c.name, 'TableSpace') as company,
           ph.city, ph.price_per_seat, ph.recorded_at, ph.source_method
    FROM pricing_history ph
    LEFT JOIN competitors c ON ph.competitor_id = c.id
    WHERE ph.recorded_at = (
      SELECT MAX(ph2.recorded_at) FROM pricing_history ph2
      WHERE ph2.competitor_id = ph.competitor_id AND ph2.city = ph.city
    )
    ORDER BY ph.city, ph.price_per_seat
  `).all() as { company: string; city: string; price_per_seat: number; recorded_at: string; source_method: string }[];

  // All quarters for trend
  const trend = db.prepare(`
    SELECT ph.competitor_id, COALESCE(c.name, 'TableSpace') as company,
           ph.city, ph.price_per_seat, ph.recorded_at
    FROM pricing_history ph
    LEFT JOIN competitors c ON ph.competitor_id = c.id
    ORDER BY ph.recorded_at, ph.city
  `).all();

  // Per-city stats
  const cities = ['Bangalore', 'Mumbai', 'Gurugram', 'Hyderabad', 'Pune', 'Chennai'];
  const cityStats = cities.map(city => {
    const rows = latest.filter(r => r.city === city);
    const prices = rows.map(r => r.price_per_seat);
    const tsRow = rows.find(r => r.company === 'TableSpace');
    const others = prices.filter((_, i) => rows[i].company !== 'TableSpace');
    const median = others.sort((a, b) => a - b)[Math.floor(others.length / 2)] || 0;
    const min = Math.min(...others);
    const max = Math.max(...others);
    const tsPrice = tsRow?.price_per_seat || 0;
    let recommended = 'Competitive — maintain';
    if (tsPrice > max) recommended = 'Consider discount on large deals';
    else if (tsPrice < median * 0.95) recommended = 'Room to increase — check NPS first';
    return { city, our_price: tsPrice, market_min: min, market_max: max, market_median: median, recommended };
  });

  return NextResponse.json({ latest, trend, city_stats: cityStats });
}
