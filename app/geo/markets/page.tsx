'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ZAxis, ReferenceLine, ReferenceArea, Label,
} from 'recharts';
import ExportButton from '@/components/ExportButton';
import InsightCallout from '@/components/InsightCallout';
import LastUpdated from '@/components/LastUpdated';
import DataSourceTooltip from '@/components/DataSourceTooltip';

interface GeoZone {
  id: number;
  city: string;
  zone_name: string;
  expansion_score: number;
  nightlight_index: number;
  search_growth: number;
  enterprise_density: number;
  competitor_count: number;
  avg_price_per_seat: number;
  infra_notes: string;
  recommendation: string;
}

const REC_COLORS: Record<string, string> = { Expand: '#34d399', Watch: '#fbbf24', Monitor: '#38bdf8', Skip: '#f87171' };
const CITIES = ['Bangalore', 'Mumbai', 'Gurugram', 'Hyderabad', 'Pune', 'Chennai'];

function AnalysisModal({ zone, onClose, inline = false }: { zone: GeoZone; onClose: () => void; inline?: boolean }) {
  const recColor = REC_COLORS[zone.recommendation] || '#8896aa';
  const dims = [
    { label: 'Nightlight Index', value: zone.nightlight_index, weight: 25, source: 'NASA VIIRS GEE', method: 'Google Earth Engine VIIRS composite, 500m res', confidence: 'High' as const },
    { label: 'Search Growth', value: zone.search_growth, weight: 25, source: 'Google Trends + Keyword Planner', method: 'YoY change in "coworking [city]" volume index', confidence: 'Medium' as const },
    { label: 'Enterprise Density', value: zone.enterprise_density, weight: 25, source: 'Census + MCA21 filings', method: 'Companies >50 employees within 5km', confidence: 'Medium' as const },
    { label: 'Competitor Gap', value: Math.max(0, 100 - zone.competitor_count * 10), weight: 15, source: 'Google Maps audit', method: 'Active flex spaces within 3km, inverted score', confidence: 'High' as const },
    { label: 'Price Viability', value: Math.min(100, zone.avg_price_per_seat / 120), weight: 10, source: 'Broker quotes + mystery shopping', method: 'Median ask price as % of viable threshold', confidence: 'Medium' as const },
  ];
  const decisionMatrix = [
    { action: 'Go', condition: zone.expansion_score >= 80, reason: 'All 5 signals strong. Board-ready business case.' },
    { action: 'Watch', condition: zone.expansion_score >= 65 && zone.expansion_score < 80, reason: 'Monitor quarterly. Trigger capex when score crosses 80.' },
    { action: 'Monitor', condition: zone.expansion_score < 65, reason: 'Not ready. Set data alerts. Review in 6 months.' },
  ];

  // When inline=true, render bare content for the slide-over panel (no backdrop/card wrapper)
  const content = (
    <>
      {/* Dimensions */}
      <div className="mb-5">
        <div className="text-sm font-medium text-[#dde3ed] mb-3">Score Breakdown (5 Dimensions)</div>
        <div className="space-y-3">
          {dims.map(d => (
            <div key={d.label}>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <div className="flex items-center gap-1">
                  <span className="text-[#dde3ed]">{d.label}</span>
                  <DataSourceTooltip metric={d.label} source={d.source} method={d.method} confidence={d.confidence} refreshRate="Quarterly" />
                </div>
                <div className="flex gap-2 text-[#4a5568]">
                  <span>Weight: {d.weight}%</span>
                  <span className="font-mono text-[#dde3ed]">{d.value.toFixed(0)}</span>
                </div>
              </div>
              <div className="score-bar">
                <div className="score-fill" style={{ width: `${Math.min(100, d.value)}%`, background: d.value >= 75 ? '#34d399' : d.value >= 50 ? '#fbbf24' : '#f87171' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 rounded-lg text-xs text-[#8896aa] mb-4" style={{ background: '#161b23' }}>
        <div className="font-semibold text-[#dde3ed] mb-1">Infrastructure Notes</div>
        {zone.infra_notes}
      </div>

      {/* Decision matrix */}
      <div className="mb-4">
        <div className="text-sm font-medium text-[#dde3ed] mb-2">Decision Matrix</div>
        <div className="space-y-2">
          {decisionMatrix.map(d => (
            <div key={d.action} className="flex items-start gap-3 p-2 rounded" style={{ background: d.condition ? `${REC_COLORS[d.action] || '#8896aa'}15` : '#161b23', opacity: d.condition ? 1 : 0.5 }}>
              <span className="badge text-[10px] shrink-0" style={{ background: `${REC_COLORS[d.action] || '#8896aa'}25`, color: REC_COLORS[d.action] || '#8896aa' }}>{d.action}</span>
              <span className="text-[11px] text-[#8896aa]">{d.reason}</span>
              {d.condition && <span className="ml-auto text-[#34d399] text-xs">✓</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 rounded-lg" style={{ background: '#161b23' }}>
        <div className="text-xs font-semibold text-[#dde3ed] mb-1">Strategic Recommendation</div>
        <div className="text-xs text-[#8896aa]">
          {zone.recommendation === 'Expand'
            ? `Proceed with 400–600 seat centre. IT Park format recommended for enterprise mix. IRR projection 22–26% at ₹${zone.avg_price_per_seat.toLocaleString()}/seat/month.`
            : zone.recommendation === 'Watch'
            ? `Set quarterly review trigger. Activate when expansion_score ≥ 80 or search_growth crosses 85. Low capex prep (site shortlist, broker NDA) advised.`
            : zone.recommendation === 'Monitor'
            ? `No action this cycle. Check-in at next quarterly geo review. Upside if ${zone.competitor_count === 0 ? 'first anchor tenant emerges' : 'competitor exits the market'}.`
            : 'Do not allocate resources this cycle. Market fundamentals do not support flex space investment.'}
        </div>
      </div>
    </>
  );

  if (inline) return <>{content}</>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div className="card w-full max-w-xl max-h-[90vh] overflow-y-auto animate-fade-in" style={{ borderRadius: '12px' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-[#dde3ed]">{zone.zone_name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-[#8896aa]">{zone.city}</span>
              <span className="badge text-[10px]" style={{ background: `${recColor}20`, color: recColor }}>{zone.recommendation}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="kpi-num text-2xl font-bold" style={{ color: recColor }}>{zone.expansion_score}</div>
            <button onClick={onClose} className="text-[#8896aa] hover:text-[#dde3ed] text-xl ml-2">×</button>
          </div>
        </div>
        {content}
      </div>
    </div>
  );
}

// ─── Custom Scatter Tooltip ─────────────────────────────────
function ScatterTooltip({ active, payload }: { active?: boolean; payload?: { payload: { name: string; x: number; y: number; z: number; rec: string } }[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const recColor = REC_COLORS[d.rec] || '#8896aa';
  return (
    <div className="bg-[#161b23] border border-[#1e2530] rounded-lg p-3 text-xs shadow-xl">
      <div className="font-semibold text-[#dde3ed] mb-1">{d.name}</div>
      <div className="text-[#8896aa]">Enterprise Density: <span className="font-mono text-[#dde3ed]">{d.x}</span></div>
      <div className="text-[#8896aa]">Competitor Gap: <span className="font-mono text-[#dde3ed]">{d.y}</span></div>
      <div className="text-[#8896aa]">Nightlight: <span className="font-mono text-[#dde3ed]">{d.z}</span></div>
      <div className="mt-1"><span className="badge text-[10px]" style={{ background: `${recColor}20`, color: recColor }}>{d.rec}</span></div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export default function MarketsPage() {
  const [zones, setZones] = useState<GeoZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GeoZone | null>(null);
  const [sortKey, setSortKey] = useState<keyof GeoZone>('expansion_score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [cityFilter, setCityFilter] = useState('All');
  const [recFilter, setRecFilter] = useState('All');
  const [scoreMin, setScoreMin] = useState(0);

  useEffect(() => {
    fetch('/api/geo').then(r => r.json()).then(d => { setZones(d); setLoading(false); });
  }, []);

  const sorted = useMemo(() => {
    let list = zones.filter(z => {
      if (cityFilter !== 'All' && z.city !== cityFilter) return false;
      if (recFilter !== 'All' && z.recommendation !== recFilter) return false;
      if (z.expansion_score < scoreMin) return false;
      return true;
    });
    list = list.sort((a, b) => {
      const av = a[sortKey] as number;
      const bv = b[sortKey] as number;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
    return list;
  }, [zones, sortKey, sortDir, cityFilter, recFilter, scoreMin]);

  // Scatter data
  const scatterData = zones.map(z => ({
    name: z.zone_name,
    x: z.enterprise_density,                          // X: enterprise density
    y: Math.max(0, 100 - z.competitor_count * 10),    // Y: competitor gap (inverse)
    z: z.nightlight_index,                             // Bubble size: nightlight
    rec: z.recommendation,
    score: z.expansion_score,
  }));

  const insight = zones.length > 0
    ? `${zones.filter(z => z.recommendation === 'Expand').length} prime expansion targets identified. ${zones.filter(z => z.enterprise_density > 70 && z.competitor_count < 5).length} zones show high demand + low competition (top-right quadrant). Best opportunity: ${zones.sort((a, b) => b.expansion_score - a.expansion_score)[0]?.zone_name || '—'}.`
    : 'Loading market data…';

  function toggleSort(key: keyof GeoZone) {
    if (sortKey === key) setSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  const cols: { key: keyof GeoZone; label: string }[] = [
    { key: 'zone_name', label: 'Zone' },
    { key: 'city', label: 'City' },
    { key: 'expansion_score', label: 'Score' },
    { key: 'nightlight_index', label: 'NL Index' },
    { key: 'search_growth', label: 'Search ↑' },
    { key: 'enterprise_density', label: 'Enterprise' },
    { key: 'competitor_count', label: 'Competitors' },
    { key: 'avg_price_per_seat', label: 'Avg Price' },
    { key: 'infra_notes', label: 'Infrastructure' },
    { key: 'recommendation', label: 'Rec.' },
  ];

  if (loading) return <div className="p-6 text-[#8896aa]">Loading…</div>;

  return (
    <div className="page-enter" style={{ display: 'flex', position: 'relative' }}>
    <div className="p-6" style={{ flex: 1, marginRight: selected ? '460px' : '0', transition: 'margin-right 0.3s ease', minWidth: 0 }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-[#dde3ed]">Micro-Market Deep Dive</h1>
          <div className="text-xs text-[#8896aa] mt-0.5">All 12 expansion zones · sortable · filterable</div>
        </div>
        <ExportButton data={zones} filename="micro-markets" />
      </div>

      <InsightCallout insight={insight} />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className="text-xs bg-[#161b23] border border-[#1e2530] rounded px-2 py-1.5 text-[#8896aa] outline-none">
          <option value="All">All Cities</option>
          {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={recFilter} onChange={e => setRecFilter(e.target.value)} className="text-xs bg-[#161b23] border border-[#1e2530] rounded px-2 py-1.5 text-[#8896aa] outline-none">
          <option value="All">All Recommendations</option>
          {['Expand', 'Watch', 'Monitor', 'Skip'].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#8896aa]">Score ≥</span>
          <input type="range" min={0} max={90} value={scoreMin} onChange={e => setScoreMin(Number(e.target.value))} className="w-24 accent-orange-500" />
          <span className="text-xs font-mono text-[#dde3ed]">{scoreMin}</span>
        </div>
        <div className="text-xs text-[#4a5568]">{sorted.length} zones</div>
      </div>

      {/* Table */}
      <div className="card mb-6 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#1e2530]">
              {cols.map(c => (
                <th
                  key={c.key}
                  className="pb-2 text-left text-[#4a5568] font-medium pr-4 whitespace-nowrap cursor-pointer hover:text-[#8896aa] transition-colors"
                  onClick={() => c.key !== 'zone_name' && c.key !== 'infra_notes' && c.key !== 'recommendation' ? toggleSort(c.key) : undefined}
                >
                  {c.label}
                  {sortKey === c.key && <span className="ml-1">{sortDir === 'desc' ? '↓' : '↑'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(z => {
              const recColor = REC_COLORS[z.recommendation] || '#8896aa';
              return (
                <tr
                  key={z.id}
                  className="border-b border-[#1e2530] hover:bg-[#161b23] transition-colors cursor-pointer"
                  onClick={() => setSelected(z)}
                >
                  <td className="py-2 text-[#dde3ed] font-medium pr-4">{z.zone_name}</td>
                  <td className="py-2 text-[#8896aa] pr-4">{z.city}</td>
                  <td className="py-2 pr-4">
                    <span className="font-mono font-semibold" style={{ color: recColor }}>{z.expansion_score}</span>
                  </td>
                  <td className="py-2 font-mono text-[#8896aa] pr-4">{z.nightlight_index.toFixed(0)}</td>
                  <td className="py-2 font-mono text-[#8896aa] pr-4">{z.search_growth.toFixed(0)}</td>
                  <td className="py-2 font-mono text-[#8896aa] pr-4">{z.enterprise_density.toFixed(0)}</td>
                  <td className="py-2 font-mono text-[#8896aa] pr-4">{z.competitor_count}</td>
                  <td className="py-2 font-mono pr-4" style={{ color: '#f97316' }}>₹{z.avg_price_per_seat.toLocaleString()}</td>
                  <td className="py-2 text-[#4a5568] pr-4 max-w-[180px] truncate">{z.infra_notes}</td>
                  <td className="py-2">
                    <span className="badge text-[10px]" style={{ background: `${recColor}20`, color: recColor }}>{z.recommendation}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* THE MONEY SLIDE — Scatter chart */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold text-[#dde3ed] flex items-center gap-1">
            Opportunity Matrix — Enterprise Demand vs Competitor Gap
            <DataSourceTooltip
              metric="Opportunity Matrix"
              source="geo_zones table (enterprise_density + competitor_count + nightlight_index)"
              method="enterprise_density = MCA21 co. density; competitor gap = 100 − (count × 10); bubble = nightlight"
              confidence="Estimated"
              refreshRate="Quarterly"
            />
          </div>
        </div>
        <div className="text-[10px] text-[#4a5568] mb-4">
          X = Enterprise Density (0–100) · Y = Competitor Gap score (lower competition = higher) · Bubble size = Nightlight Index · Color = Recommendation
        </div>

        <ResponsiveContainer width="100%" height={380}>
          <ScatterChart margin={{ top: 20, right: 60, bottom: 40, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" domain={[0, 100]} name="Enterprise Density">
              <Label value="Enterprise Density" offset={-10} position="insideBottom" fill="#8896aa" fontSize={11} />
            </XAxis>
            <YAxis type="number" dataKey="y" domain={[0, 100]} name="Competitor Gap">
              <Label value="Competitor Gap" angle={-90} position="insideLeft" fill="#8896aa" fontSize={11} />
            </YAxis>
            <ZAxis type="number" dataKey="z" range={[40, 240]} name="Nightlight Index" />
            <Tooltip content={<ScatterTooltip />} />

            {/* Target zone highlight — top-right quadrant */}
            <ReferenceArea x1={60} x2={100} y1={60} y2={100}
              fill="rgba(52,211,153,0.06)" stroke="rgba(52,211,153,0.2)" strokeDasharray="4 4"
              label={{ value: '🎯 Target Zone', position: 'insideTopRight', style: { fontSize: 10, fill: '#34d399' } }}
            />
            {/* Reference lines for quadrants */}
            <ReferenceLine x={50} stroke="#1e2530" strokeDasharray="4 4" />
            <ReferenceLine y={50} stroke="#1e2530" strokeDasharray="4 4" />

            {/* One scatter per recommendation */}
            {['Expand', 'Watch', 'Monitor', 'Skip'].map(rec => (
              <Scatter
                key={rec}
                name={rec}
                data={scatterData.filter(d => d.rec === rec)}
                fill={REC_COLORS[rec] || '#8896aa'}
                opacity={0.8}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>

        {/* Quadrant labels */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          {[
            { label: 'Prime Targets', desc: 'High demand, low competition', color: '#34d399', pos: 'Top-right' },
            { label: 'Crowded Markets', desc: 'High demand, high competition', color: '#fbbf24', pos: 'Top-left' },
            { label: 'Emerging', desc: 'Low demand, low competition', color: '#38bdf8', pos: 'Bottom-right' },
            { label: 'Skip', desc: 'Low demand, high competition', color: '#f87171', pos: 'Bottom-left' },
          ].map(q => (
            <div key={q.label} className="flex items-center gap-2 text-[11px]">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: q.color }} />
              <span className="font-semibold" style={{ color: q.color }}>{q.label}</span>
              <span className="text-[#4a5568]">— {q.desc}</span>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-3 flex-wrap">
          {Object.entries(REC_COLORS).map(([rec, color]) => (
            <div key={rec} className="flex items-center gap-1.5 text-[11px]">
              <div className="w-3 h-3 rounded-full" style={{ background: color }} />
              <span style={{ color }}>{rec}</span>
            </div>
          ))}
          <div className="ml-auto flex items-center gap-1 text-[10px] text-[#4a5568]">
            Source
            <DataSourceTooltip metric="Scatter Chart Data" source="geo_zones table" method="enterprise_density, competitor_count, nightlight_index from geo scoring model" confidence="Estimated" refreshRate="Quarterly" />
          </div>
        </div>
      </div>

      <LastUpdated />
    </div>

    {/* Slide-over panel */}
    {selected && (
      <div
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: '460px',
          background: '#0f1318', borderLeft: '1px solid #1e2530',
          overflowY: 'auto', zIndex: 40,
          boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
          animation: 'slideInRight 0.25s ease',
        }}
      >
        <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity:0; } to { transform: translateX(0); opacity:1; } }`}</style>
        {/* Slide-over header */}
        <div className="flex items-start justify-between p-5 border-b border-[#1e2530]" style={{ background: `${REC_COLORS[selected.recommendation] || '#8896aa'}0d` }}>
          <div>
            <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: REC_COLORS[selected.recommendation] || '#8896aa' }}>Micro-Market Analysis</div>
            <div className="font-bold text-[#dde3ed] text-lg leading-tight">{selected.zone_name}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-[#8896aa]">{selected.city}</span>
              <span className="badge text-[10px]" style={{ background: `${REC_COLORS[selected.recommendation]}25`, color: REC_COLORS[selected.recommendation] }}>{selected.recommendation}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="font-mono text-3xl font-bold" style={{ color: REC_COLORS[selected.recommendation] || '#8896aa' }}>{selected.expansion_score}</div>
              <div className="text-[9px] text-[#4a5568]">expansion score</div>
            </div>
            <button onClick={() => setSelected(null)} className="text-[#8896aa] hover:text-[#dde3ed] text-2xl leading-none">×</button>
          </div>
        </div>

        {/* Panel body */}
        <div className="p-5">
          <AnalysisModal zone={selected} onClose={() => setSelected(null)} inline />
        </div>
      </div>
    )}
    </div>
  );
}
