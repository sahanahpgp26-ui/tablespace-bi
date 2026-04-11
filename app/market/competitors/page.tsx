'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import KpiCard from '@/components/KpiCard';
import InsightCallout from '@/components/InsightCallout';
import ExportButton from '@/components/ExportButton';
import LastUpdated from '@/components/LastUpdated';
import DataSourceTooltip from '@/components/DataSourceTooltip';

interface Competitor {
  id: number;
  name: string;
  cities_count: number;
  total_sqft: number;
  price_per_seat: number;
  occupancy_est: number;
  review_score: number;
  trend: string;
  risk_level: string;
  notes: string;
  pricing_history: { city: string; price_per_seat: number; recorded_at: string }[];
  market_share_trend: { share_pct: number; quarter: number; year: number }[];
}

interface CompetitorData {
  competitors: Competitor[];
  tablespace_share: { share_pct: number; quarter: number; year: number }[];
  all_share: { company: string; quarter: number; year: number; share_pct: number }[];
}

const RISK_COLORS = { High: '#f87171', Medium: '#fbbf24', Low: '#34d399' };
const TREND_ICON = { growing: '↑', stable: '→', declining: '↓' };
const TREND_COLOR = { growing: '#34d399', stable: '#8896aa', declining: '#f87171' };

const LINE_COLORS = ['#f97316', '#38bdf8', '#34d399', '#a78bfa', '#fbbf24', '#f87171', '#c084fc'];

const METRIC_TOOLTIPS = {
  sqft: { metric: 'Total Sqft', source: 'MCA21 lease filings + JLL broker reports + Google Maps area proxy', method: 'Sum of active lease agreements filed + estimated from satellite/Maps', confidence: 'Medium' as const, refreshRate: 'Quarterly' },
  price: { metric: 'Price per Seat', source: 'Mystery shopping calls + published pricing + broker intel', method: 'Direct inquiry + online price pages + JLL/CBRE quarterly reports', confidence: 'Medium' as const, refreshRate: 'Quarterly' },
  occupancy: { metric: 'Occupancy Est.', source: 'LinkedIn headcount at location + Google Maps busy times + parking proxy', method: 'LinkedIn location filters + Maps peak hours + visual floor walk estimate', confidence: 'Estimated' as const, refreshRate: 'Monthly' },
  review: { metric: 'Review Score', source: 'Google Maps + JustDial + Glassdoor + community forums', method: 'Avg of verified review platforms, weighted by review count', confidence: 'High' as const, refreshRate: 'Monthly' },
  cities: { metric: 'Cities', source: 'Official website + MCA21 registered offices + broker directories', method: 'Cross-reference website city pages + RoC filings', confidence: 'High' as const, refreshRate: 'Quarterly' },
};

function fmtSqft(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M sqft`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K sqft`;
  return `${n} sqft`;
}

