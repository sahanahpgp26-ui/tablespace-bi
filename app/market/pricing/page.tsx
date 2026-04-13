'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import KpiCard from '@/components/KpiCard';
import InsightCallout from '@/components/InsightCallout';
import ExportButton from '@/components/ExportButton';
import LastUpdated from '@/components/LastUpdated';
import DataSourceTooltip from '@/components/DataSourceTooltip';

interface PricingData {
  latest: { company: string; city: string; price_per_seat: number; recorded_at: string; source_method: string }[];
  trend: { company: string; city: string; price_per_seat: number; recorded_at: string }[];
  city_stats: { city: string; our_price: number; market_min: number; market_max: number; market_median: number; recommended: string }[];
}

const CITIES = ['Bangalore', 'Mumbai', 'Gurugram', 'Hyderabad', 'Pune', 'Chennai'];
const COMPANIES = ['TableSpace', 'WeWork India', 'Awfis', 'IndiQube', 'Smartworks', 'Cowrks', 'Skootr'];
const BAR_COLORS: Record<string, string> = {
  'TableSpace': '#f97316',
  'WeWork India': '#38bdf8',
  'Awfis': '#a78bfa',
  'IndiQube': '#34d399',
  'Smartworks': '#fbbf24',
  'Cowrks': '#f87171',
  'Skootr': '#c084fc',
};

const RECOMMENDED_COLORS: Record<string, string> = {
  'Consider discount on large deals': '#f87171',
  'Room to increase — check NPS first': '#34d399',
  'Competitive — maintain': '#fbbf24',
};

