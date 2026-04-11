'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import KpiCard from '@/components/KpiCard';
import InsightCallout from '@/components/InsightCallout';
import ExportButton from '@/components/ExportButton';
import LastUpdated from '@/components/LastUpdated';
import DataSourceTooltip from '@/components/DataSourceTooltip';
import Link from 'next/link';

interface Centre {
  id: number;
  name: string;
  city: string;
  sqft: number;
  total_seats: number;
  occupied_seats: number;
  available_seats: number;
  non_usable_seats: number;
  revenue_per_seat: number;
  centre_type: string;
  status: string;
  snapshots?: { date: string; occupied_seats: number; available_seats: number; revenue: number }[];
}

const CITIES = ['Bangalore', 'Mumbai', 'Gurugram', 'Hyderabad', 'Pune', 'Chennai'];
const TYPES = ['IT Park', 'CBD', 'Premium', 'Emerging'];

function occupancyColor(pct: number) {
  if (pct >= 85) return '#f87171';  // Saturated
  if (pct >= 70) return '#34d399';  // Healthy
  return '#38bdf8';                  // Activate
}

function occupancyLabel(pct: number) {
  if (pct >= 85) return 'Saturated';
  if (pct >= 70) return 'Healthy';
  return 'Activate';
}

export default function SpacePage() {
  const [centres, setCentres] = useState<Centre[]>([]);
  const [loading, setLoading] = useState(true);
  const [cityFilter, setCityFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [sortBy, setSortBy] = useState('occupancy');

  useEffect(() => {
    fetch('/api/centres?snapshots=true').then(r => r.json()).then(d => {
      setCentres(d);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let list = centres;
    if (cityFilter.length) list = list.filter(c => cityFilter.includes(c.city));
    if (typeFilter !== 'All') list = list.filter(c => c.centre_type === typeFilter);
    if (statusFilter !== 'All') {
      list = list.filter(c => {
        const pct = c.total_seats > 0 ? c.occupied_seats / c.total_seats * 100 : 0;
        if (statusFilter === 'Saturated') return pct >= 85;
        if (statusFilter === 'Healthy') return pct >= 70 && pct < 85;
        if (statusFilter === 'Activate') return pct < 70;
        return true;
      });
    }
    return list.sort((a, b) => {
      if (sortBy === 'occupancy') return (b.occupied_seats / b.total_seats) - (a.occupied_seats / a.total_seats);
      if (sortBy === 'sqft') return b.sqft - a.sqft;
      if (sortBy === 'revenue') return b.revenue_per_seat - a.revenue_per_seat;
      return 0;
    });
  }, [centres, cityFilter, statusFilter, typeFilter, sortBy]);

  // KPIs
  const totalSqft = centres.reduce((s, c) => s + c.sqft, 0);
  const totalSeats = centres.reduce((s, c) => s + c.total_seats, 0);
  const totalOccupied = centres.reduce((s, c) => s + c.occupied_seats, 0);
  const totalAvailable = centres.reduce((s, c) => s + c.available_seats, 0);
  const avgRevPerSeat = centres.length
    ? Math.round(centres.reduce((s, c) => s + c.revenue_per_seat, 0) / centres.length)
    : 0;
  const portfolioOcc = totalSeats > 0 ? Math.round(totalOccupied / totalSeats * 100) : 0;

  // City summaries
  const citySummaries = CITIES.map(city => {
    const cs = centres.filter(c => c.city === city);
    const occ = cs.reduce((s, c) => s + c.occupied_seats, 0);
    const tot = cs.reduce((s, c) => s + c.total_seats, 0);
    const avail = cs.reduce((s, c) => s + c.available_seats, 0);
    const non = cs.reduce((s, c) => s + c.non_usable_seats, 0);
    const revps = cs.length ? Math.round(cs.reduce((s, c) => s + c.revenue_per_seat, 0) / cs.length) : 0;
    return { city, count: cs.length, sqft: cs.reduce((s, c) => s + c.sqft, 0), total: tot, occupied: occ, available: avail, nonUsable: non, revPerSeat: revps, pct: tot > 0 ? Math.round(occ / tot * 100) : 0 };
  }).filter(c => c.count > 0);

  // Utilization bar chart
  const utilData = citySummaries.map(c => ({
    city: c.city,
    Occupied: c.total > 0 ? +(c.occupied / c.total * 100).toFixed(1) : 0,
    Available: c.total > 0 ? +(c.available / c.total * 100).toFixed(1) : 0,
    NonUsable: c.total > 0 ? +(c.nonUsable / c.total * 100).toFixed(1) : 0,
  }));

  // Trend line (aggregate daily occupancy across all centres, last 30 data points)
  const trendData = useMemo(() => {
    if (!centres.length || !centres[0]?.snapshots?.length) return [];
    const allDates = [...new Set(centres.flatMap(c => (c.snapshots || []).map(s => s.date)))].sort().slice(-30);
    return allDates.map(date => {
      let occ = 0, tot = 0;
      centres.forEach(c => {
        const snap = c.snapshots?.find(s => s.date === date);
        if (snap) { occ += snap.occupied_seats; tot += c.total_seats; }
      });
      return { date: date.slice(5), occupancy: tot > 0 ? +(occ / tot * 100).toFixed(1) : 0 };
    });
  }, [centres]);

  // Dynamic insight
  const lowestCity = citySummaries.slice().sort((a, b) => a.pct - b.pct)[0];
  const insight = lowestCity
    ? `${lowestCity.city} has ${100 - lowestCity.pct}% free space — highest in portfolio with ${lowestCity.available.toLocaleString()} available seats. Activation campaign could yield ₹${(lowestCity.available * lowestCity.revPerSeat / 100000).toFixed(1)}L/month at current market rates.`
    : 'Loading portfolio data…';

  function toggleCity(c: string) {
    setCityFilter(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  }

  return (
    <div className="p-6 page-enter">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-[#dde3ed]">Portfolio Overview</h1>
          <div className="text-xs text-[#8896aa] mt-0.5">{centres.length} centres · {CITIES.filter(c => centres.some(ct => ct.city === c)).length} cities</div>
        </div>
        <ExportButton data={citySummaries.map(c => ({ city: c.city, centres: c.count, sqft: c.sqft, seats: c.total, occupied: c.occupied, occupancy_pct: c.pct, available: c.available, rev_per_seat: c.revPerSeat }))} filename="portfolio" />
      </div>

      <InsightCallout insight={insight} />

      {/* KPI Row */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        <KpiCard label="Total Portfolio Sqft" value={`${(totalSqft / 1000).toFixed(0)}K`} sub="sq ft" tooltip={{ metric: 'Total Sqft', source: 'centres table', method: 'SUM(sqft) from centres', confidence: 'High', refreshRate: 'Monthly' }} />
        <KpiCard label="Portfolio Occupancy" value={`${portfolioOcc}%`} color={occupancyColor(portfolioOcc)} tooltip={{ metric: 'Portfolio Occupancy', source: 'centres table', method: 'SUM(occupied_seats) / SUM(total_seats)', confidence: 'High', refreshRate: 'Daily' }} />
        <KpiCard label="Total Occupied Seats" value={totalOccupied.toLocaleString()} color="#34d399" tooltip={{ metric: 'Occupied Seats', source: 'centres table', method: 'SUM(occupied_seats)', confidence: 'High', refreshRate: 'Daily' }} />
        <KpiCard label="Available Seats" value={totalAvailable.toLocaleString()} color="#38bdf8" tooltip={{ metric: 'Available Seats', source: 'centres table', method: 'SUM(available_seats)', confidence: 'High', refreshRate: 'Daily' }} />
        <KpiCard label="Avg Revenue / Seat" value={`₹${avgRevPerSeat.toLocaleString()}`} color="#f97316" tooltip={{ metric: 'Avg Revenue per Seat', source: 'centres table', method: 'AVG(revenue_per_seat)', confidence: 'High', refreshRate: 'Monthly' }} />
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {CITIES.map(c => (
            <button key={c} onClick={() => toggleCity(c)}
              className="px-2.5 py-1 rounded text-xs transition-all"
              style={{ background: cityFilter.includes(c) ? 'rgba(249,115,22,0.15)' : '#161b23', color: cityFilter.includes(c) ? '#f97316' : '#8896aa', border: `1px solid ${cityFilter.includes(c) ? 'rgba(249,115,22,0.4)' : '#1e2530'}` }}
            >{c}</button>
          ))}
        </div>
        <div className="h-4 w-px bg-[#1e2530]" />
        {['All', 'Saturated', 'Healthy', 'Activate'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className="px-2.5 py-1 rounded text-xs transition-all"
            style={{ background: statusFilter === s ? '#161b23' : 'transparent', color: statusFilter === s ? '#dde3ed' : '#8896aa', border: `1px solid ${statusFilter === s ? '#2d3848' : '#1e2530'}` }}
          >{s}</button>
        ))}
        <div className="h-4 w-px bg-[#1e2530]" />
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="text-xs bg-[#161b23] border border-[#1e2530] rounded px-2 py-1 text-[#8896aa] outline-none">
          <option value="occupancy">Sort: Occupancy ↓</option>
          <option value="sqft">Sort: Sqft ↓</option>
          <option value="revenue">Sort: Revenue/seat ↓</option>
        </select>
        <div className="h-4 w-px bg-[#1e2530]" />
        {['All', ...TYPES].map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className="px-2.5 py-1 rounded text-xs transition-all"
            style={{ background: typeFilter === t ? '#161b23' : 'transparent', color: typeFilter === t ? '#dde3ed' : '#8896aa', border: `1px solid ${typeFilter === t ? '#2d3848' : 'transparent'}` }}
          >{t}</button>
        ))}
      </div>

      {/* City summary cards */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4 mb-6">{[...Array(6)].map((_, i) => <div key={i} className="card h-48 animate-pulse" style={{ background: '#161b23' }} />)}</div>
      ) : (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {citySummaries.map(city => (
            <Link key={city.city} href={`/space/${city.city.toLowerCase()}`} className="card hover:border-[#f97316] transition-all cursor-pointer group" style={{ textDecoration: 'none' }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold text-[#dde3ed] group-hover:text-[#f97316] transition-colors">{city.city}</div>
                  <div className="text-[11px] text-[#8896aa] mt-0.5">{city.count} centres · {(city.sqft / 1000).toFixed(0)}K sqft</div>
                </div>
                <span className="badge text-[10px]" style={{ background: `${occupancyColor(city.pct)}20`, color: occupancyColor(city.pct) }}>
                  {occupancyLabel(city.pct)}
                </span>
              </div>

              {/* Occupancy bar */}
              <div className="mb-2">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-[#8896aa]">Occupancy</span>
                  <span className="font-mono font-semibold" style={{ color: occupancyColor(city.pct) }}>{city.pct}%</span>
                </div>
                <div className="score-bar">
                  <div className="score-fill" style={{ width: `${city.pct}%`, background: occupancyColor(city.pct) }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] mb-3">
                <div><span className="text-[#4a5568]">Total seats: </span><span className="font-mono text-[#dde3ed]">{city.total.toLocaleString()}</span></div>
                <div><span className="text-[#4a5568]">Available: </span><span className="font-mono" style={{ color: '#38bdf8' }}>{city.available.toLocaleString()}</span></div>
                <div><span className="text-[#4a5568]">Rev/seat: </span><span className="font-mono text-[#f97316]">₹{city.revPerSeat.toLocaleString()}</span></div>
              </div>

              {/* Stacked mini bar */}
              <div className="flex h-2 rounded-full overflow-hidden">
                <div style={{ width: `${city.total > 0 ? city.occupied / city.total * 100 : 0}%`, background: '#34d399' }} />
                <div style={{ width: `${city.total > 0 ? city.available / city.total * 100 : 0}%`, background: '#38bdf8' }} />
                <div style={{ width: `${city.total > 0 ? city.nonUsable / city.total * 100 : 0}%`, background: '#f87171' }} />
              </div>
              <div className="flex gap-3 mt-1.5 text-[9px] text-[#4a5568]">
                <span>● Occupied</span><span>● Available</span><span>● Non-usable</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Bottom charts */}
      <div className="grid grid-cols-2 gap-5">
        {/* Stacked bar - utilization by city */}
        <div className="card">
          <div className="text-sm font-medium text-[#dde3ed] mb-1 flex items-center gap-1">
            Utilization by City
            <DataSourceTooltip metric="Utilization by City" source="centres table" method="SUM(occupied/available/non_usable seats) per city" confidence="High" refreshRate="Daily" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={utilData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="city" />
              <YAxis tickFormatter={v => `${v}%`} />
              <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
              <Legend />
              <Bar dataKey="Occupied" stackId="a" fill="#34d399" />
              <Bar dataKey="Available" stackId="a" fill="#38bdf8" />
              <Bar dataKey="NonUsable" stackId="a" fill="#f87171" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line chart - trend */}
        <div className="card">
          <div className="text-sm font-medium text-[#dde3ed] mb-1 flex items-center gap-1">
            Portfolio Occupancy Trend — Last 30 Days
            <DataSourceTooltip metric="Occupancy Trend" source="centre_snapshots table" method="SUM(occupied_seats) / SUM(total_seats) per day, all centres" confidence="High" refreshRate="Daily" />
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} />
              <YAxis tickFormatter={v => `${v}%`} domain={['auto', 'auto']} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Line type="monotone" dataKey="occupancy" stroke="#f97316" strokeWidth={2} dot={false} name="Portfolio Occupancy %" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <LastUpdated />
    </div>
  );
}
