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

  // KPIs from latest prices
  const thisMonthPrices = data.latest.filter(r => r.company !== 'TableSpace').map(r => r.price_per_seat);
  const marketMedian = thisMonthPrices.sort((a, b) => a - b)[Math.floor(thisMonthPrices.length / 2)] || 0;
  const ourAvg = data.latest.filter(r => r.company === 'TableSpace').reduce((s, r) => s + r.price_per_seat, 0) /
    Math.max(1, data.latest.filter(r => r.company === 'TableSpace').length);
  const premiumPct = ((ourAvg - marketMedian) / marketMedian * 100);
  const cheapest = data.latest.filter(r => r.company !== 'TableSpace').sort((a, b) => a.price_per_seat - b.price_per_seat)[0];
  const mostExp = data.latest.filter(r => r.company !== 'TableSpace').sort((a, b) => b.price_per_seat - a.price_per_seat)[0];

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

  const insight = `TableSpace is ${premiumPct >= 0 ? `₹${Math.round(ourAvg - marketMedian).toLocaleString()} above` : `₹${Math.round(marketMedian - ourAvg).toLocaleString()} below`} market median across cities. Awfis remains the lowest-cost serious competitor at ₹${data.latest.filter(r => r.company === 'Awfis').reduce((s, r, _, a) => s + r.price_per_seat / a.length, 0).toFixed(0)}/seat avg. ${data.city_stats.filter(c => c.recommended.includes('discount')).length} cities show our price above market max.`;

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

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Market Median Price"
          value={`₹${marketMedian.toLocaleString()}`}
          sub="This quarter, all cities"
          tooltip={{ metric: 'Market Median Price', source: 'pricing_history table', method: 'MEDIAN(price_per_seat) WHERE company != TableSpace, latest quarter', confidence: 'Medium', refreshRate: 'Quarterly' }}
        />
        <KpiCard
          label="Our Premium vs Median"
          value={`${premiumPct >= 0 ? '+' : ''}${premiumPct.toFixed(1)}%`}
          sub={`Our avg: ₹${Math.round(ourAvg).toLocaleString()}`}
          color={premiumPct > 10 ? '#fbbf24' : premiumPct < -5 ? '#34d399' : '#8896aa'}
          tooltip={{ metric: 'Premium vs Median', source: 'pricing_history table (internal + competitor)', method: '(OurAvgPrice - MarketMedian) / MarketMedian × 100', confidence: 'Medium', refreshRate: 'Quarterly' }}
        />
        <KpiCard
          label="Cheapest Competitor"
          value={`₹${cheapest?.price_per_seat.toLocaleString() || '—'}`}
          sub={cheapest?.company || ''}
          color="#f87171"
          tooltip={{ metric: 'Cheapest Competitor', source: 'pricing_history table', method: 'MIN(price_per_seat) WHERE company != TableSpace, latest quarter', confidence: 'Medium', refreshRate: 'Quarterly' }}
        />
        <KpiCard
          label="Most Expensive Competitor"
          value={`₹${mostExp?.price_per_seat.toLocaleString() || '—'}`}
          sub={mostExp?.company || ''}
          color="#34d399"
          tooltip={{ metric: 'Most Expensive Competitor', source: 'pricing_history table', method: 'MAX(price_per_seat) WHERE company != TableSpace, latest quarter', confidence: 'Medium', refreshRate: 'Quarterly' }}
        />
      </div>

      {/* Grouped bar chart */}
      <div className="card mb-5">
        <div className="text-sm font-medium text-[#dde3ed] mb-1 flex items-center gap-1">
          Price per Seat by City — All Operators
          <DataSourceTooltip metric="Price by City" source="pricing_history table" method="Latest price_per_seat per competitor per city" confidence="Medium" refreshRate="Quarterly" />
        </div>
        <div className="text-[10px] text-[#4a5568] mb-4">TableSpace bar always in orange · Hover for exact price + source</div>
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
          Price Trend — 4 Quarters (Avg across cities)
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
