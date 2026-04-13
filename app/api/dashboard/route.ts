import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export function GET() {
  const db = getDb();

  // Pipeline stats
  const stageStats = db.prepare(`
    SELECT stage, COUNT(*) as count, SUM(expected_revenue) as total_revenue, AVG(score) as avg_score
    FROM leads WHERE status = 'active'
    GROUP BY stage ORDER BY stage
  `).all();

  const wonStats = db.prepare(`
    SELECT COUNT(*) as count, SUM(expected_revenue) as revenue
    FROM leads WHERE status = 'won'
  `).get() as { count: number; revenue: number };

  const totalPipeline = db.prepare(
    "SELECT SUM(expected_revenue) as total FROM leads WHERE status = 'active'"
  ).get() as { total: number };

  // Revenue by source
  const bySource = db.prepare(`
    SELECT source, COUNT(*) as count, SUM(expected_revenue) as revenue
    FROM leads WHERE status != 'lost'
    GROUP BY source ORDER BY revenue DESC
  `).all();

  // Revenue by city
  const byCity = db.prepare(`
    SELECT city, COUNT(*) as count, SUM(expected_revenue) as revenue, AVG(score) as avg_score
    FROM leads WHERE status != 'lost'
    GROUP BY city ORDER BY revenue DESC
  `).all();

  // Quarterly closed won (by close_date)
  const quarterly = db.prepare(`
    SELECT
      CASE
        WHEN strftime('%m', close_date) IN ('01','02','03') THEN 'Q1-' || strftime('%Y', close_date)
        WHEN strftime('%m', close_date) IN ('04','05','06') THEN 'Q2-' || strftime('%Y', close_date)
        WHEN strftime('%m', close_date) IN ('07','08','09') THEN 'Q3-' || strftime('%Y', close_date)
        ELSE 'Q4-' || strftime('%Y', close_date)
      END as quarter,
      SUM(expected_revenue) as revenue,
      COUNT(*) as deals
    FROM leads WHERE status = 'won' AND close_date <= date('now')
    GROUP BY quarter ORDER BY close_date
  `).all();

  // Probability-weighted pipeline
  const weightedPipeline = db.prepare(`
    SELECT SUM(
      CASE stage
        WHEN 'Prospecting'         THEN expected_revenue * 0.10
        WHEN 'Qualification'       THEN expected_revenue * 0.20
        WHEN 'Needs Analysis'      THEN expected_revenue * 0.25
        WHEN 'Value Proposition'   THEN expected_revenue * 0.35
        WHEN 'Id. Decision Makers' THEN expected_revenue * 0.40
        WHEN 'Perception Analysis' THEN expected_revenue * 0.50
        WHEN 'Proposal/Price Quote' THEN expected_revenue * 0.65
        WHEN 'Negotiation/Review'  THEN expected_revenue * 0.80
        ELSE expected_revenue * 0.10
      END
    ) as total FROM leads WHERE status = 'active'
  `).get() as { total: number };

  // Win rate + loss count
  const lostStats = db.prepare(
    "SELECT COUNT(*) as count FROM leads WHERE status = 'lost'"
  ).get() as { count: number };

  // Closing this month
  const closingThisMonth = db.prepare(`
    SELECT COUNT(*) as count, COALESCE(SUM(expected_revenue),0) as revenue
    FROM leads WHERE status = 'active'
      AND strftime('%Y-%m', close_date) = strftime('%Y-%m', 'now')
  `).get() as { count: number; revenue: number };

  // Stage funnel
  const stageOrder = ['Prospecting','Qualification','Needs Analysis','Value Proposition','Id. Decision Makers','Perception Analysis','Proposal/Price Quote','Negotiation/Review'];
  const funnelData = stageOrder.map(stage => {
    const row = (stageStats as { stage: string; count: number; total_revenue: number }[]).find(r => r.stage === stage);
    return { stage, count: row?.count || 0, revenue: row?.total_revenue || 0 };
  });

  // Account type breakdown
  const byAccountType = db.prepare(`
    SELECT account_type, COUNT(*) as count, SUM(expected_revenue) as revenue
    FROM leads WHERE status != 'lost'
    GROUP BY account_type
  `).all();

  // Recent leads (last 10)
  const recentLeads = db.prepare(
    "SELECT id, company, contact_name, city, stage, score, source, expected_revenue, created_at FROM leads ORDER BY created_at DESC LIMIT 10"
  ).all();

  return NextResponse.json({
    stage_stats: stageStats,
    won_stats: wonStats,
    total_pipeline: totalPipeline.total || 0,
    weighted_pipeline: weightedPipeline.total || 0,
    by_source: bySource,
    by_city: byCity,
    quarterly,
    funnel: funnelData,
    by_account_type: byAccountType,
    recent_leads: recentLeads,
    win_rate: (wonStats.count + lostStats.count) > 0
      ? Math.round(wonStats.count / (wonStats.count + lostStats.count) * 100)
      : 0,
    closing_this_month: closingThisMonth,
  });
}
