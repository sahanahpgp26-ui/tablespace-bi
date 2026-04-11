'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import InsightCallout from '@/components/InsightCallout';
import ExportButton from '@/components/ExportButton';
import LastUpdated from '@/components/LastUpdated';
import DataSourceTooltip from '@/components/DataSourceTooltip';

// ─────────────────────────────────────────────────────────────
function fmtRevenue(n: number) {
  if (!n) return '₹0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
}

function attainColor(pct: number) {
  if (pct >= 80) return '#34d399';
  if (pct >= 50) return '#fbbf24';
  return '#f87171';
}

function scoreColor(score: number) {
  if (score >= 70) return '#34d399';
  if (score >= 45) return '#fbbf24';
  return '#f87171';
}

const STAGE_COLORS: Record<string, string> = {
  'Prospecting':        '#8896aa',
  'Qualification':      '#38bdf8',
  'Needs Analysis':     '#a78bfa',
  'Value Proposition':  '#fbbf24',
  'Id. Decision Makers':'#f97316',
  'Perception Analysis':'#f43f5e',
  'Proposal/Price Quote':'#fbbf24',
  'Negotiation/Review': '#f97316',
  'Closed Won':         '#34d399',
};

// ─── Types ───────────────────────────────────────────────────
interface StageBreakdown { stage: string; count: number; revenue: number }
interface LeadRow { id: number; company: string; city: string; stage: string; score: number; expected_revenue: number; close_date: string; account_type: string }

interface Employee {
  id: number;
  name: string;
  role: string;
  email: string;
  city: string;
  target_revenue: number;
  avatar_color: string;
  pipeline_value: number;
  total_leads: number;
  avg_score: number;
  hot_pipeline: number;
  in_negotiation: number;
  in_proposal: number;
  closing_this_month: number;
  won_count: number;
  won_revenue: number;
  attainment_pct: number;
  total_activities: number;
  completed_activities: number;
  calls: number;
  meetings: number;
  demos: number;
  stage_breakdown: StageBreakdown[];
  leads: LeadRow[];
}

interface TeamSummary {
  total_pipeline:   number;
  total_won:        number;
  total_target:     number;
  avg_attainment:   number;
  total_leads:      number;
  total_activities: number;
}

