'use client';

import { useEffect, useState } from 'react';
import KpiCard from '@/components/KpiCard';
import InsightCallout from '@/components/InsightCallout';
import ExportButton from '@/components/ExportButton';
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

const SCORE_DIMENSION_META = [
  {
    key: 'nightlight_index', label: 'Nightlight Index', emoji: '🌃',
    source: 'Luminocity3d.org · NASA VIIRS DNB (Day/Night Band)',
    method: 'luminocity3d.org/UrbanLights — annual VIIRS composite radiance (nW/cm²/sr) per ward, normalised 0–100 with Delhi NCR = 100 reference. Zones with NL > 60 indicate established commercial activity.',
    confidence: 'High' as const,
  },
  {
    key: 'search_growth', label: 'Search Growth', emoji: '🔍',
    source: 'Google Trends API + Google Ads Keyword Planner',
    method: 'YoY % change in search volume for "coworking [zone city]" + "office space [zone city]". Connectible via Google Ads API (ads.google.com/home/tools/keyword-planner). Score = (current_volume / baseline_2023) × 100.',
    confidence: 'Medium' as const,
  },
  {
    key: 'enterprise_density', label: 'Enterprise Density', emoji: '🏢',
    source: 'MCA21 company filings + Census 2011 ward data',
    method: 'COUNT of active companies with >50 employees within 5km radius of zone centroid. Source: mca.gov.in MCA21 filings (authorised capital + paid-up capital filters). Cross-checked with LinkedIn company location data.',
    confidence: 'Medium' as const,
  },
  {
    key: 'competitor_count', label: 'Competitor Presence (Gap)', emoji: '⚔️',
    source: 'Google Maps API + operator websites quarterly audit',
    method: 'Count of active flex/coworking spaces within 3km, verified on Google Maps each quarter. Score = MAX(0, 100 − count × 10). Higher score = lower competition = better opportunity gap.',
    confidence: 'High' as const,
  },
  {
    key: 'avg_price_per_seat', label: 'Avg Market Price', emoji: '💰',
    source: 'JLL India Flex Space Report + mystery shopping + broker intel',
    method: 'Median ask price per seat/month in zone. Sources: mystery shopping calls (quarterly), JLL/Colliers published reports, broker conversations, published pricing on operator websites. Score = (price / 12000) × 100 capped at 100.',
    confidence: 'Medium' as const,
  },
];

