'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DataSourceTooltip from '@/components/DataSourceTooltip';
import LastUpdated from '@/components/LastUpdated';
import ExportButton from '@/components/ExportButton';
import Link from 'next/link';

const CITIES = ['Bangalore', 'Mumbai', 'Gurugram', 'Hyderabad', 'Pune', 'Chennai'];

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
  lat: number;
  lng: number;
  snapshots?: { date: string; occupied_seats: number; available_seats: number; revenue: number }[];
}

interface Lead { id: number; company: string; seats_required: number; score: number; stage: string; contact_name: string; }

function occupancyColor(pct: number) {
  if (pct >= 85) return '#f87171';
  if (pct >= 70) return '#34d399';
  return '#38bdf8';
}
function occupancyLabel(pct: number) {
  if (pct >= 85) return 'Saturated';
  if (pct >= 70) return 'Healthy';
  return 'Activate';
}

const TYPE_COLORS: Record<string, string> = { 'IT Park': '#38bdf8', 'CBD': '#f97316', 'Premium': '#a78bfa', 'Emerging': '#fbbf24' };

// ─── Slide-over panel ───────────────────────────────────────
function SlideOver({ centre, leads, onClose }: { centre: Centre; leads: Lead[]; onClose: () => void }) {
  const [tab, setTab] = useState<'overview' | 'financials' | 'leads'>('overview');
  const occ = centre.total_seats > 0 ? Math.round(centre.occupied_seats / centre.total_seats * 100) : 0;
  const snaps = (centre.snapshots || []).slice(-30);
  const trendData = snaps.map(s => ({ date: s.date.slice(5), occ: centre.total_seats > 0 ? +(s.occupied_seats / centre.total_seats * 100).toFixed(1) : 0 }));
  const revTrend = snaps.map(s => ({ date: s.date.slice(5), rev: s.revenue }));

  // Seat mix (fake breakdown for presentation)
  const seatMix = [
    { name: 'Private Suites', value: Math.round(centre.total_seats * 0.35) },
    { name: 'Open Desks', value: Math.round(centre.total_seats * 0.50) },
    { name: 'Meeting Rooms', value: Math.round(centre.total_seats * 0.15) },
  ];
  const clientMix = [
    { name: 'Enterprise', value: Math.round(centre.occupied_seats * 0.45) },
    { name: 'Growth', value: Math.round(centre.occupied_seats * 0.35) },
    { name: 'SME', value: Math.round(centre.occupied_seats * 0.20) },
  ];
  const PIE_COLORS = ['#f97316', '#38bdf8', '#a78bfa'];

  return (
    <div className="slide-over open" style={{ padding: '0' }}>
      <div className="p-5 border-b border-[#1e2530] flex items-start justify-between">
        <div>
          <div className="font-semibold text-[#dde3ed]">{centre.name}</div>
          <div className="text-xs text-[#8896aa] mt-0.5">{centre.city} · {centre.centre_type}</div>
        </div>
        <button onClick={onClose} className="text-[#8896aa] hover:text-[#dde3ed] text-xl leading-none">×</button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1e2530]">
        {(['overview', 'financials', 'leads'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2.5 text-xs font-medium capitalize transition-colors"
            style={{ color: tab === t ? '#f97316' : '#8896aa', borderBottom: tab === t ? '2px solid #f97316' : '2px solid transparent' }}
          >{t}</button>
        ))}
      </div>

      <div className="p-5 overflow-y-auto" style={{ height: 'calc(100vh - 130px)' }}>
        {tab === 'overview' && (
          <div className="space-y-5">
            {/* Key metrics */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total Seats', value: centre.total_seats.toString(), tt: { metric: 'Total Seats', source: 'centres table', method: 'Static capacity from lease agreement', confidence: 'High' as const, refreshRate: 'On change' } },
                { label: 'Occupied', value: centre.occupied_seats.toString(), color: '#34d399', tt: { metric: 'Occupied Seats', source: 'centre_snapshots table', method: 'Latest occupied_seats count', confidence: 'High' as const, refreshRate: 'Daily' } },
                { label: 'Available', value: centre.available_seats.toString(), color: '#38bdf8', tt: { metric: 'Available Seats', source: 'centres table', method: 'total_seats - occupied_seats - non_usable_seats', confidence: 'High' as const, refreshRate: 'Daily' } },
                { label: 'Occupancy', value: `${occ}%`, color: occupancyColor(occ), tt: { metric: 'Occupancy %', source: 'centres table', method: 'occupied_seats / total_seats × 100', confidence: 'High' as const, refreshRate: 'Daily' } },
                { label: 'Sqft', value: `${(centre.sqft / 1000).toFixed(1)}K`, tt: { metric: 'Sqft', source: 'centres table — lease agreement', method: 'Recorded on lease signing, updated on expansion', confidence: 'High' as const, refreshRate: 'On change' } },
                { label: 'Rev/Seat', value: `₹${centre.revenue_per_seat.toLocaleString()}`, color: '#f97316', tt: { metric: 'Revenue per Seat', source: 'centres table', method: 'Total monthly revenue / occupied seats', confidence: 'High' as const, refreshRate: 'Monthly' } },
              ].map(m => (
                <div key={m.label} className="p-3 rounded-lg" style={{ background: '#161b23' }}>
                  <div className="text-[10px] text-[#4a5568] flex items-center gap-0.5 mb-1">
                    {m.label}
                    <DataSourceTooltip {...m.tt} />
                  </div>
                  <div className="font-mono font-semibold text-sm" style={{ color: m.color || '#dde3ed' }}>{m.value}</div>
                </div>
              ))}
            </div>

            {/* Seat mix donut */}
            <div>
              <div className="text-xs font-medium text-[#dde3ed] mb-2">Seat Mix</div>
              <div className="flex items-center gap-3">
                <ResponsiveContainer width="45%" height={100}>
                  <PieChart><Pie data={seatMix} dataKey="value" cx="50%" cy="50%" innerRadius={28} outerRadius={45}>
                    {seatMix.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie></PieChart>
                </ResponsiveContainer>
                <div className="space-y-1">
                  {seatMix.map((s, i) => <div key={s.name} className="flex items-center gap-1.5 text-[11px]"><div className="w-2 h-2 rounded-sm" style={{ background: PIE_COLORS[i] }} /><span className="text-[#8896aa]">{s.name}: </span><span className="font-mono text-[#dde3ed]">{s.value}</span></div>)}
                </div>
              </div>
            </div>

            {/* Client segment */}
            <div>
              <div className="text-xs font-medium text-[#dde3ed] mb-2">Client Segment</div>
              <ResponsiveContainer width="100%" height={80}>
                <BarChart data={clientMix} layout="vertical">
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 10 }} />
                  <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Occupancy trend */}
            <div>
              <div className="text-xs font-medium text-[#dde3ed] mb-2">Occupancy Trend — 30 Days</div>
              <ResponsiveContainer width="100%" height={100}>
                <LineChart data={trendData}>
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={4} />
                  <YAxis tickFormatter={v => `${v}%`} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Line type="monotone" dataKey="occ" stroke="#f97316" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {tab === 'financials' && (
          <div className="space-y-5">
            {/* Revenue metrics */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Monthly Revenue', value: `₹${(centre.occupied_seats * centre.revenue_per_seat / 100000).toFixed(1)}L` },
                { label: 'Revenue / Seat', value: `₹${centre.revenue_per_seat.toLocaleString()}` },
                { label: 'Avg Lease Duration', value: '18 mo' },
                { label: 'Renewals (30d)', value: Math.round(centre.occupied_seats * 0.08).toString(), color: '#fbbf24' },
                { label: 'Renewals (60d)', value: Math.round(centre.occupied_seats * 0.15).toString() },
                { label: 'Revenue at Risk', value: `₹${(Math.round(centre.occupied_seats * 0.08) * centre.revenue_per_seat / 100000).toFixed(1)}L`, color: '#f87171' },
              ].map(m => (
                <div key={m.label} className="p-3 rounded-lg" style={{ background: '#161b23' }}>
                  <div className="text-[10px] text-[#4a5568] mb-1">{m.label}</div>
                  <div className="font-mono font-semibold text-sm" style={{ color: m.color || '#34d399' }}>{m.value}</div>
                </div>
              ))}
            </div>

            <div>
              <div className="text-xs font-medium text-[#dde3ed] mb-2">Revenue Trend — 30 Days</div>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={revTrend}>
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={4} />
                  <YAxis tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
                  <Tooltip formatter={(v: number) => `₹${(v / 100000).toFixed(2)}L`} />
                  <Line type="monotone" dataKey="rev" stroke="#34d399" strokeWidth={1.5} dot={false} name="Daily Revenue" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {tab === 'leads' && (
          <div>
            <div className="text-xs text-[#8896aa] mb-3">Active leads targeting {centre.city}</div>
            {leads.length === 0 ? (
              <div className="text-[#4a5568] text-sm text-center py-8">No active leads for this city</div>
            ) : (
              <div className="space-y-2">
                {leads.map(l => (
                  <div key={l.id} className="p-3 rounded-lg border border-[#1e2530] hover:border-[#2d3848] transition-colors" style={{ background: '#161b23' }}>
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm text-[#dde3ed]">{l.company}</div>
                      <span className="font-mono text-xs" style={{ color: l.score >= 70 ? '#34d399' : l.score >= 45 ? '#fbbf24' : '#f87171' }}>{l.score}</span>
                    </div>
                    <div className="text-[11px] text-[#8896aa] mt-0.5">{l.contact_name} · {l.seats_required} seats · {l.stage}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────
export default function CityPage({ params }: { params: { city: string } }) {
  const router = useRouter();
  const cityName = params.city.charAt(0).toUpperCase() + params.city.slice(1);
  const [centres, setCentres] = useState<Centre[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Centre | null>(null);
  const [typeFilter, setTypeFilter] = useState('All');

  const load = useCallback(async () => {
    const [cRes, lRes] = await Promise.all([
      fetch(`/api/centres?city=${cityName}&snapshots=true`),
      fetch(`/api/leads?city=${cityName}&status=active`),
    ]);
    setCentres(await cRes.json());
    setLeads(await lRes.json());
    setLoading(false);
  }, [cityName]);

  useEffect(() => { load(); }, [load]);

  const filtered = centres.filter(c => typeFilter === 'All' || c.centre_type === typeFilter);

  const totalSqft    = centres.reduce((s, c) => s + c.sqft, 0);
  const totalSeats   = centres.reduce((s, c) => s + c.total_seats, 0);
  const totalOcc     = centres.reduce((s, c) => s + c.occupied_seats, 0);
  const totalAvail   = centres.reduce((s, c) => s + c.available_seats, 0);
  const totalNonUsable = centres.reduce((s, c) => s + (c.non_usable_seats || 0), 0);
  const avgRev       = centres.length ? Math.round(centres.reduce((s, c) => s + c.revenue_per_seat, 0) / centres.length) : 0;
  const avgOcc       = totalSeats > 0 ? Math.round(totalOcc / totalSeats * 100) : 0;

  return (
    <div className="p-6 page-enter flex" style={{ position: 'relative', minHeight: '100vh' }}>
      <div style={{ flex: 1, marginRight: selected ? '436px' : '0', transition: 'margin-right 0.3s ease' }}>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#8896aa] mb-4">
          <Link href="/space" className="hover:text-[#f97316] transition-colors">Portfolio</Link>
          <span>/</span>
          <span className="text-[#dde3ed]">{cityName}</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-semibold text-[#dde3ed] flex items-center gap-2">
                {cityName}
              </h1>
              <div className="text-xs text-[#8896aa] mt-0.5">{centres.length} centres · {(totalSqft / 1000).toFixed(0)}K sqft</div>
            </div>
            {/* City switcher */}
            <select
              value={cityName}
              onChange={e => router.push(`/space/${e.target.value.toLowerCase()}`)}
              className="text-xs rounded-md px-2.5 py-1.5 border outline-none cursor-pointer"
              style={{ background: '#161b23', borderColor: '#1e2530', color: '#8896aa' }}
            >
              {CITIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <ExportButton data={centres.map(c => ({ name: c.name, type: c.centre_type, sqft: c.sqft, seats: c.total_seats, occupied: c.occupied_seats, available: c.available_seats, rev_per_seat: c.revenue_per_seat }))} filename={`centres-${cityName.toLowerCase()}`} />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Centres', value: centres.length.toString() },
            { label: 'Avg Occupancy', value: `${avgOcc}%`, color: occupancyColor(avgOcc) },
            { label: 'Available Seats', value: totalAvail.toLocaleString(), color: '#38bdf8' },
            { label: 'Avg Rev/Seat', value: `₹${avgRev.toLocaleString()}`, color: '#f97316' },
          ].map(k => (
            <div key={k.label} className="card py-3 px-4">
              <div className="text-[10px] text-[#8896aa] mb-1">{k.label}</div>
              <div className="kpi-num text-xl font-semibold" style={{ color: k.color || '#dde3ed' }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* City-wide seat distribution bar */}
        {!loading && totalSeats > 0 && (
          <div className="card mb-4 p-3">
            <div className="flex items-center justify-between text-[10px] text-[#8896aa] mb-2">
              <span className="font-medium">Seat Distribution — {cityName}</span>
              <span className="font-mono text-[#4a5568]">{totalSeats.toLocaleString()} total seats</span>
            </div>
            <div className="flex h-7 rounded-lg overflow-hidden gap-px">
              {totalOcc > 0 && (
                <div
                  className="flex items-center justify-center text-[10px] text-white font-semibold transition-all"
                  style={{ width: `${(totalOcc / totalSeats) * 100}%`, background: '#34d399', minWidth: '24px' }}
                  title={`Occupied: ${totalOcc}`}
                >
                  {totalOcc > totalSeats * 0.12 && totalOcc}
                </div>
              )}
              {totalAvail > 0 && (
                <div
                  className="flex items-center justify-center text-[10px] text-white font-semibold transition-all"
                  style={{ width: `${(totalAvail / totalSeats) * 100}%`, background: '#38bdf8', minWidth: '24px' }}
                  title={`Available: ${totalAvail}`}
                >
                  {totalAvail > totalSeats * 0.12 && totalAvail}
                </div>
              )}
              {totalNonUsable > 0 && (
                <div
                  className="flex items-center justify-center text-[10px] text-[#4a5568] font-semibold transition-all"
                  style={{ width: `${(totalNonUsable / totalSeats) * 100}%`, background: '#1e2530', minWidth: '16px' }}
                  title={`Non-usable: ${totalNonUsable}`}
                />
              )}
            </div>
            <div className="flex gap-5 mt-2 text-[10px] text-[#8896aa]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#34d399' }} />
                Occupied <span className="font-mono text-[#dde3ed] ml-1">{totalOcc}</span>
                <span className="text-[#4a5568]">({Math.round(totalOcc / totalSeats * 100)}%)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#38bdf8' }} />
                Available <span className="font-mono text-[#dde3ed] ml-1">{totalAvail}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: '#1e2530' }} />
                Non-usable <span className="font-mono text-[#4a5568] ml-1">{totalNonUsable}</span>
              </span>
            </div>
          </div>
        )}

        {/* Type filter — dropdown */}
        <div className="flex items-center gap-2 mb-5">
          <span className="text-[10px] text-[#4a5568]">Type:</span>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="filter-sel text-xs rounded-md px-3 py-1.5 bg-[#161b23] border border-[#1e2530] text-[#dde3ed] outline-none"
          >
            {['All', 'IT Park', 'CBD', 'Premium', 'Emerging'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Centre cards grid */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <div key={i} className="card h-48 animate-pulse" style={{ background: '#161b23' }} />)}</div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filtered.map(centre => {
              const occ = centre.total_seats > 0 ? Math.round(centre.occupied_seats / centre.total_seats * 100) : 0;
              const isActive = selected?.id === centre.id;
              return (
                <div
                  key={centre.id}
                  className="card cursor-pointer transition-all hover:border-[#2d3848]"
                  style={{ borderColor: isActive ? '#f97316' : undefined, padding: '14px' }}
                  onClick={() => setSelected(isActive ? null : centre)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-sm text-[#dde3ed]">{centre.name}</div>
                      <span className="badge text-[10px] mt-0.5" style={{ background: `${TYPE_COLORS[centre.centre_type] || '#8896aa'}20`, color: TYPE_COLORS[centre.centre_type] || '#8896aa' }}>
                        {centre.centre_type}
                      </span>
                    </div>
                    <span className="badge text-[10px]" style={{ background: `${occupancyColor(occ)}20`, color: occupancyColor(occ) }}>
                      {occupancyLabel(occ)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] mb-2">
                    <div><span className="text-[#4a5568]">Sqft: </span><span className="font-mono text-[#dde3ed]">{(centre.sqft / 1000).toFixed(0)}K</span></div>
                    <div><span className="text-[#4a5568]">Occupancy: </span><span className="font-mono font-semibold" style={{ color: occupancyColor(occ) }}>{occ}%</span></div>
                    <div><span className="text-[#4a5568]">Occupied: </span><span className="font-mono" style={{ color: '#34d399' }}>{centre.occupied_seats}</span></div>
                    <div><span className="text-[#4a5568]">Available: </span><span className="font-mono" style={{ color: '#38bdf8' }}>{centre.available_seats}</span></div>
                    <div><span className="text-[#4a5568]">Total: </span><span className="font-mono text-[#dde3ed]">{centre.total_seats}</span></div>
                    <div><span className="text-[#4a5568]">Rev/seat: </span><span className="font-mono" style={{ color: '#f97316' }}>₹{centre.revenue_per_seat.toLocaleString()}</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <LastUpdated />
      </div>

      {/* Slide-over */}
      {selected && (
        <SlideOver
          centre={selected}
          leads={leads}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
