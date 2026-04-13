'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import KpiCard from '@/components/KpiCard';
import InsightCallout from '@/components/InsightCallout';
import ExportButton from '@/components/ExportButton';
import LastUpdated from '@/components/LastUpdated';
import DataSourceTooltip from '@/components/DataSourceTooltip';

// ── Subscribe Modal ───────────────────────────────────────────
function SubscribeModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [freq, setFreq]   = useState('daily');
  const [saved, setSaved] = useState(false);
  function handleSave() {
    if (!email.includes('@')) return;
    setSaved(true);
    setTimeout(onClose, 1500);
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="card w-full max-w-sm animate-fade-in"
        style={{ borderRadius: '12px' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-[#dde3ed]">Subscribe to Dashboard</h2>
            <div className="text-xs text-[#8896aa] mt-0.5">Get scheduled reports delivered to your inbox</div>
          </div>
          <button onClick={onClose} className="text-[#8896aa] hover:text-[#dde3ed] text-xl leading-none">×</button>
        </div>
        {saved ? (
          <div className="text-center py-4">
            <div className="text-[#34d399] text-2xl mb-2">✓</div>
            <div className="text-sm text-[#dde3ed]">Subscribed!</div>
          </div>
        ) : (
          <>
            <div className="mb-3">
              <label className="text-xs text-[#8896aa] block mb-1.5">Email address</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@tablespace.in"
                className="w-full text-sm rounded-md px-3 py-2 bg-[#161b23] border border-[#1e2530] text-[#dde3ed] outline-none focus:border-[#f97316]"
              />
            </div>
            <div className="mb-4">
              <label className="text-xs text-[#8896aa] block mb-1.5">Report frequency</label>
              <div className="flex gap-2">
                {['daily', 'weekly', 'monthly'].map(f => (
                  <button key={f} onClick={() => setFreq(f)}
                    className="flex-1 py-1.5 rounded text-xs capitalize"
                    style={{
                      background: freq === f ? 'rgba(249,115,22,0.15)' : '#161b23',
                      color:      freq === f ? '#f97316' : '#8896aa',
                      border:     `1px solid ${freq === f ? 'rgba(249,115,22,0.4)' : '#1e2530'}`,
                    }}
                  >{f}</button>
                ))}
              </div>
            </div>
            <button
              onClick={handleSave}
              className="w-full py-2 rounded-md text-sm font-medium text-white"
              style={{ background: '#f97316' }}
            >Subscribe</button>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
interface DashboardData {
  stage_stats:      { stage: string; count: number; total_revenue: number; avg_score: number }[];
  won_stats:        { count: number; revenue: number };
  total_pipeline:   number;
  weighted_pipeline?: number;
  by_source:        { source: string; count: number; revenue: number }[];
  by_city:          { city: string; count: number; revenue: number; avg_score: number }[];
  quarterly:        { quarter: string; revenue: number; deals: number }[];
  funnel:           { stage: string; count: number; revenue: number }[];
  by_account_type:  { account_type: string; count: number; revenue: number }[];
  recent_leads:     { id: number; company: string; contact_name: string; city: string; stage: string; score: number; source: string; expected_revenue: number; created_at: string }[];
  win_rate?: number;
  closing_this_month?: { count: number; revenue: number };
}

function fmtRevenue(n: number) {
  if (!n) return '₹0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function scoreColor(score: number) {
  if (score >= 70) return '#34d399';
  if (score >= 45) return '#fbbf24';
  return '#f87171';
}

const STAGE_COLORS: Record<string, string> = {
  'Prospecting':       '#8896aa',
  'Qualification':     '#38bdf8',
  'Needs Analysis':    '#a78bfa',
  'Value Proposition': '#fbbf24',
  'Id. Decision Makers':'#f97316',
  'Perception Analysis':'#f43f5e',
  'Proposal/Price Quote':'#fbbf24',
  'Negotiation/Review':'#f97316',
  'Closed Won':        '#34d399',
};

const PIE_COLORS = ['#f97316', '#38bdf8', '#34d399', '#a78bfa', '#fbbf24', '#f87171'];

// ── Data Sources Panel ────────────────────────────────────────
const DATA_SOURCES = [
  {
    category: 'Sales & Pipeline',
    color: '#f97316',
    icon: '📊',
    sources: [
      { name: 'Internal CRM DB', desc: 'All leads, stages, revenue, scores', status: 'live', field: 'leads table' },
      { name: 'Activities Log',  desc: 'Calls, meetings, demos per rep',      status: 'live', field: 'activities table' },
      { name: 'Employee Targets',desc: 'Quota targets per sales rep',          status: 'live', field: 'employees table' },
    ],
  },
  {
    category: 'Market Intelligence',
    color: '#38bdf8',
    icon: '🏢',
    sources: [
      { name: 'Competitor Profiles',  desc: 'Operator positioning, pricing, occupancy estimates — manually curated', status: 'dummy', field: 'competitors table' },
      { name: 'Pricing History',      desc: 'Price per seat per city per competitor — mystery shopping + broker intel', status: 'dummy', field: 'pricing_history' },
      { name: 'Market Share Trends',  desc: 'Quarterly market share across 8 quarters — can wire to broker data feeds', status: 'dummy', field: 'market_share_history' },
    ],
  },
  {
    category: 'Geo Expansion Signals',
    color: '#34d399',
    icon: '🌍',
    sources: [
      { name: 'Luminocity3d / NASA VIIRS DNB', desc: 'Nighttime light intensity per zone (nW/cm²/sr)', status: 'calibrated', field: 'geo_zones.nightlight_index', link: 'https://luminocity3d.org/UrbanLights' },
      { name: 'Google Ads Keyword Planner',    desc: 'Search volume growth "coworking [city]" YoY', status: 'dummy', field: 'geo_zones.search_growth', link: 'https://ads.google.com/home/tools/keyword-planner/' },
      { name: 'MCA21 Company Filings',         desc: 'Enterprise density — companies >50 emp within 5km', status: 'dummy', field: 'geo_zones.enterprise_density', link: 'https://www.mca.gov.in/content/mca/global/en/mca/master-data.html' },
      { name: 'Google Maps Places API',        desc: 'Competitor count within 3km radius, quarterly audit', status: 'dummy', field: 'geo_zones.competitor_count', link: 'https://developers.google.com/maps/documentation/places/web-service' },
    ],
  },
  {
    category: 'Space Portfolio',
    color: '#a78bfa',
    icon: '🏗️',
    sources: [
      { name: 'Internal Ops DB',   desc: '25 centres — sqft, seats, occupancy, revenue/seat', status: 'live', field: 'centres table' },
      { name: 'Daily Snapshots',   desc: '90-day occupancy & revenue per centre',              status: 'live', field: 'centre_snapshots table' },
    ],
  },
];

const STATUS_CONFIG = {
  live:        { label: 'Live',        color: '#34d399', bg: 'rgba(52,211,153,0.1)',  desc: 'Powered by internal DB — real queries' },
  calibrated:  { label: 'Calibrated', color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',  desc: 'Real public data manually ingested & normalised' },
  dummy:       { label: 'Dummy',      color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   desc: 'Simulated data — can be wired to real API' },
};

function DataSourcesPanel() {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="page-enter">
      {/* Explainer */}
      <div className="card mb-5 p-4 border-l-2" style={{ borderLeftColor: '#f97316' }}>
        <div className="text-sm font-semibold text-[#dde3ed] mb-1">🔌 Data Sourcing Philosophy</div>
        <div className="text-xs text-[#8896aa] leading-relaxed">
          Every metric in this suite shows where its number comes from. Live metrics query the internal SQLite DB directly.
          Calibrated metrics use real public data (e.g. VIIRS satellite) ingested and normalised offline.
          Dummy metrics show realistic simulated values — each one has a direct API equivalent that can be wired with a single env variable.
        </div>
        <div className="flex gap-3 mt-3 flex-wrap">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5 text-[11px]">
              <span className="px-2 py-0.5 rounded-full font-medium" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
              <span className="text-[#4a5568]">{cfg.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {DATA_SOURCES.map(cat => (
          <div key={cat.category} className="card" style={{ borderRadius: '10px' }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">{cat.icon}</span>
              <div className="text-sm font-semibold" style={{ color: cat.color }}>{cat.category}</div>
            </div>
            <div className="space-y-3">
              {cat.sources.map(src => {
                const cfg = STATUS_CONFIG[src.status as keyof typeof STATUS_CONFIG];
                const isOpen = expanded === `${cat.category}-${src.name}`;
                return (
                  <div key={src.name}>
                    <div
                      className="flex items-start justify-between gap-2 cursor-pointer group"
                      onClick={() => setExpanded(isOpen ? null : `${cat.category}-${src.name}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[13px] font-medium text-[#dde3ed] group-hover:text-white transition-colors">{src.name}</span>
                          {(src as {link?: string}).link && (
                            <a
                              href={(src as {link?: string}).link} target="_blank" rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="text-[10px] text-[#38bdf8] hover:underline shrink-0"
                            >↗</a>
                          )}
                        </div>
                        <div className="text-[11px] text-[#8896aa]">{src.desc}</div>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </div>
                    {isOpen && (
                      <div className="mt-2 ml-0 p-2.5 rounded-lg text-[11px]" style={{ background: '#161b23' }}>
                        <div className="flex items-center gap-1 text-[#4a5568] mb-1">
                          <span>DB field:</span>
                          <span className="font-mono text-[#a78bfa]">{src.field}</span>
                        </div>
                        {src.status === 'dummy' && (
                          <div className="text-[#fbbf24] mt-1">
                            ⚡ Can be wired — add the API key as an env variable and swap the seed function for a live fetch.
                          </div>
                        )}
                        {src.status === 'calibrated' && (
                          <div className="text-[#38bdf8] mt-1">
                            📡 Real public data source. Values ingested quarterly and normalised to 0–100 scale.
                          </div>
                        )}
                        {src.status === 'live' && (
                          <div className="text-[#34d399] mt-1">
                            ✅ Direct SQL query — always reflects latest state of the DB.
                          </div>
                        )}
                      </div>
                    )}
                    <div className="border-b border-[#1e2530] mt-3" />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData]               = useState<DashboardData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [activeTab, setActiveTab]     = useState<'overview' | 'data-sources'>('overview');

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(d => {
      setData(d);
      setLoading(false);
    });
  }, []);

  if (loading || !data) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-28 animate-pulse" style={{ background: '#161b23' }} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card h-64 animate-pulse" style={{ background: '#161b23' }} />
          ))}
        </div>
      </div>
    );
  }

  const wonRevenue          = data.won_stats?.revenue || 0;
  const wonCount            = data.won_stats?.count || 0;
  const totalPotential      = data.total_pipeline || 0;
  const weightedPipeline    = data.weighted_pipeline || 0;
  const winRate = data.win_rate || 0;
  const closingThisMonth = data.closing_this_month || { count: 0, revenue: 0 };
  const avgDealSize = wonCount > 0 ? Math.round(wonRevenue / wonCount) : 0;
  const activePipelineCount = data.stage_stats.reduce((s, r) => s + r.count, 0);
  const avgScore = data.stage_stats.reduce((s, r) => s + r.avg_score * r.count, 0) /
    Math.max(1, activePipelineCount);

  const insight = `Total Sales closed: ${fmtRevenue(wonRevenue)} across ${wonCount} deals. Active pipeline holds ${fmtRevenue(totalPotential)} across ${activePipelineCount} opportunities. Avg lead score: ${avgScore.toFixed(0)}.`;

  return (
    <div className="p-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs text-[#8896aa] mb-1">Dashboard</div>
          <h1 className="text-xl font-semibold text-[#dde3ed]">Sales Team Dream Dashboard</h1>
          <div className="text-xs text-[#8896aa] mt-0.5">
            Track past sales and future pipeline by amount, close date, status, region, and lead source.
          </div>
          <div className="text-[10px] text-[#4a5568] mt-1">
            As of {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · Viewing as Sales Manager
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton data={data.recent_leads} filename="sales-dashboard" />
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1.5 rounded text-xs border border-[#1e2530] text-[#8896aa] hover:text-[#dde3ed] transition-colors"
          >Refresh</button>
          <button
            onClick={() => setShowSubscribe(true)}
            className="px-3 py-1.5 rounded text-xs border border-[#f97316] text-[#f97316] hover:bg-[rgba(249,115,22,0.1)] transition-colors"
          >Subscribe</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-5 border-b border-[#1e2530]">
        {([['overview', '📈 Overview'], ['data-sources', '🔌 Data Sources']] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-2 text-sm font-medium transition-colors"
            style={{
              color: activeTab === tab ? '#f97316' : '#8896aa',
              borderBottom: activeTab === tab ? '2px solid #f97316' : '2px solid transparent',
            }}
          >{label}</button>
        ))}
      </div>

      {activeTab === 'data-sources' && <DataSourcesPanel />}
      {activeTab === 'overview' && <>

      <InsightCallout insight={insight} />

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <KpiCard label="Total Sales" value={fmtRevenue(wonRevenue)} sub={`${wonCount} deals closed`} color="#34d399"
          tooltip={{ metric: 'Total Sales', source: 'leads table (status=won)', method: 'SUM(expected_revenue) WHERE status=won', confidence: 'High', refreshRate: 'Real-time' }}
          link={{ href: '/pipeline', label: 'View Pipeline →' }} />
        <KpiCard label="Total Potential Sales" value={fmtRevenue(totalPotential)} sub={`${activePipelineCount} active opportunities`} color="#38bdf8"
          tooltip={{ metric: 'Total Potential Sales', source: 'leads table (status=active)', method: 'SUM(expected_revenue) WHERE status=active', confidence: 'Estimated', refreshRate: 'Real-time' }}
          link={{ href: '/pipeline', label: 'View Pipeline →' }} />
        <KpiCard label="Weighted Pipeline" value={fmtRevenue(weightedPipeline)} sub="Probability-adjusted" color="#f97316"
          tooltip={{ metric: 'Weighted Pipeline', source: 'leads table (status=active)', method: 'SUM(expected_revenue × stage_probability) — e.g. Negotiation × 80%, Proposal × 65%', confidence: 'Estimated', refreshRate: 'Real-time' }}
          link={{ href: '/pipeline', label: 'View Pipeline →' }} />
        <KpiCard label="Active Opportunities" value={activePipelineCount.toString()} sub="Across all stages"
          tooltip={{ metric: 'Active Opportunities', source: 'leads table', method: 'COUNT(*) WHERE status=active', confidence: 'High', refreshRate: 'Real-time' }} />
        <KpiCard label="Avg Lead Score" value={avgScore.toFixed(0)} sub="Weighted by count" color={scoreColor(avgScore)}
          tooltip={{ metric: 'Avg Lead Score', source: 'leads table', method: 'AVG(score) weighted by stage count', confidence: 'High', refreshRate: 'Real-time' }} />
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Past Closed Deals */}
        <div className="card col-span-1">
          <div className="text-sm font-medium text-[#dde3ed] mb-4 flex items-center gap-1">
            Past Closed Deals
            <DataSourceTooltip metric="Past Closed Deals" source="leads table" method="SUM(expected_revenue) grouped by close_date quarter, status=won" confidence="High" refreshRate="Real-time" />
          </div>
          {data.quarterly.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.quarterly} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis type="number" tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} tick={{ fontSize: 9, fill: '#8896aa' }} />
                <YAxis type="category" dataKey="quarter" width={55} tick={{ fontSize: 9, fill: '#8896aa' }} />
                <Tooltip
                  contentStyle={{ background: '#0f1318', border: '1px solid #2d3848', borderRadius: '8px' }}
                  labelStyle={{ color: '#dde3ed' }}
                  formatter={(v: number) => [fmtRevenue(v), 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#f97316" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-[#4a5568] text-sm">No closed deals yet</div>
          )}
          <div className="text-[10px] text-[#4a5568] mt-2">Closed Won deals grouped by quarter · status = won</div>
        </div>

        {/* Potential Sales by Stage */}
        <div className="card col-span-1">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-[#dde3ed] flex items-center gap-1">
              Potential Sales by Stage
              <DataSourceTooltip metric="Potential Sales by Stage" source="leads table" method="SUM(expected_revenue) grouped by stage, status=active" confidence="High" refreshRate="Real-time" />
            </div>
            <div className="text-xs text-[#8896aa] font-mono">{fmtRevenue(totalPotential)}</div>
          </div>
          <div className="space-y-1.5">
            {data.funnel.filter(f => f.count > 0).map((f, i) => {
              const pct = totalPotential > 0 ? (f.revenue / totalPotential) * 100 : 0;
              const stageName = f.stage.replace('/Price Quote', '').replace('/Review', '').replace('Id. ', '');
              return (
                <div key={f.stage} className="flex items-center gap-2">
                  <div
                    className="h-5 rounded text-[10px] text-white flex items-center px-2 font-mono shrink-0"
                    style={{ width: `${Math.max(pct * 1.5, 20)}%`, background: Object.values(STAGE_COLORS)[i] || '#8896aa', minWidth: '60px' }}
                  >
                    {fmtRevenue(f.revenue)}
                  </div>
                  <span className="text-[10px] text-[#8896aa] truncate">{stageName}</span>
                </div>
              );
            })}
          </div>
          <a href="/pipeline" className="text-xs text-[#38bdf8] mt-3 block">View Report (Opportunities by Stage)</a>
        </div>

        {/* Deal velocity */}
        <div className="card flex flex-col justify-between">
          <div className="text-sm font-medium text-[#dde3ed] mb-3 flex items-center gap-1">
            Deal Velocity
            <DataSourceTooltip metric="Deal Velocity" source="leads table" method="win_rate = won/(won+lost); avg deal = won_revenue/won_count; closing = active leads with close_date this month" confidence="High" refreshRate="Real-time" />
          </div>
          <div className="space-y-4 flex-1">
            <div>
              <div className="text-[10px] text-[#4a5568] mb-0.5">Win Rate</div>
              <div className="font-mono text-2xl font-bold" style={{ color: winRate >= 50 ? '#34d399' : '#fbbf24' }}>{winRate}%</div>
              <div className="text-[10px] text-[#4a5568] mt-0.5">of closed deals</div>
            </div>
            <div className="border-t border-[#1e2530] pt-3">
              <div className="text-[10px] text-[#4a5568] mb-0.5">Avg Deal Size</div>
              <div className="font-mono text-xl font-bold text-[#f97316]">{fmtRevenue(avgDealSize)}</div>
            </div>
            <div className="border-t border-[#1e2530] pt-3">
              <div className="text-[10px] text-[#4a5568] mb-0.5">Closing This Month</div>
              <div className="font-mono text-xl font-bold text-[#38bdf8]">{fmtRevenue(closingThisMonth.revenue)}</div>
              <div className="text-[10px] text-[#4a5568] mt-0.5">{closingThisMonth.count} active deals</div>
            </div>
          </div>
          <a href="/pipeline" className="text-xs text-[#38bdf8] mt-4 block">View Pipeline →</a>
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* By Region */}
        <div className="card">
          <div className="text-sm font-medium text-[#dde3ed] mb-3 flex items-center gap-1">
            Sales &amp; Potential by Region
            <DataSourceTooltip metric="By Region" source="leads table" method="SUM(expected_revenue) grouped by city" confidence="High" refreshRate="Real-time" />
          </div>
          <div className="flex items-center gap-2">
            <ResponsiveContainer width="55%" height={160}>
              <PieChart>
                <Pie data={data.by_city} dataKey="revenue" nameKey="city" cx="50%" cy="50%" innerRadius={38} outerRadius={68}>
                  {data.by_city.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0f1318', border: '1px solid #2d3848', borderRadius: '8px' }}
                  formatter={(v: number) => [fmtRevenue(v), 'Revenue']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1">
              {data.by_city.map((c, i) => (
                <div key={c.city} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-[#8896aa]">{c.city}</span>
                  </div>
                  <span className="font-mono text-[#dde3ed]">{fmtRevenue(c.revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* By Lead Source */}
        <div className="card">
          <div className="text-sm font-medium text-[#dde3ed] mb-3 flex items-center gap-1">
            Sales &amp; Potential by Lead Source
            <DataSourceTooltip metric="By Lead Source" source="leads table" method="SUM(expected_revenue) grouped by source" confidence="High" refreshRate="Real-time" />
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.by_source.slice(0, 6)} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="source" tick={{ fontSize: 9, fill: '#8896aa' }} angle={-30} textAnchor="end" height={45} />
              <YAxis tick={{ fontSize: 9, fill: '#8896aa' }} tickFormatter={(v: number) => `${(v / 100000).toFixed(0)}L`} />
              <Tooltip
                contentStyle={{ background: '#0f1318', border: '1px solid #2d3848', borderRadius: '8px' }}
                formatter={(v: number) => [fmtRevenue(v), 'Revenue']}
              />
              <Bar dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* By Account Type */}
        <div className="card">
          <div className="text-sm font-medium text-[#dde3ed] mb-3 flex items-center gap-1">
            Expected Revenue by Account
            <DataSourceTooltip metric="Expected Revenue by Account" source="leads table" method="SUM(expected_revenue) grouped by account_type" confidence="Estimated" refreshRate="Real-time" />
          </div>
          <div className="flex items-center gap-3">
            <ResponsiveContainer width="55%" height={160}>
              <PieChart>
                <Pie data={data.by_account_type} dataKey="revenue" nameKey="account_type" cx="50%" cy="50%" innerRadius={38} outerRadius={68}>
                  {data.by_account_type.map((_, i) => <Cell key={i} fill={['#f97316', '#a78bfa', '#38bdf8', '#34d399'][i % 4]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#0f1318', border: '1px solid #2d3848', borderRadius: '8px' }}
                  formatter={(v: number) => [fmtRevenue(v), 'Revenue']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {data.by_account_type.map((a, i) => (
                <div key={a.account_type} className="text-[11px]">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: ['#f97316', '#a78bfa', '#38bdf8', '#34d399'][i % 4] }} />
                    <span className="text-[#8896aa]">{a.account_type}</span>
                  </div>
                  <div className="font-mono text-[#dde3ed]">{fmtRevenue(a.revenue)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Leads Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-medium text-[#dde3ed]">Recent Opportunities</div>
          <a href="/pipeline" className="text-xs text-[#38bdf8]">View all in Pipeline →</a>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#1e2530]">
              {['Company', 'Contact', 'City', 'Stage', 'Score', 'Revenue', 'Source', 'Created'].map(h => (
                <th key={h} className="pb-2 text-left text-[#4a5568] font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.recent_leads.map(lead => (
              <tr key={lead.id} className="border-b border-[#1e2530] hover:bg-[#161b23] transition-colors">
                <td className="py-2 text-[#dde3ed] font-medium">{lead.company}</td>
                <td className="py-2 text-[#8896aa]">{lead.contact_name}</td>
                <td className="py-2 text-[#8896aa]">{lead.city}</td>
                <td className="py-2">
                  <span className="badge text-[10px]" style={{ background: `${STAGE_COLORS[lead.stage] || '#8896aa'}20`, color: STAGE_COLORS[lead.stage] || '#8896aa' }}>
                    {lead.stage.replace('/Price Quote', '').replace('/Review', '')}
                  </span>
                </td>
                <td className="py-2">
                  <span className="font-mono" style={{ color: scoreColor(lead.score) }}>{lead.score}</span>
                </td>
                <td className="py-2 font-mono" style={{ color: '#34d399' }}>{fmtRevenue(lead.expected_revenue)}</td>
                <td className="py-2 text-[#8896aa]">{lead.source}</td>
                <td className="py-2 text-[#8896aa]">{new Date(lead.created_at).toLocaleDateString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <LastUpdated />
      </> }

      {showSubscribe && <SubscribeModal onClose={() => setShowSubscribe(false)} />}
    </div>
  );
}