// Mini sparkline SVG
function Sparkline({ data, color = '#f97316' }: { data: number[]; color?: string }) {
  if (!data.length) return null;
  const w = 80, h = 24;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

// Full Profile Modal
function ProfileModal({ comp, onClose }: { comp: Competitor; onClose: () => void }) {
  const riskColor = RISK_COLORS[comp.risk_level as keyof typeof RISK_COLORS] || '#8896aa';

  // Pricing trend by city
  const cities = [...new Set(comp.pricing_history.map(p => p.city))];
  const quarters = [...new Set(comp.pricing_history.map(p => p.recorded_at))].sort();

  const priceChartData = quarters.map(q => {
    const row: Record<string, unknown> = { quarter: q.slice(0, 7) };
    cities.forEach(c => {
      const match = comp.pricing_history.find(p => p.recorded_at === q && p.city === c);
      if (match) row[c] = match.price_per_seat;
    });
    return row;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in" style={{ borderRadius: '12px' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-[#dde3ed]">{comp.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="badge text-xs" style={{ background: `${riskColor}20`, color: riskColor }}>
                {comp.risk_level} Risk
              </span>
              <span className="text-sm" style={{ color: TREND_COLOR[comp.trend as keyof typeof TREND_COLOR] }}>
                {TREND_ICON[comp.trend as keyof typeof TREND_ICON]} {comp.trend}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-[#8896aa] hover:text-[#dde3ed] text-xl">×</button>
        </div>

        <div className="text-xs text-[#8896aa] mb-4 p-3 rounded-lg" style={{ background: '#161b23' }}>{comp.notes}</div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Cities', value: comp.cities_count, tt: METRIC_TOOLTIPS.cities },
            { label: 'Total Sqft', value: fmtSqft(comp.total_sqft), tt: METRIC_TOOLTIPS.sqft },
            { label: 'Price/Seat', value: `₹${comp.price_per_seat.toLocaleString()}`, tt: METRIC_TOOLTIPS.price },
            { label: 'Occupancy Est.', value: `${comp.occupancy_est}%`, tt: METRIC_TOOLTIPS.occupancy },
            { label: 'Review Score', value: `${comp.review_score} ★`, tt: METRIC_TOOLTIPS.review },
          ].map(m => (
            <div key={m.label} className="p-3 rounded-lg" style={{ background: '#161b23' }}>
              <div className="text-[10px] text-[#8896aa] flex items-center gap-0.5 mb-1">
                {m.label}
                <DataSourceTooltip {...m.tt} />
              </div>
              <div className="font-mono font-semibold text-[#dde3ed]">{String(m.value)}</div>
            </div>
          ))}
        </div>

        {/* Pricing by city */}
        <div className="mb-5">
          <div className="text-sm font-medium text-[#dde3ed] mb-3">Pricing History by City</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={priceChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="quarter" />
              <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
              <Legend />
              {cities.map((c, i) => (
                <Line key={c} type="monotone" dataKey={c} stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={1.5} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Threat analysis */}
        <div className="p-3 rounded-lg mb-4" style={{ background: '#161b23', border: '1px solid rgba(248,113,113,0.2)' }}>
          <div className="text-xs font-semibold text-[#f87171] mb-2">Threat Analysis</div>
          <div className="text-xs text-[#8896aa] space-y-1">
            <div>• Price gap vs TableSpace: {comp.price_per_seat < 9200 ? `₹${(9200 - comp.price_per_seat).toLocaleString()} cheaper` : `₹${(comp.price_per_seat - 9200).toLocaleString()} more expensive`}</div>
            <div>• Occupancy comparison: {comp.occupancy_est > 80 ? 'High occupancy — strong market position' : 'Below 80% — possible pricing or product issue'}</div>
            <div>• Trend: {comp.trend === 'growing' ? 'Expanding — monitor closely' : comp.trend === 'declining' ? 'Contracting — opportunity to capture share' : 'Stable — defend current accounts'}</div>
          </div>
        </div>

        {/* Recommended response */}
        <div className="p-3 rounded-lg" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
          <div className="text-xs font-semibold text-[#f97316] mb-1">Recommended Response</div>
          <div className="text-xs text-[#dde3ed]">
            {comp.risk_level === 'High'
              ? 'Prioritize enterprise retention in overlap cities. Counter with product differentiation + SLA guarantees.'
              : comp.risk_level === 'Medium'
              ? 'Monitor quarterly. Respond to pricing pressure with value-adds before reducing price.'
              : 'Low immediate threat. Focus energy on higher-risk competitors.'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CompetitorsPage() {
  const [data, setData] = useState<CompetitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Competitor | null>(null);

  useEffect(() => {
    fetch('/api/competitors').then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading || !data) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">{[...Array(4)].map((_, i) => <div key={i} className="card h-24 animate-pulse" style={{ background: '#161b23' }} />)}</div>
      </div>
    );
  }

  const { competitors, all_share } = data;

  // KPI calcs
  const trackedCount = competitors.length;
  const ourAvgPrice = 9200;
  const marketAvgPrice = Math.round(competitors.reduce((s, c) => s + c.price_per_seat, 0) / competitors.length);
  const priceDiff = ourAvgPrice - marketAvgPrice;

  // Our share latest
  const tsLatest = data.tablespace_share.slice(-1)[0];
  const tsFirst = data.tablespace_share[0];
  const shareTrend = tsLatest && tsFirst ? tsLatest.share_pct - tsFirst.share_pct : 0;

  // NPS gap (our review score 4.5 vs nearest competitor)
  const nearestByPrice = competitors.slice().sort((a, b) => Math.abs(a.price_per_seat - ourAvgPrice) - Math.abs(b.price_per_seat - ourAvgPrice))[0];
  const npsGap = 4.5 - (nearestByPrice?.review_score || 0);

  // Market share chart data
  const quarterLabels = [...new Set(all_share.map(r => `Q${r.quarter}-${r.year}`))].sort();
  const allCompanies = [...new Set(all_share.map(r => r.company))];
  const shareChartData = quarterLabels.map(q => {
    const [qt, yr] = q.split('-');
    const row: Record<string, unknown> = { quarter: q };
    allCompanies.forEach(comp => {
      const match = all_share.find(r => r.company === comp && `Q${r.quarter}` === qt && String(r.year) === yr);
      if (match) row[comp] = +match.share_pct.toFixed(1);
    });
    return row;
  });

  const insight = `WeWork India holds ${data.tablespace_share[0] ? (competitors.find(c => c.name === 'WeWork India')?.market_share_trend[0] as { share_pct?: number })?.share_pct?.toFixed(1) : '?'}% market share but is on a declining trend. TableSpace has grown ${shareTrend.toFixed(1)} percentage points over 8 quarters. Awfis is the fastest-growing domestic competitor — price gap of ₹${Math.abs(ourAvgPrice - (competitors.find(c => c.name === 'Awfis')?.price_per_seat || 0)).toLocaleString()}/seat vs TableSpace.`;

  return (
    <div className="p-6 page-enter">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-[#dde3ed]">Competitor Intelligence</h1>
          <div className="text-xs text-[#8896aa] mt-0.5">Track competitor positioning, pricing, and market share dynamics</div>
        </div>
        <ExportButton data={competitors.map(c => ({ name: c.name, cities: c.cities_count, sqft: c.total_sqft, price: c.price_per_seat, occupancy: c.occupancy_est, risk: c.risk_level }))} filename="competitors" />
      </div>

      <InsightCallout insight={insight} />

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Competitors Tracked"
          value={trackedCount.toString()}
          sub="Active in flex market"
          tooltip={{ metric: 'Competitors Tracked', source: 'competitors table', method: 'COUNT(*) from competitors DB', confidence: 'High', refreshRate: 'Monthly' }}
        />
        <KpiCard
          label="Our Price vs Market Avg"
          value={priceDiff >= 0 ? `+₹${priceDiff.toLocaleString()}` : `-₹${Math.abs(priceDiff).toLocaleString()}`}
          sub={`Our: ₹${ourAvgPrice.toLocaleString()} · Market: ₹${marketAvgPrice.toLocaleString()}`}
          color={priceDiff > 0 ? '#fbbf24' : '#34d399'}
          tooltip={{ metric: 'Price vs Market', source: 'pricing_history table — latest per city', method: 'AVG(price_per_seat) WHERE recorded_at = MAX(recorded_at)', confidence: 'Medium', refreshRate: 'Quarterly' }}
        />
        <KpiCard
          label="Our Market Share Trend"
          value={`${tsLatest?.share_pct?.toFixed(1) || '—'}%`}
          trend={`${shareTrend >= 0 ? '+' : ''}${shareTrend.toFixed(1)}pp over 8Q`}
          trendUp={shareTrend >= 0}
          tooltip={{ metric: 'Market Share', source: 'market_share_history table', method: 'AVG(share_pct) WHERE company=TableSpace, latest quarter', confidence: 'Estimated', refreshRate: 'Quarterly' }}
        />
        <KpiCard
          label="NPS Gap vs Nearest"
          value={`${npsGap >= 0 ? '+' : ''}${npsGap.toFixed(1)}`}
          sub={`vs ${nearestByPrice?.name || '—'}`}
          color={npsGap >= 0 ? '#34d399' : '#f87171'}
          tooltip={{ metric: 'NPS Gap', source: 'Google Maps + JustDial + Glassdoor', method: 'Our internal NPS 4.5 vs competitor review score avg', confidence: 'Estimated', refreshRate: 'Monthly' }}
        />
      </div>

      {/* Main 2-col layout */}
      <div className="grid grid-cols-2 gap-5">
        {/* Left: Competitor cards */}
        <div className="space-y-3">
          <div className="text-sm font-medium text-[#dde3ed] mb-2">Competitor Profiles</div>
          {competitors.map(comp => {
            const riskColor = RISK_COLORS[comp.risk_level as keyof typeof RISK_COLORS] || '#8896aa';
            const trendColor = TREND_COLOR[comp.trend as keyof typeof TREND_COLOR] || '#8896aa';
            const sparkData = comp.market_share_trend.slice(0, 4).map(t => t.share_pct);

            return (
              <div key={comp.id} className="card hover:border-[#2d3848] transition-all" style={{ padding: '14px' }}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-[#dde3ed] text-sm">{comp.name}</div>
                    <div className="text-[11px] mt-0.5" style={{ color: trendColor }}>
                      {TREND_ICON[comp.trend as keyof typeof TREND_ICON]} {comp.trend}
                    </div>
                  </div>
                  <span className="badge text-[10px]" style={{ background: `${riskColor}20`, color: riskColor }}>
                    {comp.risk_level} Risk
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-x-4 gap-y-2 mb-3 text-[11px]">
                  {[
                    { label: 'Cities', value: comp.cities_count, tt: METRIC_TOOLTIPS.cities },
                    { label: 'Sqft', value: fmtSqft(comp.total_sqft), tt: METRIC_TOOLTIPS.sqft },
                    { label: 'Price/seat', value: `₹${comp.price_per_seat.toLocaleString()}`, tt: METRIC_TOOLTIPS.price },
                    { label: 'Occupancy', value: `${comp.occupancy_est}%`, tt: METRIC_TOOLTIPS.occupancy },
                    { label: 'Review', value: `${comp.review_score} ★`, tt: METRIC_TOOLTIPS.review },
                  ].map(m => (
                    <div key={m.label}>
                      <div className="text-[10px] text-[#4a5568] flex items-center gap-0.5">
                        {m.label}
                        <DataSourceTooltip {...m.tt} />
                      </div>
                      <div className="font-mono text-[#dde3ed]">{m.value}</div>
                    </div>
                  ))}
                  <div>
                    <div className="text-[10px] text-[#4a5568] mb-0.5">Mkt share trend</div>
                    <Sparkline data={sparkData} color={riskColor} />
                  </div>
                </div>

                <button
                  onClick={() => setSelected(comp)}
                  className="w-full py-1.5 rounded text-xs border border-[#1e2530] text-[#8896aa] hover:text-[#f97316] hover:border-[#f97316] transition-all"
                >
                  View full profile →
                </button>
              </div>
            );
          })}
        </div>

        {/* Right: Market share chart */}
        <div className="card">
          <div className="text-sm font-medium text-[#dde3ed] mb-1 flex items-center gap-1">
            Market Share Trend — All Players
            <DataSourceTooltip
              metric="Market Share Trend"
              source="market_share_history table"
              method="AVG(share_pct) grouped by company + quarter, averaged across 6 cities"
              confidence="Estimated"
              refreshRate="Quarterly"
            />
          </div>
          <div className="text-[10px] text-[#4a5568] mb-4">
            Source: JLL India Flex Space Report + Colliers India + internal proxy
          </div>
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={shareChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="quarter" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={v => `${v}%`} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Legend />
              {allCompanies.map((comp, i) => (
                <Line
                  key={comp}
                  type="monotone"
                  dataKey={comp}
                  stroke={comp === 'TableSpace' ? '#f97316' : LINE_COLORS[(i + 1) % LINE_COLORS.length]}
                  strokeWidth={comp === 'TableSpace' ? 3 : 1.5}
                  dot={false}
                  opacity={comp === 'TableSpace' ? 1 : 0.7}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>

          {/* Source annotation */}
          <div className="mt-3 flex items-center gap-1 text-[10px] text-[#4a5568]">
            <span>Source</span>
            <DataSourceTooltip
              metric="Market Share Chart"
              source="JLL India Flex Space Report + Colliers India + CBRE India"
              method="Quarterly published flex space market share reports + internal deal flow proxy"
              confidence="Estimated"
              refreshRate="Quarterly"
            />
          </div>
        </div>
      </div>

      <LastUpdated />

      {selected && <ProfileModal comp={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
