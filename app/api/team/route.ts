import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export function GET() {
  const db = getDb();

  // All employees
  const employees = db.prepare('SELECT * FROM employees ORDER BY target_revenue DESC').all();

  // Per-employee lead stats (active pipeline)
  const pipelineStats = db.prepare(`
    SELECT
      assigned_to,
      COUNT(*) as total_leads,
      SUM(expected_revenue) as pipeline_value,
      AVG(score) as avg_score,
      SUM(CASE WHEN stage IN ('Negotiation/Review','Closed Won') THEN expected_revenue ELSE 0 END) as hot_pipeline,
      COUNT(CASE WHEN stage IN ('Negotiation/Review') THEN 1 END) as in_negotiation,
      COUNT(CASE WHEN stage IN ('Proposal/Price Quote') THEN 1 END) as in_proposal,
      SUM(CASE WHEN strftime('%Y-%m',close_date) = strftime('%Y-%m','now') THEN expected_revenue ELSE 0 END) as closing_this_month
    FROM leads
    WHERE status = 'active' AND assigned_to IS NOT NULL
    GROUP BY assigned_to
  `).all() as Record<string, unknown>[];

  // Won deals per employee
  const wonStats = db.prepare(`
    SELECT
      assigned_to,
      COUNT(*) as won_count,
      SUM(expected_revenue) as won_revenue
    FROM leads
    WHERE status = 'won' AND assigned_to IS NOT NULL
    GROUP BY assigned_to
  `).all() as Record<string, unknown>[];

  // Stage distribution per employee
  const stageDistrib = db.prepare(`
    SELECT assigned_to, stage, COUNT(*) as count, SUM(expected_revenue) as revenue
    FROM leads
    WHERE status = 'active' AND assigned_to IS NOT NULL
    GROUP BY assigned_to, stage
    ORDER BY assigned_to, stage
  `).all() as Record<string, unknown>[];

  // Activities per employee (recent 30 days)
  const activityStats = db.prepare(`
    SELECT
      e.name as employee_name,
      COUNT(a.id) as total_activities,
      COUNT(CASE WHEN a.completed = 1 THEN 1 END) as completed_activities,
      COUNT(CASE WHEN a.type = 'Call' THEN 1 END) as calls,
      COUNT(CASE WHEN a.type = 'Meeting' THEN 1 END) as meetings,
      COUNT(CASE WHEN a.type = 'Demo' THEN 1 END) as demos
    FROM employees e
    LEFT JOIN leads l ON l.assigned_to = e.name AND l.status = 'active'
    LEFT JOIN activities a ON a.lead_id = l.id AND a.created_at >= datetime('now', '-30 days')
    GROUP BY e.name
  `).all() as Record<string, unknown>[];

  // Recent leads per employee (last 5)
  const recentLeads = db.prepare(`
    SELECT id, company, city, stage, score, expected_revenue, assigned_to, close_date, status, account_type
    FROM leads
    WHERE assigned_to IS NOT NULL AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 100
  `).all() as Record<string, unknown>[];

  // Leaderboard: rank by won_revenue desc
  interface WonRow   { assigned_to: string; won_count: number; won_revenue: number }
  interface PipeRow  { assigned_to: string; total_leads: number; pipeline_value: number; avg_score: number; hot_pipeline: number; in_negotiation: number; in_proposal: number; closing_this_month: number }
  interface ActRow   { employee_name: string; total_activities: number; completed_activities: number; calls: number; meetings: number; demos: number }
  interface StageRow { assigned_to: string; stage: string; count: number; revenue: number }

  const wonMap: Record<string, WonRow>  = {};
  (wonStats as unknown as WonRow[]).forEach(w => { wonMap[w.assigned_to] = w; });

  const pipeMap: Record<string, PipeRow> = {};
  (pipelineStats as unknown as PipeRow[]).forEach(p => { pipeMap[p.assigned_to] = p; });

  const actMap: Record<string, ActRow> = {};
  (activityStats as unknown as ActRow[]).forEach(a => { actMap[a.employee_name] = a; });

  const stageMap: Record<string, StageRow[]> = {};
  (stageDistrib as unknown as StageRow[]).forEach(s => {
    if (!stageMap[s.assigned_to]) stageMap[s.assigned_to] = [];
    stageMap[s.assigned_to].push(s);
  });

  interface EmpRow { id: number; name: string; role: string; email: string; city: string; target_revenue: number; avatar_color: string }

  const teamData = (employees as unknown as EmpRow[]).map(emp => {
    const pipe   = pipeMap[emp.name]  || {};
    const won    = wonMap[emp.name]   || { won_count: 0, won_revenue: 0 };
    const act    = actMap[emp.name]   || { total_activities: 0, completed_activities: 0, calls: 0, meetings: 0, demos: 0 };
    const stages = stageMap[emp.name] || [];

    const wonRev     = (won.won_revenue as number) || 0;
    const targetRev  = emp.target_revenue || 1;
    const attainment = Math.round((wonRev / targetRev) * 100);

    return {
      ...emp,
      pipeline_value:     (pipe.pipeline_value   as number) || 0,
      total_leads:        (pipe.total_leads       as number) || 0,
      avg_score:          Math.round((pipe.avg_score as number) || 0),
      hot_pipeline:       (pipe.hot_pipeline      as number) || 0,
      in_negotiation:     (pipe.in_negotiation    as number) || 0,
      in_proposal:        (pipe.in_proposal       as number) || 0,
      closing_this_month: (pipe.closing_this_month as number) || 0,
      won_count:          (won.won_count           as number) || 0,
      won_revenue:        wonRev,
      attainment_pct:     attainment,
      total_activities:   (act.total_activities   as number) || 0,
      completed_activities:(act.completed_activities as number) || 0,
      calls:              (act.calls              as number) || 0,
      meetings:           (act.meetings           as number) || 0,
      demos:              (act.demos              as number) || 0,
      stage_breakdown:    stages,
      leads:              (recentLeads as unknown as { assigned_to: string }[]).filter(l => l.assigned_to === emp.name),
    };
  });

  // Team-level summary
  const teamSummary = {
    total_pipeline:    teamData.reduce((s, e) => s + e.pipeline_value, 0),
    total_won:         teamData.reduce((s, e) => s + e.won_revenue, 0),
    total_target:      teamData.reduce((s, e) => s + e.target_revenue, 0),
    avg_attainment:    Math.round(teamData.reduce((s, e) => s + e.attainment_pct, 0) / Math.max(1, teamData.length)),
    total_leads:       teamData.reduce((s, e) => s + e.total_leads, 0),
    total_activities:  teamData.reduce((s, e) => s + e.total_activities, 0),
  };

  return NextResponse.json({ team: teamData, summary: teamSummary });
}