// ─── Full Analysis Modal ───────────────────────────────────
function AnalysisModal({ zone, onClose }: { zone: GeoZone; onClose: () => void }) {
  const recColor = REC_COLORS[zone.recommendation] || '#8896aa';

  const dimensions = [
    { key: 'nightlight_index', label: 'Nightlight Index', value: zone.nightlight_index, weight: 25, max: 100 },
    { key: 'search_growth', label: 'Search Growth', value: zone.search_growth, weight: 25, max: 100 },
    { key: 'enterprise_density', label: 'Enterprise Density', value: zone.enterprise_density, weight: 25, max: 100 },
    { key: 'competitor_count', label: 'Competitor Gap', value: Math.max(0, 100 - zone.competitor_count * 10), weight: 15, max: 100 },
    { key: 'avg_price_per_seat', label: 'Price Viability', value: Math.min(100, zone.avg_price_per_seat / 120), weight: 10, max: 100 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={onClose}>
      <div className="card w-full max-w-xl max-h-[90vh] overflow-y-auto animate-fade-in" style={{ borderRadius: '12px' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-[#dde3ed]">{zone.zone_name}</h2>
            <div className="text-xs text-[#8896aa] mt-0.5">{zone.city}</div>
          </div>
          <div className="flex items-center gap-2">
            <div className="kpi-num text-2xl font-bold" style={{ color: recColor }}>{zone.expansion_score}</div>
            <span className="text-sm text-[#8896aa]">/ 100</span>
            <button onClick={onClose} className="ml-2 text-[#8896aa] hover:text-[#dde3ed] text-xl">×</button>
          </div>
        </div>

        {/* Score breakdown */}
        <div className="mb-5">
          <div className="text-sm font-medium text-[#dde3ed] mb-3">Score Breakdown</div>
          <div className="space-y-3">
            {dimensions.map(dim => {
              const meta = SCORE_DIMENSION_META.find(m => m.key === dim.key);
              const barPct = Math.min(100, Math.max(0, dim.value));
              return (
                <div key={dim.key}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <div className="flex items-center gap-1">
                      <span>{meta?.emoji}</span>
                      <span className="text-[#dde3ed]">{dim.label}</span>
                      {meta && (
                        <DataSourceTooltip
                          metric={dim.label}
                          source={meta.source}
                          method={meta.method}
                          confidence={meta.confidence}
                          refreshRate="Quarterly"
                        />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <span className="text-[#4a5568]">Weight: {dim.weight}%</span>
                      <span className="font-mono text-[#dde3ed]">{dim.value.toFixed(0)}</span>
                    </div>
                  </div>
                  <div className="score-bar">
                    <div className="score-fill" style={{ width: `${barPct}%`, background: barPct >= 75 ? '#34d399' : barPct >= 50 ? '#fbbf24' : '#f87171' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Infra notes */}
        <div className="p-3 rounded-lg text-xs text-[#8896aa] mb-4" style={{ background: '#161b23' }}>
          <div className="font-semibold text-[#dde3ed] mb-1">Infrastructure Notes</div>
          {zone.infra_notes}
        </div>

        {/* Recommendation */}
        <div className="p-3 rounded-lg mb-4" style={{ background: `${recColor}10`, border: `1px solid ${recColor}30` }}>
          <div className="text-xs font-semibold mb-1" style={{ color: recColor }}>Recommendation: {zone.recommendation}</div>
          <div className="text-xs text-[#dde3ed]">
            {zone.recommendation === 'Expand'
              ? 'Strong fundamentals across all signals. Target 400–600 seat centre. Prioritise IT Park format for enterprise pull.'
              : zone.recommendation === 'Watch'
              ? 'Positive early signals but market not fully mature. Revisit in 6–9 months. Track nightlight + search trends monthly.'
              : zone.recommendation === 'Monitor'
              ? 'Below threshold on 2+ dimensions. Set data alerts. No capex commitment until search growth crosses 75.'
              : 'Skip this cycle. Low demand + weak infra. Re-evaluate in 12+ months if adjacent zones activate.'}
          </div>
        </div>

        {/* Comparable zones */}
        <div className="p-3 rounded-lg" style={{ background: '#161b23' }}>
          <div className="text-xs font-semibold text-[#dde3ed] mb-1">Comparable Zones TableSpace Already Operates In</div>
          <div className="text-xs text-[#8896aa]">
            {zone.expansion_score >= 80
              ? 'Whitefield, Bangalore (Score: 84) · HITEC City, Hyderabad (Score: 82) — similar IT cluster + enterprise mix'
              : zone.expansion_score >= 65
              ? 'Hinjewadi Phase 1, Pune (Score: 72) · Gachibowli, Hyderabad (Score: 68) — comparable growth corridor'
              : 'No direct match in current portfolio — greenfield entry if proceeded'}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── City Bubble Chart (replaces poor SVG map) ─────────────
function CityBubbleChart({ zones, onCityClick, activeCity }: { zones: GeoZone[]; onCityClick: (city: string) => void; activeCity: string | null }) {
  const cityScores: Record<string, number> = {};
  const cityRecs:   Record<string, string>  = {};
  const cityZones:  Record<string, number>  = {};
  zones.forEach(z => {
    cityZones[z.city] = (cityZones[z.city] || 0) + 1;
    if (!cityScores[z.city] || z.expansion_score > cityScores[z.city]) {
      cityScores[z.city] = z.expansion_score;
      cityRecs[z.city]   = z.recommendation;
    }
  });

  const cityData = Object.entries(cityScores)
    .map(([city, score]) => ({ city, score, rec: cityRecs[city], zones: cityZones[city] }))
    .sort((a, b) => b.score - a.score);

  function scoreColor(score: number) {
    if (score >= 80) return '#34d399';
    if (score >= 60) return '#f97316';
    if (score >= 50) return '#38bdf8';
    return '#8896aa';
  }

  return (
    <div className="card">
      <div className="text-sm font-medium text-[#dde3ed] mb-1 flex items-center gap-1">
        City Expansion Overview
        <DataSourceTooltip metric="Expansion Map" source="Luminocity3d.org VIIRS + Google Trends + MCA21 + Google Maps" method="5-signal composite: Nightlight 25% · Search Growth 25% · Enterprise Density 25% · Competitor Gap 15% · Price Viability 10%" confidence="Estimated" refreshRate="Quarterly" />
      </div>
      <div className="text-[10px] text-[#4a5568] mb-3">Click a city to filter zones below · Score = top zone score</div>

      <div className="grid grid-cols-2 gap-2">
        {cityData.map(({ city, score, rec, zones: zCount }) => {
          const color    = scoreColor(score);
          const isActive = activeCity === city;
          const size     = 42 + Math.round((score / 100) * 18);
          return (
            <div
              key={city}
              onClick={() => onCityClick(city)}
              className="cursor-pointer flex items-center gap-3 p-2.5 rounded-lg transition-all hover:border-[#2d3848]"
              style={{
                background: isActive ? `${color}0d` : '#161b23',
                border: `1px solid ${isActive ? color + '50' : '#1e2530'}`,
              }}
            >
              <div
                className="flex items-center justify-center rounded-full shrink-0 font-mono font-bold transition-all"
                style={{ width: size, height: size, background: `${color}18`, border: `2px solid ${color}`, color, fontSize: size > 54 ? '14px' : '12px' }}
              >
                {score}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm text-[#dde3ed] truncate">{city}</div>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: `${color}20`, color }}>{rec}</span>
                  <span className="text-[9px] text-[#4a5568]">{zCount} zone{zCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-3 mt-3 flex-wrap">
        {[{ label: '≥80 Expand', color: '#34d399' }, { label: '60–79 Watch', color: '#f97316' }, { label: '50–69 Monitor', color: '#38bdf8' }, { label: '<50 Skip', color: '#8896aa' }].map(l => (
          <div key={l.label} className="flex items-center gap-1 text-[10px] text-[#8896aa]">
            <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
            {l.label}
          </div>
        ))}
      </div>

      <div className="mt-3 p-2.5 rounded-lg text-[10px] text-[#4a5568]" style={{ background: '#161b23' }}>
        <span className="font-semibold text-[#8896aa]">Signals: </span>
        Nightlight (VIIRS) · Search Growth (Google Trends) · Enterprise Density (MCA21) · Competitor Gap (Maps) · Price Viability
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export default function GeoPage() {
  const [zones, setZones] = useState<GeoZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCity, setActiveCity] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [modal, setModal] = useState<GeoZone | null>(null);

  useEffect(() => {
    fetch('/api/geo').then(r => r.json()).then(d => { setZones(d); setLoading(false); });
  }, []);

  const filteredZones = activeCity ? zones.filter(z => z.city === activeCity) : zones;

  // KPIs
  const highPriority = zones.filter(z => z.expansion_score >= 75).length;
  const topZone = zones[0];
  const avgCompetitors = zones.filter(z => z.expansion_score >= 75).reduce((s, z) => s + z.competitor_count, 0) /
    Math.max(1, zones.filter(z => z.expansion_score >= 75).length);
  const projectedSeats = zones.slice(0, 3).reduce((s) => s + 500, 0); // 500 seats per zone estimate

  const insight = topZone
    ? `${topZone.zone_name} scores ${topZone.expansion_score}/100 — highest expansion candidate. ${topZone.competitor_count} competitors vs estimated 800-seat demand gap. ${zones.filter(z => z.recommendation === 'Expand').length} zones ready for immediate expansion.`
    : 'Loading expansion data…';

  if (loading) {
    return <div className="p-6 grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="card h-24 animate-pulse" style={{ background: '#161b23' }} />)}</div>;
  }

  return (
    <div className="p-6 page-enter">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-[#dde3ed]">Expansion Scoring Overview</h1>
          <div className="text-xs text-[#8896aa] mt-0.5">AI-powered zone analysis across India</div>
        </div>
        <ExportButton data={zones} filename="geo-zones" />
      </div>

      <InsightCallout insight={insight} />

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard label="High-Priority Zones (≥75)" value={highPriority.toString()} color="#34d399" tooltip={{ metric: 'High Priority Zones', source: 'geo_zones table', method: 'COUNT(*) WHERE expansion_score >= 75', confidence: 'Estimated', refreshRate: 'Quarterly' }} />
        <KpiCard label="Top Zone Score" value={topZone ? `${topZone.zone_name.split('-')[0]} · ${topZone.expansion_score}` : '—'} color="#f97316" tooltip={{ metric: 'Top Zone', source: 'geo_zones table', method: 'ORDER BY expansion_score DESC LIMIT 1', confidence: 'Estimated', refreshRate: 'Quarterly' }} />
        <KpiCard label="Avg Competitors in Top Zones" value={avgCompetitors.toFixed(1)} color="#fbbf24" tooltip={{ metric: 'Avg Competitors', source: 'geo_zones table', method: 'AVG(competitor_count) WHERE expansion_score >= 75', confidence: 'Medium', refreshRate: 'Quarterly' }} />
        <KpiCard label="Projected Seats (Top 3)" value={projectedSeats.toLocaleString()} sub="at 500 seats/zone" color="#a78bfa" tooltip={{ metric: 'Projected New Seats', source: 'geo_zones table + capacity model', method: 'Top 3 zones × 500 seat estimate (standard TableSpace floor)', confidence: 'Estimated', refreshRate: 'Quarterly' }} />
      </div>

      {/* Two-column: map + zone list */}
      <div className="grid grid-cols-5 gap-5">
        {/* Map (40%) */}
        <div className="col-span-2">
          <CityBubbleChart zones={zones} onCityClick={c => setActiveCity(activeCity === c ? null : c)} activeCity={activeCity} />
        </div>

        {/* Zone list (60%) */}
        <div className="col-span-3">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-[#dde3ed]">
              Ranked Micro-Markets
              {activeCity && <span className="ml-2 text-xs text-[#f97316]">· {activeCity}</span>}
            </div>
            {activeCity && <button onClick={() => setActiveCity(null)} className="text-[10px] text-[#8896aa] hover:text-[#dde3ed]">Clear filter ×</button>}
          </div>

          <div className="space-y-2">
            {filteredZones.map(zone => {
              const recColor = REC_COLORS[zone.recommendation] || '#8896aa';
              const isExpanded = expanded === zone.id;
              const dims = [
                { label: 'Nightlight', value: zone.nightlight_index, key: 'nightlight_index' },
                { label: 'Search', value: zone.search_growth, key: 'search_growth' },
                { label: 'Enterprise', value: zone.enterprise_density, key: 'enterprise_density' },
                { label: 'Comp Gap', value: Math.max(0, 100 - zone.competitor_count * 10), key: 'competitor_count' },
                { label: 'Price', value: Math.min(100, zone.avg_price_per_seat / 120), key: 'avg_price_per_seat' },
              ];

              return (
                <div key={zone.id} className="card hover:border-[#2d3848] transition-all" style={{ padding: '12px' }}>
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpanded(isExpanded ? null : zone.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="kpi-num text-lg font-bold w-8 text-right" style={{ color: recColor }}>{zone.expansion_score}</div>
                      <div>
                        <div className="font-medium text-sm text-[#dde3ed]">{zone.zone_name}</div>
                        <div className="text-[11px] text-[#8896aa]">{zone.city} · {zone.competitor_count} competitors</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge text-[10px]" style={{ background: `${recColor}20`, color: recColor }}>{zone.recommendation}</span>
                      <span className="text-[#4a5568]">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-[#1e2530] animate-fade-in">
                      <div className="space-y-2 mb-3">
                        {dims.map(d => {
                          const meta = SCORE_DIMENSION_META.find(m => m.key === d.key);
                          const pct = Math.min(100, Math.max(0, d.value));
                          return (
                            <div key={d.label}>
                              <div className="flex justify-between text-[10px] mb-0.5">
                                <div className="flex items-center gap-0.5">
                                  <span className="text-[#8896aa]">{d.label}</span>
                                  {meta && <DataSourceTooltip metric={d.label} source={meta.source} method={meta.method} confidence={meta.confidence} refreshRate="Quarterly" />}
                                </div>
                                <span className="font-mono text-[#dde3ed]">{pct.toFixed(0)}</span>
                              </div>
                              <div className="score-bar">
                                <div className="score-fill" style={{ width: `${pct}%`, background: pct >= 75 ? '#34d399' : pct >= 50 ? '#fbbf24' : '#f87171' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-[10px] text-[#8896aa] mb-2">{zone.infra_notes}</div>
                      <button
                        onClick={() => setModal(zone)}
                        className="w-full py-1.5 rounded text-xs border border-[#1e2530] text-[#8896aa] hover:text-[#f97316] hover:border-[#f97316] transition-all"
                      >
                        Full Analysis →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <LastUpdated />

      {modal && <AnalysisModal zone={modal} onClose={() => setModal(null)} />}
    </div>
  );
}