// ─── Employee Card ────────────────────────────────────────────
function EmployeeCard({ emp, isSelected, onClick }: { emp: Employee; isSelected: boolean; onClick: () => void }) {
  const attain = emp.attainment_pct;
  const actCompl = emp.total_activities > 0
    ? Math.round((emp.completed_activities / emp.total_activities) * 100)
    : 0;

  return (
    <div
      onClick={onClick}
      className="card cursor-pointer transition-all"
      style={{
        borderRadius: '10px',
        border: isSelected ? `1px solid ${emp.avatar_color}` : '1px solid #1e2530',
        background: isSelected ? `${emp.avatar_color}0a` : '#0f1318',
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-black shrink-0"
          style={{ background: emp.avatar_color }}
        >{initials(emp.name)}</div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[#dde3ed] text-sm truncate">{emp.name}</div>
          <div className="text-[11px] text-[#8896aa] truncate">{emp.role}</div>
          <div className="text-[10px] text-[#4a5568]">{emp.city}</div>
        </div>
        {/* Attainment badge */}
        <div className="text-right shrink-0">
          <div className="font-mono font-bold text-lg" style={{ color: attainColor(attain) }}>{attain}%</div>
          <div className="text-[10px] text-[#4a5568]">attainment</div>
        </div>
      </div>

      {/* Attainment bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-[10px] text-[#4a5568] mb-1">
          <span>Quota: {fmtRevenue(emp.target_revenue)}</span>
          <span>Won: {fmtRevenue(emp.won_revenue)}</span>
        </div>
        <div className="h-1.5 rounded-full bg-[#1e2530] overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${Math.min(attain, 100)}%`, background: attainColor(attain) }} />
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: 'Pipeline',     value: fmtRevenue(emp.pipeline_value), color: '#38bdf8' },
          { label: 'Leads',        value: emp.total_leads.toString(),     color: '#dde3ed' },
          { label: 'Avg Score',    value: emp.avg_score.toString(),       color: scoreColor(emp.avg_score) },
        ].map(m => (
          <div key={m.label} className="rounded-lg p-2" style={{ background: '#161b23' }}>
            <div className="text-[9px] text-[#4a5568] mb-0.5">{m.label}</div>
            <div className="font-mono text-xs font-semibold" style={{ color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Activity row */}
      <div className="flex items-center justify-between text-[10px] text-[#8896aa]">
        <span>📞 {emp.calls} calls</span>
        <span>🤝 {emp.meetings} meetings</span>
        <span>📺 {emp.demos} demos</span>
        <span className="text-[#4a5568]">{actCompl}% done</span>
      </div>

      {/* Hot pipeline chip */}
      {emp.hot_pipeline > 0 && (
        <div className="mt-2 flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#f97316] animate-pulse" />
          <span className="text-[10px] text-[#f97316]">{fmtRevenue(emp.hot_pipeline)} hot pipeline</span>
          <span className="text-[10px] text-[#4a5568]">({emp.in_negotiation} in negotiation)</span>
        </div>
      )}
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────
function EmployeeDetail({ emp }: { emp: Employee }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'activity'>('overview');

  // Radar chart data
  const radarData = [
    { metric: 'Pipeline',    value: Math.min(100, Math.round((emp.pipeline_value / Math.max(emp.target_revenue, 1)) * 100)) },
    { metric: 'Won',         value: emp.attainment_pct },
    { metric: 'Score',       value: emp.avg_score },
    { metric: 'Activity',    value: emp.total_activities > 0 ? Math.round((emp.completed_activities / emp.total_activities) * 100) : 0 },
    { metric: 'Hot pipe',    value: emp.hot_pipeline > 0 ? Math.min(100, Math.round((emp.hot_pipeline / Math.max(emp.pipeline_value, 1)) * 100)) : 0 },
    { metric: 'Speed',       value: Math.min(100, emp.total_leads > 0 ? Math.round((emp.won_count / emp.total_leads) * 200) : 0) },
  ];

  // Stage breakdown bar data
  const stageData = emp.stage_breakdown.map(s => ({
    stage: s.stage.replace('/Price Quote', '').replace('/Review', '').replace('Id. ', '').replace('Perception ', ''),
    count: s.count,
    revenue: Math.round(s.revenue / 100000),
    color: STAGE_COLORS[s.stage] || '#8896aa',
  }));

  return (
    <div className="card" style={{ borderRadius: '10px' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#1e2530]">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-black shrink-0"
          style={{ background: emp.avatar_color }}
        >{initials(emp.name)}</div>
        <div>
          <div className="font-semibold text-[#dde3ed]">{emp.name}</div>
          <div className="text-xs text-[#8896aa]">{emp.role} · {emp.city}</div>
          <div className="text-[11px] text-[#4a5568]">{emp.email}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="font-mono text-2xl font-bold" style={{ color: attainColor(emp.attainment_pct) }}>{emp.attainment_pct}%</div>
          <div className="text-[10px] text-[#4a5568]">quota attainment</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-[#1e2530]">
        {(['overview', 'leads', 'activity'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className="px-3 py-1.5 text-xs font-medium capitalize transition-colors"
            style={{
              color: activeTab === t ? '#f97316' : '#8896aa',
              borderBottom: activeTab === t ? '2px solid #f97316' : '2px solid transparent',
            }}
          >{t}</button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div>
          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Won Revenue',       value: fmtRevenue(emp.won_revenue),         color: '#34d399' },
              { label: 'Active Pipeline',   value: fmtRevenue(emp.pipeline_value),       color: '#38bdf8' },
              { label: 'Quota Target',      value: fmtRevenue(emp.target_revenue),       color: '#dde3ed' },
              { label: 'Closing This Month',value: fmtRevenue(emp.closing_this_month),   color: '#f97316' },
              { label: 'In Negotiation',    value: `${emp.in_negotiation} deals`,        color: '#a78bfa' },
              { label: 'In Proposal',       value: `${emp.in_proposal} deals`,           color: '#fbbf24' },
            ].map(m => (
              <div key={m.label} className="rounded-lg p-3" style={{ background: '#161b23' }}>
                <div className="text-[10px] text-[#4a5568] mb-0.5">{m.label}</div>
                <div className="font-mono font-semibold text-sm" style={{ color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Radar */}
          <div className="mb-4">
            <div className="text-xs text-[#8896aa] mb-2">Performance Radar</div>
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.06)" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 9, fill: '#8896aa' }} />
                <Radar name={emp.name} dataKey="value" stroke={emp.avatar_color} fill={emp.avatar_color} fillOpacity={0.15} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Stage breakdown */}
          {stageData.length > 0 && (
            <div>
              <div className="text-xs text-[#8896aa] mb-2">Pipeline by Stage</div>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={stageData} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="stage" tick={{ fontSize: 8, fill: '#8896aa' }} />
                  <YAxis tick={{ fontSize: 8, fill: '#8896aa' }} />
                  <Tooltip
                    contentStyle={{ background: '#0f1318', border: '1px solid #2d3848', borderRadius: '8px' }}
                    formatter={(v: number, name: string) => [name === 'revenue' ? `₹${v}L` : v, name === 'revenue' ? 'Revenue' : 'Leads']}
                  />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                    {stageData.map((s, i) => <Cell key={i} fill={s.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {activeTab === 'leads' && (
        <div>
          <div className="text-xs text-[#8896aa] mb-3">{emp.leads.length} active leads assigned</div>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {emp.leads.length === 0 ? (
              <div className="text-[12px] text-[#4a5568] text-center py-8">No active leads assigned</div>
            ) : emp.leads.map(lead => {
              const days = Math.ceil((new Date(lead.close_date).getTime() - Date.now()) / 86400000);
              return (
                <div key={lead.id} className="rounded-lg p-3 hover:bg-[#1a2030] transition-colors" style={{ background: '#161b23' }}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-medium text-[13px] text-[#dde3ed]">{lead.company}</span>
                    <span className="font-mono text-xs shrink-0" style={{ color: scoreColor(lead.score) }}>{lead.score}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-[#8896aa]">
                    <span>{lead.city}</span>
                    <span>·</span>
                    <span className="badge" style={{ background: `${STAGE_COLORS[lead.stage] || '#8896aa'}20`, color: STAGE_COLORS[lead.stage] || '#8896aa', fontSize: '10px' }}>
                      {lead.stage.replace('/Price Quote', '').replace('/Review', '')}
                    </span>
                    <span className="ml-auto font-mono text-[#34d399]">{fmtRevenue(lead.expected_revenue)}</span>
                    {lead.close_date && (
                      <span style={{ color: days < 0 ? '#f87171' : days <= 7 ? '#fbbf24' : '#4a5568' }}>
                        {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { label: 'Total Activities', value: emp.total_activities.toString(),  color: '#dde3ed' },
              { label: 'Completed',        value: emp.completed_activities.toString(), color: '#34d399' },
              { label: 'Calls',            value: emp.calls.toString(),             color: '#38bdf8' },
              { label: 'Meetings',         value: emp.meetings.toString(),          color: '#a78bfa' },
              { label: 'Demos',            value: emp.demos.toString(),             color: '#fbbf24' },
              { label: 'Completion Rate',
                value: emp.total_activities > 0
                  ? `${Math.round((emp.completed_activities / emp.total_activities) * 100)}%`
                  : '—',
                color: '#f97316' },
            ].map(m => (
              <div key={m.label} className="rounded-lg p-3" style={{ background: '#161b23' }}>
                <div className="text-[10px] text-[#4a5568] mb-0.5">{m.label}</div>
                <div className="font-mono font-semibold text-sm" style={{ color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-[#4a5568] italic">Activity data from last 30 days · JOIN with activities table</div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function TeamPage() {
  const [teamData, setTeamData]   = useState<Employee[]>([]);
  const [summary, setSummary]     = useState<TeamSummary | null>(null);
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<Employee | null>(null);
  const [sortBy, setSortBy]       = useState<'attainment' | 'pipeline' | 'leads' | 'score'>('attainment');

  useEffect(() => {
    fetch('/api/team').then(r => r.json()).then(d => {
      setTeamData(d.team || []);
      setSummary(d.summary || null);
      if (d.team?.length > 0) setSelected(d.team[0]);
      setLoading(false);
    });
  }, []);

  const sorted = [...teamData].sort((a, b) => {
    if (sortBy === 'attainment') return b.attainment_pct - a.attainment_pct;
    if (sortBy === 'pipeline')   return b.pipeline_value - a.pipeline_value;
    if (sortBy === 'leads')      return b.total_leads - a.total_leads;
    if (sortBy === 'score')      return b.avg_score - a.avg_score;
    return 0;
  });

  const leaderboard = [...teamData].sort((a, b) => b.won_revenue - a.won_revenue);
  const topPerformer = leaderboard[0];
  const atRisk = teamData.filter(e => e.attainment_pct < 50);

  const insight = summary
    ? `Team pipeline: ${fmtRevenue(summary.total_pipeline)} across ${summary.total_leads} leads. Avg quota attainment: ${summary.avg_attainment}%. ${atRisk.length > 0 ? `${atRisk.map(e => e.name.split(' ')[0]).join(', ')} below 50% attainment — needs coaching.` : 'All reps above 50% attainment.'} ${topPerformer ? `Top performer: ${topPerformer.name} with ${fmtRevenue(topPerformer.won_revenue)} won.` : ''}`
    : 'Loading team data…';

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => <div key={i} className="card h-24 animate-pulse" style={{ background: '#161b23' }} />)}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="card h-52 animate-pulse" style={{ background: '#161b23' }} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-[#dde3ed]">Team Performance</h1>
          <div className="text-xs text-[#8896aa] mt-0.5">{teamData.length} sales reps · Live pipeline & activity tracking</div>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton data={teamData.map(e => ({
            name: e.name, role: e.role, city: e.city,
            pipeline: e.pipeline_value, won: e.won_revenue,
            target: e.target_revenue, attainment: `${e.attainment_pct}%`,
            leads: e.total_leads, activities: e.total_activities,
          }))} filename="team-performance" />
          <div className="flex items-center gap-1 text-xs text-[#4a5568]">
            Sort:
            {(['attainment', 'pipeline', 'leads', 'score'] as const).map(s => (
              <button key={s} onClick={() => setSortBy(s)}
                className="px-2 py-1 rounded text-xs capitalize"
                style={{
                  background: sortBy === s ? 'rgba(249,115,22,0.15)' : '#161b23',
                  color: sortBy === s ? '#f97316' : '#8896aa',
                  border: `1px solid ${sortBy === s ? 'rgba(249,115,22,0.4)' : '#1e2530'}`,
                }}
              >{s}</button>
            ))}
          </div>
        </div>
      </div>

      <InsightCallout insight={insight} />

      {/* Team KPI Row */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Team Pipeline',   value: fmtRevenue(summary.total_pipeline),   color: '#38bdf8',
              tip: { metric: 'Team Pipeline', source: 'leads table', method: 'SUM(expected_revenue) WHERE status=active, grouped by assigned_to', confidence: 'High' as const, refreshRate: 'Real-time' } },
            { label: 'Team Won',        value: fmtRevenue(summary.total_won),         color: '#34d399',
              tip: { metric: 'Team Won', source: 'leads table', method: 'SUM(expected_revenue) WHERE status=won', confidence: 'High' as const, refreshRate: 'Real-time' } },
            { label: 'Team Target',     value: fmtRevenue(summary.total_target),      color: '#dde3ed',
              tip: { metric: 'Team Target', source: 'employees table', method: 'SUM(target_revenue)', confidence: 'High' as const, refreshRate: 'Quarterly' } },
            { label: 'Avg Attainment',  value: `${summary.avg_attainment}%`,          color: attainColor(summary.avg_attainment),
              tip: { metric: 'Avg Attainment', source: 'leads + employees', method: 'AVG(won_revenue / target_revenue)', confidence: 'High' as const, refreshRate: 'Real-time' } },
            { label: 'Total Leads',     value: summary.total_leads.toString(),         color: '#dde3ed',
              tip: { metric: 'Total Leads', source: 'leads table', method: 'COUNT(*) WHERE status=active', confidence: 'High' as const, refreshRate: 'Real-time' } },
            { label: 'Activities (30d)',value: summary.total_activities.toString(),    color: '#a78bfa',
              tip: { metric: 'Activities (30d)', source: 'activities table', method: 'COUNT(*) WHERE created_at > now()-30d', confidence: 'High' as const, refreshRate: 'Real-time' } },
          ].map(k => (
            <div key={k.label} className="card p-4" style={{ borderRadius: '10px' }}>
              <div className="flex items-center gap-1 text-[10px] text-[#8896aa] mb-1">
                {k.label}
                <DataSourceTooltip {...k.tip} />
              </div>
              <div className="font-mono font-bold text-lg" style={{ color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard strip */}
      <div className="card mb-5 p-4" style={{ borderRadius: '10px' }}>
        <div className="text-xs text-[#8896aa] mb-3 flex items-center gap-1">
          🏆 Revenue Leaderboard
          <DataSourceTooltip metric="Leaderboard" source="leads table + employees" method="SUM(expected_revenue WHERE status=won) per employee, ordered DESC" confidence="High" refreshRate="Real-time" />
        </div>
        <div className="flex items-end gap-3">
          {leaderboard.map((emp, rank) => {
            const maxRev = leaderboard[0]?.won_revenue || 1;
            const barH   = Math.max(24, Math.round((emp.won_revenue / maxRev) * 120));
            return (
              <div key={emp.id} className="flex flex-col items-center gap-1.5 cursor-pointer" onClick={() => setSelected(emp)}>
                <div className="font-mono text-[10px]" style={{ color: attainColor(emp.attainment_pct) }}>
                  {fmtRevenue(emp.won_revenue)}
                </div>
                <div
                  className="w-10 rounded-t-md transition-all"
                  style={{ height: barH, background: emp.avatar_color, opacity: selected?.id === emp.id ? 1 : 0.6 }}
                />
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-black"
                  style={{ background: emp.avatar_color }}
                >{initials(emp.name)}</div>
                <div className="text-[10px] text-[#8896aa] text-center w-16 truncate">{emp.name.split(' ')[0]}</div>
                {rank === 0 && <div className="text-[10px]">👑</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-column layout: cards + detail */}
      <div className="grid grid-cols-5 gap-4">
        {/* Left: employee cards (2 columns of 3) */}
        <div className="col-span-3 grid grid-cols-2 gap-3 content-start">
          {sorted.map(emp => (
            <EmployeeCard
              key={emp.id}
              emp={emp}
              isSelected={selected?.id === emp.id}
              onClick={() => setSelected(emp)}
            />
          ))}
        </div>

        {/* Right: detail panel */}
        <div className="col-span-2 sticky top-6 self-start">
          {selected ? (
            <EmployeeDetail emp={selected} />
          ) : (
            <div className="card flex items-center justify-center h-64 text-[#4a5568] text-sm">
              Select a rep to see details
            </div>
          )}
        </div>
      </div>

      {/* Bottom: comparison bar chart */}
      <div className="card mt-5">
        <div className="text-sm font-medium text-[#dde3ed] mb-4 flex items-center gap-1">
          Team Pipeline vs. Quota Comparison
          <DataSourceTooltip metric="Pipeline vs Quota" source="leads + employees" method="pipeline_value and target_revenue per employee" confidence="High" refreshRate="Real-time" />
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={teamData.map(e => ({ name: e.name.split(' ')[0], pipeline: Math.round(e.pipeline_value / 100000), target: Math.round(e.target_revenue / 100000), won: Math.round(e.won_revenue / 100000) }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8896aa' }} />
            <YAxis tick={{ fontSize: 9, fill: '#8896aa' }} tickFormatter={v => `₹${v}L`} />
            <Tooltip
              contentStyle={{ background: '#0f1318', border: '1px solid #2d3848', borderRadius: '8px' }}
              formatter={(v: number) => [`₹${v}L`, '']}
            />
            <Bar dataKey="target"   fill="#1e2530"  radius={[4,4,0,0]} name="Quota Target" />
            <Bar dataKey="pipeline" fill="#38bdf8"  radius={[4,4,0,0]} name="Active Pipeline" />
            <Bar dataKey="won"      fill="#34d399"  radius={[4,4,0,0]} name="Won Revenue" />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex items-center gap-4 mt-2 text-[10px] text-[#8896aa]">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{background:'#1e2530'}}/>Quota</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{background:'#38bdf8'}}/>Pipeline</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{background:'#34d399'}}/>Won</span>
        </div>
      </div>

      <LastUpdated />
    </div>
  );
}