export default function PricingPage() {
  const [data, setData] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/pricing').then(r => r.json()).then(d => { setData(d); setLoading(false); });
  }, []);

  if (loading || !data) {
    return <div className="p-6"><div className="grid grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="card h-24 animate-pulse" style={{ background: '#161b23' }} />)}</div></div>;
  }

  // Per-city positioning (the only meaningful way to compare)
  // Cross-city averages are intentionally NOT used — Mumbai CBD commands ₹14-18k/seat
  // while Hyderabad tech parks are ₹7-10k. Blending them produces a meaningless number
  // that no pricing decision can be anchored to.
  const cityPositioning = data.city_stats.map(row => {
    const compRange = row.market_max - row.market_min;
    const ourRelative = compRange > 0 ? ((row.our_price - row.market_min) / compRange) * 100 : 50;
    const position = row.our_price > row.market_max ? 'Above Market' :
      row.our_price > row.market_median ? 'Premium' :
      row.our_price < row.market_min ? 'Below Floor' : 'Competitive';
    const posColor = position === 'Above Market' ? '#f87171' : position === 'Premium' ? '#fbbf24' : position === 'Below Floor' ? '#a78bfa' : '#34d399';
    return { ...row, ourRelative, position, posColor, compRange };
  });
  const citiesAboveMedian = cityPositioning.filter(c => c.our_price >= c.market_median).length;
  const highestPremiumCity = [...cityPositioning].sort((a, b) => (b.our_price - b.market_median) - (a.our_price - a.market_median))[0];
  const mostCompetitiveCity = [...cityPositioning].sort((a, b) => Math.abs(a.our_price - a.market_median) - Math.abs(b.our_price - b.market_median))[0];

  // Grouped bar chart data (by city)
  const barData = CITIES.map(city => {
    const row: Record<string, unknown> = { city: city.replace('Gurugram', 'Gurgaon') };
    COMPANIES.forEach(comp => {
      const match = data.latest.find(r => r.city === city && r.company === comp);
      if (match) row[comp] = match.price_per_seat;
    });
    return row;
  });

  // Trend chart: avg price per company per quarter
  const quarters = [...new Set(data.trend.map(r => r.recorded_at))].sort();
  const trendData = quarters.map(q => {
    const row: Record<string, unknown> = { quarter: q.slice(0, 7) };
    COMPANIES.forEach(comp => {
      const rows = data.trend.filter(r => r.recorded_at === q && r.company === comp);
      if (rows.length) row[comp] = Math.round(rows.reduce((s, r) => s + r.price_per_seat, 0) / rows.length);
    });
    return row;
  });

  const insight = `Per-city analysis: TableSpace is above market median in ${citiesAboveMedian}/${data.city_stats.length} cities. Strongest premium in ${highestPremiumCity?.city || '—'} (₹${highestPremiumCity ? (highestPremiumCity.our_price - highestPremiumCity.market_median).toLocaleString() : 0} above median). Most competitively priced in ${mostCompetitiveCity?.city || '—'}. ${data.city_stats.filter(c => c.recommended.includes('discount')).length} cities flagged for pricing review.`;

  return (
    <div className="p-6 page-enter">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-[#dde3ed]">Market Pricing Intelligence</h1>
          <div className="text-xs text-[#8896aa] mt-0.5">Competitive pricing across 6 cities — quarterly tracking</div>
        </div>
        <ExportButton data={data.city_stats} filename="market-pricing" />
      </div>

      <InsightCallout insight={insight} />

      {/* Methodology card — explains why per-city matters */}
      <div className="card mb-5 p-4" style={{ borderLeft: '3px solid #38bdf8' }}>
        <div className="flex items-start gap-3">
          <div className="text-xl shrink-0">📐</div>
          <div>
            <div className="text-sm font-semibold text-[#dde3ed] mb-1">Why we analyse pricing per city, not as a market average</div>
            <div className="text-xs text-[#8896aa] leading-relaxed">
              Flex space pricing is <span className="text-[#dde3ed]">entirely driven by local supply/demand</span> — Mumbai CBD desks command ₹14–18k/seat while Hyderabad tech park desks are ₹7–10k.
              A blended "market median across all cities" mixes incomparable micro-markets and produces a number no pricing decision can be anchored to.
              Instead we benchmark <span className="text-[#dde3ed]">TableSpace vs competitors within each city</span> and define our positioning target:
              stay in the <span className="text-[#fbbf24]">top-third of each city's range</span> (premium over mass-market operators like Awfis, below WeWork's CBD ceiling)
              to justify our quality positioning without pricing out mid-market Enterprise clients.
            </div>
            <div className="flex gap-4 mt-2.5 text-[10px]">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{background:'#34d399'}} />Competitive — within market range, near median</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{background:'#fbbf24'}} />Premium — above median, below market max</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{background:'#f87171'}} />Above Market — risk of losing price-sensitive deals</span>
            </div>
          </div>
        </div>
      </div>

      {/* Per-city positioning tiles */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {cityPositioning.map(c => {
          const pctOfRange = c.compRange > 0 ? Math.round(((c.our_price - c.market_min) / c.compRange) * 100) : 50;
          return (
            <div key={c.city} className="card p-4" style={{ borderTop: `2px solid ${c.posColor}` }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-[#dde3ed] text-sm">{c.city}</div>
                  <span className="badge text-[10px] mt-1" style={{ background: `${c.posColor}20`, color: c.posColor }}>{c.position}</span>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-lg" style={{ color: '#f97316' }}>₹{c.our_price.toLocaleString()}</div>
                  <div className="text-[9px] text-[#4a5568]">our price/seat/mo</div>
                </div>
              </div>
              {/* Range bar */}
              <div className="relative mb-2">
                <div className="h-1.5 rounded-full bg-[#1e2530]" />
                <div className="absolute inset-y-0 rounded-full" style={{
                  left: `${Math.max(0, pctOfRange - 4)}%`,
                  width: '8px',
                  background: c.posColor,
                  top: 0,
                }} />
              </div>
              <div className="flex justify-between text-[9px] text-[#4a5568] mb-2">
                <span>₹{c.market_min.toLocaleString()} min</span>
                <span>₹{c.market_median.toLocaleString()} median</span>
                <span>₹{c.market_max.toLocaleString()} max</span>
              </div>
              <div className="text-[10px]" style={{ color: c.posColor }}>
                {c.our_price > c.market_median
                  ? `₹${(c.our_price - c.market_median).toLocaleString()} above median`
                  : `₹${(c.market_median - c.our_price).toLocaleString()} below median`}
                {' · '}{c.recommended}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grouped bar chart */}
      <div className="card mb-5">
        <div className="text-sm font-medium text-[#dde3ed] mb-1 flex items-center gap-1">
          Price per Seat — All Operators by City
          <DataSourceTooltip metric="Price by City" source="pricing_history table" method="Latest price_per_seat per competitor per city" confidence="Medium" refreshRate="Quarterly" />
        </div>
        <div className="text-[10px] text-[#4a5568] mb-4">Compare within each city group only — cross-city comparison is not meaningful due to different market forces · TableSpace in orange</div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={barData} margin={{ left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="city" />
            <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(v: number, name: string) => [
                `₹${v.toLocaleString('en-IN')}`,
                name,
              ]}
            />
            <Legend />
            {COMPANIES.map(comp => (
              <Bar key={comp} dataKey={comp} fill={BAR_COLORS[comp] || '#8896aa'} radius={[3, 3, 0, 0]}
                opacity={comp === 'TableSpace' ? 1 : 0.7}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Trend chart */}
      <div className="card mb-5">
        <div className="text-sm font-medium text-[#dde3ed] mb-1 flex items-center gap-1">
          Price Trend — 4 Quarters (Per-operator avg, directional only)
          <DataSourceTooltip metric="Price Trend" source="pricing_history table" method="AVG(price_per_seat) per company per quarter, across all cities" confidence="Medium" refreshRate="Quarterly" />
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="quarter" />
            <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => `₹${v.toLocaleString()}`} />
            <Legend />
            {COMPANIES.map(comp => (
              <Line key={comp} type="monotone" dataKey={comp}
                stroke={BAR_COLORS[comp] || '#8896aa'}
                strokeWidth={comp === 'TableSpace' ? 2.5 : 1.5}
                dot={false}
                opacity={comp === 'TableSpace' ? 1 : 0.7}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Pricing strategy table */}
      <div className="card">
        <div className="text-sm font-medium text-[#dde3ed] mb-3 flex items-center gap-1">
          Pricing Strategy by City
          <DataSourceTooltip metric="Pricing Strategy" source="pricing_history table (computed)" method="Compare our latest price vs market min/max/median per city" confidence="Medium" refreshRate="Quarterly" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1e2530]">
                {['City', 'Our Price', 'Mkt Min', 'Mkt Max', 'Mkt Median', 'Our Position', 'Recommended Action'].map(h => (
                  <th key={h} className="pb-2 text-left text-[#4a5568] font-medium pr-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.city_stats.map(row => {
                const pos = row.our_price > row.market_max ? 'Above Market' :
                  row.our_price > row.market_median ? 'Above Median' :
                  row.our_price < row.market_median ? 'Below Median' : 'At Median';
                const posColor = pos === 'Above Market' ? '#f87171' : pos === 'Above Median' ? '#fbbf24' : '#34d399';
                const recColor = RECOMMENDED_COLORS[row.recommended] || '#8896aa';
                return (
                  <tr key={row.city} className="border-b border-[#1e2530] hover:bg-[#161b23] transition-colors">
                    <td className="py-2 text-[#dde3ed] font-medium pr-4">{row.city}</td>
                    <td className="py-2 font-mono pr-4" style={{ color: '#f97316' }}>
                      <span title="Internal revenue data">₹{row.our_price.toLocaleString()}</span>
                      <DataSourceTooltip metric="Our Price" source="Internal revenue system" method="Avg realized price per seat per city, last quarter" confidence="High" refreshRate="Monthly" />
                    </td>
                    <td className="py-2 font-mono text-[#8896aa] pr-4">₹{(row.market_min || 0).toLocaleString()}</td>
                    <td className="py-2 font-mono text-[#8896aa] pr-4">₹{(row.market_max || 0).toLocaleString()}</td>
                    <td className="py-2 font-mono text-[#8896aa] pr-4">₹{(row.market_median || 0).toLocaleString()}</td>
                    <td className="py-2 pr-4">
                      <span className="badge text-[10px]" style={{ background: `${posColor}20`, color: posColor }}>{pos}</span>
                    </td>
                    <td className="py-2">
                      <span className="text-[11px]" style={{ color: recColor }}>{row.recommended}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <LastUpdated />
    </div>
  );
}
