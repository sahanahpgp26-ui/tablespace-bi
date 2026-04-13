'use client';

import { useEffect, useState, useMemo } from 'react';
import KpiCard from '@/components/KpiCard';
import InsightCallout from '@/components/InsightCallout';
import ExportButton from '@/components/ExportButton';
import LastUpdated from '@/components/LastUpdated';
import DataSourceTooltip from '@/components/DataSourceTooltip';

interface Lead {
  id: number;
  company: string;
  contact_name: string;
  email: string;
  phone: string;
  city: string;
  seats_required: number;
  budget_per_seat: number;
  expected_revenue: number;
  close_date: string;
  account_type: string;
  industry: string;
  source: string;
  score: number;
  assigned_to: string;
  notes: string;
}

// ── Value-added services catalog ──────────────────────────────
const VAS_CATALOG = [
  { id: 'meeting_rooms', name: 'Meeting Room Credits', icon: '🏠', monthly: 15000, category: 'Space' },
  { id: 'it_support',   name: 'Dedicated IT Support', icon: '💻', monthly: 8000,  category: 'Tech' },
  { id: 'access_247',   name: '24×7 Building Access', icon: '🔑', monthly: 5000,  category: 'Access' },
  { id: 'event_space',  name: 'Event Space Credits',  icon: '🎭', monthly: 25000, category: 'Space' },
  { id: 'phone_booths', name: 'Phone Booth Package',  icon: '📞', monthly: 3000,  category: 'Space' },
  { id: 'lounge',       name: 'Premium Lounge Access',icon: '☕', monthly: 4000,  category: 'Amenity' },
  { id: 'reception',   name: 'Reception & Admin',    icon: '👋', monthly: 6000,  category: 'Admin' },
  { id: 'pantry',      name: 'Premium Pantry Plan',  icon: '🍱', monthly: 12000, category: 'Amenity' },
];

// ── Helpers ───────────────────────────────────────────────────
function hashCode(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
  return Math.abs(h);
}

function getAccountServices(company: string, seats: number, score: number) {
  const h = hashCode(company);
  const base = seats >= 150 ? 4 : seats >= 70 ? 3 : 2;
  const bonus = score > 70 ? 1 : 0;
  return VAS_CATALOG.filter((_, i) => (h >> i) & 1).slice(0, base + bonus);
}

function getMeetingRoomUsage(company: string): number {
  return 40 + (hashCode(company) % 56); // 40–95% meeting room adoption
}

function getDaysToRenewal(closeDate: string): number {
  if (!closeDate) return 180;
  const d = new Date(closeDate);
  d.setFullYear(d.getFullYear() + 1);
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

function computeUpsellScore(
  lead: Lead,
  services: typeof VAS_CATALOG,
  meetingRoomUsage: number,
  daysToRenewal: number,
): number {
  let s = 15;
  if ((lead.seats_required || 0) < 70) s += 22;
  else if ((lead.seats_required || 0) < 150) s += 12;
  if (daysToRenewal < 30)       s += 28;
  else if (daysToRenewal < 90)  s += 18;
  else if (daysToRenewal < 180) s += 8;
  if (meetingRoomUsage > 88) s += 18;
  else if (meetingRoomUsage > 80) s += 10;
  const gap = VAS_CATALOG.length - services.length;
  if (gap > 5) s += 12;
  else if (gap > 3) s += 7;
  const revPerSeat = (lead.seats_required || 0) > 0
    ? (lead.expected_revenue || 0) / 12 / lead.seats_required
    : 0;
  if (revPerSeat > 0 && revPerSeat < 8000) s += 14;
  return Math.min(100, Math.max(0, s));
}

function upsellTier(score: number): { label: string; color: string; icon: string } {
  if (score >= 70) return { label: 'Hot',   color: '#f97316', icon: '🔥' };
  if (score >= 45) return { label: 'Warm',  color: '#fbbf24', icon: '♦' };
  return               { label: 'Watch', color: '#38bdf8', icon: '👁' };
}

function fmtRevenue(n: number) {
  if (!n) return '₹0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

const AVATAR_COLORS: Record<string, string> = {
  'Rohan Kapoor': '#f97316', 'Priya Menon': '#38bdf8', 'Aditya Sharma': '#34d399',
  'Kavya Nair': '#a78bfa', 'Siddharth Rao': '#fbbf24', 'Divya Iyer': '#f43f5e',
};

function initials(name: string) {
  return name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
}

// ── Account Detail Modal ──────────────────────────────────────
function AccountModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const services        = getAccountServices(lead.company, lead.seats_required, lead.score);
  const untaken         = VAS_CATALOG.filter(s => !services.find(t => t.id === s.id));
  const meetingRoomUsage = getMeetingRoomUsage(lead.company);
  const daysToRenewal   = getDaysToRenewal(lead.close_date);
  const upsellScore     = computeUpsellScore(lead, services, meetingRoomUsage, daysToRenewal);
  const { label: usLabel, color: usColor, icon: usIcon } = upsellTier(upsellScore);
  const revPerSeat    = lead.seats_required > 0
    ? Math.round(lead.expected_revenue / 12 / lead.seats_required) : 0;
  const aColor = AVATAR_COLORS[lead.assigned_to] || '#8896aa';
  const vasPot = untaken.reduce((s, v) => s + v.monthly, 0) * 12;

  const signals: { text: string; color: string; level: string }[] = [];
  if (daysToRenewal >= 0 && daysToRenewal < 90)
    signals.push({ text: `Renewal in ${daysToRenewal} days`, color: daysToRenewal < 30 ? '#f87171' : '#fbbf24', level: daysToRenewal < 30 ? 'Critical' : 'Warning' });
  if (daysToRenewal < 0)
    signals.push({ text: `Renewal ${Math.abs(daysToRenewal)} days overdue`, color: '#f87171', level: 'Overdue' });
  if (meetingRoomUsage > 85)
    signals.push({ text: `${meetingRoomUsage}% meeting room usage — approaching capacity, expansion likely`, color: '#f87171', level: 'Capacity' });
  else if (meetingRoomUsage > 75)
    signals.push({ text: `${meetingRoomUsage}% meeting room usage — healthy, monitor for expansion trigger`, color: '#fbbf24', level: 'Watch' });
  if ((lead.seats_required || 0) < 70)
    signals.push({ text: 'Below Growth tier threshold — single upsell converts to higher-value contract', color: '#f97316', level: 'Opportunity' });
  else if ((lead.seats_required || 0) < 150)
    signals.push({ text: 'Below Enterprise tier — expansion path is commercially significant', color: '#f97316', level: 'Opportunity' });
  if (revPerSeat > 0 && revPerSeat < 8000)
    signals.push({ text: `Paying ₹${revPerSeat.toLocaleString()}/seat/mo — ₹${(8000 - revPerSeat).toLocaleString()} below market floor; pricing uplift conversation warranted`, color: '#a78bfa', level: 'Revenue' });
  if (untaken.length > 3)
    signals.push({ text: `${untaken.length} value-added services not activated — service attach rate below peer average`, color: '#38bdf8', level: 'Attach Rate' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)' }} onClick={onClose}>
      <div className="card w-full max-w-2xl max-h-[92vh] overflow-y-auto animate-fade-in"
        style={{ borderRadius: '12px' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between mb-5 pb-4 border-b border-[#1e2530]">
          <div>
            <h2 className="text-xl font-semibold text-[#dde3ed]">{lead.company}</h2>
            <div className="text-xs text-[#8896aa] mt-0.5">{lead.contact_name} · {lead.industry} · {lead.city}</div>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                style={{ background: aColor, color: '#080d14' }}>{initials(lead.assigned_to)}</div>
              <span className="text-[11px] text-[#8896aa]">{lead.assigned_to}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="font-mono font-bold text-3xl" style={{ color: usColor }}>{upsellScore}</div>
              <div className="text-[10px] font-medium" style={{ color: usColor }}>{usIcon} {usLabel} Upsell</div>
            </div>
            <button onClick={onClose} className="text-[#8896aa] hover:text-[#dde3ed] text-xl leading-none">×</button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Annual Contract Value', value: fmtRevenue(lead.expected_revenue), color: '#34d399' },
            { label: 'Seats Contracted', value: (lead.seats_required || 0).toString(), color: '#dde3ed' },
            { label: 'Rev / Seat / Month', value: revPerSeat > 0 ? `₹${revPerSeat.toLocaleString()}` : '—', color: revPerSeat > 0 && revPerSeat < 8000 ? '#f87171' : '#f97316' },
            { label: 'Meeting Room Usage', value: `${meetingRoomUsage}%`, color: meetingRoomUsage > 85 ? '#f87171' : meetingRoomUsage > 75 ? '#fbbf24' : '#34d399' },
          ].map(m => (
            <div key={m.label} className="rounded-lg p-3" style={{ background: '#161b23' }}>
              <div className="text-[10px] text-[#4a5568] mb-0.5">{m.label}</div>
              <div className="font-mono font-bold text-base" style={{ color: m.color }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Account Signals row */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <div className="flex-1 rounded-lg p-2.5" style={{ background: '#161b23', minWidth: '110px' }}>
            <div className="text-[9px] text-[#4a5568] mb-0.5">Meeting Room Usage</div>
            <div className="font-mono font-bold text-sm" style={{ color: meetingRoomUsage > 85 ? '#f87171' : meetingRoomUsage > 75 ? '#fbbf24' : '#34d399' }}>{meetingRoomUsage}%</div>
          </div>
          <div className="flex-1 rounded-lg p-2.5" style={{ background: '#161b23', minWidth: '110px' }}>
            <div className="text-[9px] text-[#4a5568] mb-0.5">Last Renewal</div>
            <div className="font-mono font-bold text-sm text-[#8896aa]">
              {lead.close_date ? (() => { const months = Math.max(0, Math.floor((Date.now() - new Date(lead.close_date).getTime()) / (1000 * 60 * 60 * 24 * 30))); return months === 0 ? 'This month' : `${months}mo ago`; })() : '—'}
            </div>
          </div>
          <div className="flex-1 rounded-lg p-2.5" style={{ background: '#161b23', minWidth: '110px' }}>
            <div className="text-[9px] text-[#4a5568] mb-0.5">Growth Signal</div>
            <div className="font-mono font-bold text-sm" style={{ color: upsellScore >= 70 ? '#f97316' : upsellScore >= 45 ? '#fbbf24' : '#38bdf8' }}>
              {upsellScore >= 70 ? 'Expanding' : upsellScore >= 45 ? 'Stable' : 'Risk'}
            </div>
          </div>
        </div>

        {/* Renewal */}
        <div className="p-3 rounded-lg mb-4" style={{
          background: daysToRenewal < 30 ? 'rgba(248,113,113,0.07)' : daysToRenewal < 90 ? 'rgba(251,191,36,0.07)' : 'rgba(52,211,153,0.05)',
          border: `1px solid ${daysToRenewal < 30 ? '#f8717130' : daysToRenewal < 90 ? '#fbbf2430' : '#34d39920'}`,
        }}>
          <div className="flex items-center justify-between mb-0.5">
            <div className="text-xs font-medium text-[#dde3ed]">Renewal Window</div>
            <div className="font-mono font-bold" style={{ color: daysToRenewal < 30 ? '#f87171' : daysToRenewal < 90 ? '#fbbf24' : '#34d399' }}>
              {daysToRenewal < 0 ? `${Math.abs(daysToRenewal)}d overdue` : `${daysToRenewal} days`}
            </div>
          </div>
          <div className="text-[10px] text-[#4a5568]">
            {daysToRenewal < 30 ? '🚨 Initiate renewal conversation immediately — risk of churn'
              : daysToRenewal < 90 ? '⚡ Start renewal process this week — include upsell proposal'
              : '✓ On track — schedule 90-day check-in with expansion discussion'}
          </div>
        </div>

        {/* Services */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-[#dde3ed] mb-3">Value-Added Services</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] text-[#4a5568] mb-2">Active ({services.length})</div>
              <div className="space-y-1.5">
                {services.map(sv => (
                  <div key={sv.id} className="flex items-center justify-between rounded p-2"
                    style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
                    <span className="text-[11px] text-[#dde3ed]">{sv.icon} {sv.name}</span>
                    <span className="text-[10px] font-mono text-[#34d399]">₹{sv.monthly.toLocaleString()}/mo</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#4a5568] mb-2">Upsell Opportunities ({untaken.length})</div>
              <div className="space-y-1.5">
                {untaken.map(sv => (
                  <div key={sv.id} className="flex items-center justify-between rounded p-2"
                    style={{ background: '#161b23', border: '1px solid #1e2530' }}>
                    <span className="text-[11px] text-[#8896aa]">{sv.icon} {sv.name}</span>
                    <span className="text-[10px] font-mono text-[#4a5568]">₹{sv.monthly.toLocaleString()}/mo</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-2 p-2.5 rounded text-[11px]"
            style={{ background: 'rgba(249,115,22,0.07)', border: '1px solid rgba(249,115,22,0.2)' }}>
            <span className="text-[#f97316] font-semibold">Untapped VAS: </span>
            <span className="text-[#dde3ed] font-mono">{fmtRevenue(vasPot)}/yr</span>
            <span className="text-[#4a5568] ml-2">if all unactivated services added</span>
          </div>
        </div>

        {/* Action signals */}
        {signals.length > 0 && (
          <div className="mb-4">
            <div className="text-xs font-semibold text-[#dde3ed] mb-2">Action Signals</div>
            <div className="space-y-1.5">
              {signals.map((sig, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: '#161b23' }}>
                  <div className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ background: sig.color }} />
                  <div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded mr-1.5 font-medium" style={{ background: `${sig.color}18`, color: sig.color }}>
                      {sig.level}
                    </span>
                    <span className="text-[11px]" style={{ color: '#dde3ed' }}>{sig.text}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {lead.notes && (
          <div className="p-3 rounded-lg mb-4 text-[11px] text-[#8896aa]" style={{ background: '#161b23' }}>
            <div className="text-[10px] text-[#4a5568] mb-1">Account Notes</div>
            {lead.notes}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button className="flex-1 py-2 rounded-md text-xs font-medium text-white" style={{ background: '#f97316' }}>
            + Expansion Proposal
          </button>
          <button className="flex-1 py-2 rounded-md text-xs border border-[#1e2530] text-[#8896aa] hover:text-[#dde3ed] hover:border-[#2d3848] transition-colors">
            Add Services
          </button>
          <button className="flex-1 py-2 rounded-md text-xs border border-[#1e2530] text-[#8896aa] hover:text-[#38bdf8] hover:border-[rgba(56,189,248,0.3)] transition-colors">
            Schedule Renewal
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Upsell Score breakdown tooltip ───────────────────────────
function ScoreBreakdown({ lead, services, meetingRoomUsage, daysToRenewal }: {
  lead: Lead; services: typeof VAS_CATALOG; meetingRoomUsage: number; daysToRenewal: number;
}) {
  const items = [
    { label: 'Base',                   pts: 15 },
    { label: 'Tier headroom',          pts: (lead.seats_required || 0) < 70 ? 22 : (lead.seats_required || 0) < 150 ? 12 : 0 },
    { label: 'Renewal proximity',      pts: daysToRenewal < 30 ? 28 : daysToRenewal < 90 ? 18 : daysToRenewal < 180 ? 8 : 0 },
    { label: 'Meeting room adoption',  pts: meetingRoomUsage > 88 ? 18 : meetingRoomUsage > 80 ? 10 : 0 },
    { label: 'Service gap',            pts: (VAS_CATALOG.length - services.length) > 5 ? 12 : (VAS_CATALOG.length - services.length) > 3 ? 7 : 0 },
    { label: 'Pricing delta',          pts: (() => { const r = (lead.seats_required || 0) > 0 ? (lead.expected_revenue || 0) / 12 / lead.seats_required : 0; return r > 0 && r < 8000 ? 14 : 0; })() },
  ].filter(i => i.pts > 0);
  return (
    <div className="absolute bottom-full left-0 mb-1 z-30 w-44 p-2 rounded-lg shadow-xl text-[10px]"
      style={{ background: '#0f1318', border: '1px solid #2d3848' }}>
      <div className="text-[#8896aa] mb-1 font-medium">Score breakdown</div>
      {items.map(it => (
        <div key={it.label} className="flex justify-between text-[#4a5568]">
          <span>{it.label}</span><span className="text-[#f97316]">+{it.pts}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function AccountsPage() {
  const [leads, setLeads]       = useState<Lead[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [sortBy, setSortBy]     = useState<'upsell' | 'acv' | 'renewal' | 'meetingroom'>('upsell');
  const [cityFilter, setCityFilter] = useState('All');
  const [quarterFilter, setQuarterFilter] = useState<string[]>(['all']);
  const [hoverScore, setHoverScore] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/leads?status=won').then(r => r.json()).then(d => { setLeads(d); setLoading(false); });
  }, []);

  function getQuarterLabel(dateStr: string) {
    const d = new Date(dateStr);
    const q = Math.ceil((d.getMonth() + 1) / 3);
    return `Q${q} ${d.getFullYear()}`;
  }

  function getLast4Quarters(): string[] {
    const now = new Date();
    const quarters: string[] = [];
    let year = now.getFullYear();
    let q = Math.ceil((now.getMonth() + 1) / 3);
    for (let i = 0; i < 4; i++) {
      quarters.push(`Q${q} ${year}`);
      q--;
      if (q < 1) { q = 4; year--; }
    }
    return quarters;
  }

  const enriched = useMemo(() => leads.map(lead => {
    const services         = getAccountServices(lead.company, lead.seats_required, lead.score);
    const meetingRoomUsage = getMeetingRoomUsage(lead.company);
    const daysToRenewal    = getDaysToRenewal(lead.close_date);
    const upsellScore      = computeUpsellScore(lead, services, meetingRoomUsage, daysToRenewal);
    const tier             = upsellTier(upsellScore);
    const revPerSeat       = (lead.seats_required || 0) > 0
      ? Math.round((lead.expected_revenue || 0) / 12 / lead.seats_required) : 0;
    const vasPotential     = VAS_CATALOG.filter(s => !services.find(t => t.id === s.id))
      .reduce((s, v) => s + v.monthly, 0) * 12;
    const quarterLabel     = lead.close_date ? getQuarterLabel(lead.close_date) : '';
    return { ...lead, services, meetingRoomUsage, daysToRenewal, upsellScore, ...tier, revPerSeat, vasPotential, quarterLabel };
  }), [leads]);

  const filtered = useMemo(() => {
    let list = cityFilter === 'All' ? enriched : enriched.filter(a => a.city === cityFilter);
    if (!quarterFilter.includes('all') && quarterFilter.length > 0) {
      list = list.filter(a => quarterFilter.includes(a.quarterLabel));
    }
    return [...list].sort((a, b) => {
      if (sortBy === 'upsell')      return b.upsellScore - a.upsellScore;
      if (sortBy === 'acv')         return (b.expected_revenue || 0) - (a.expected_revenue || 0);
      if (sortBy === 'renewal')     return a.daysToRenewal - b.daysToRenewal;
      if (sortBy === 'meetingroom') return b.meetingRoomUsage - a.meetingRoomUsage;
      return 0;
    });
  }, [enriched, cityFilter, quarterFilter, sortBy]);

  const totalACV       = enriched.reduce((s, a) => s + (a.expected_revenue || 0), 0);
  const avgUpsell      = enriched.length ? Math.round(enriched.reduce((s, a) => s + a.upsellScore, 0) / enriched.length) : 0;
  const renewalSoon    = enriched.filter(a => a.daysToRenewal >= 0 && a.daysToRenewal < 90);
  const hotAccounts    = enriched.filter(a => a.upsellScore >= 70).length;
  const totalVasPot    = enriched.reduce((s, a) => s + a.vasPotential, 0);
  const cities         = ['All', ...Array.from(new Set(enriched.map(a => a.city))).sort()];

  const insight = enriched.length > 0
    ? `${hotAccounts} accounts are hot upsell candidates (score ≥ 70). ${renewalSoon.length} renewals due in 90 days worth ${fmtRevenue(renewalSoon.reduce((s, a) => s + (a.expected_revenue || 0), 0))} ACV. Total untapped VAS revenue across portfolio: ${fmtRevenue(totalVasPot)}/yr.`
    : 'No closed accounts yet. Win deals in Pipeline → Closed Won to see them here.';

  if (loading) return (
    <div className="p-6">
      <div className="grid grid-cols-5 gap-3 mb-5">{[...Array(5)].map((_, i) => <div key={i} className="card h-24 animate-pulse" style={{ background: '#161b23' }} />)}</div>
      <div className="grid grid-cols-2 gap-4">{[...Array(6)].map((_, i) => <div key={i} className="card h-52 animate-pulse" style={{ background: '#161b23' }} />)}</div>
    </div>
  );

  return (
    <div className="p-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs text-[#8896aa] mb-1">Accounts</div>
          <h1 className="text-xl font-semibold text-[#dde3ed]">Existing Accounts</h1>
          <div className="text-xs text-[#8896aa] mt-0.5">
            Cross-sell & upsell intelligence · {enriched.length} closed accounts
          </div>
        </div>
        <ExportButton
          data={enriched.map(a => ({ company: a.company, city: a.city, seats: a.seats_required, acv: a.expected_revenue, rev_per_seat: a.revPerSeat, upsell_score: a.upsellScore, days_to_renewal: a.daysToRenewal, meeting_room_usage: a.meetingRoomUsage, vas_potential: a.vasPotential, services_count: a.services.length }))}
          filename="accounts"
        />
      </div>

      <InsightCallout insight={insight} />

      {/* KPI Row */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        <KpiCard label="Total Managed ACV" value={fmtRevenue(totalACV)} color="#34d399"
          tooltip={{ metric: 'Total ACV', source: 'leads table', method: 'SUM(expected_revenue) WHERE status=won', confidence: 'High', refreshRate: 'Real-time' }} />
        <KpiCard label="Avg Upsell Score" value={avgUpsell.toString()} sub="0–100 composite"
          color={avgUpsell >= 70 ? '#f97316' : '#fbbf24'}
          tooltip={{ metric: 'Avg Upsell Score', source: 'Computed: renewal proximity + utilization + tier headroom + service gaps + pricing delta', method: 'Composite 0–100; above 70 = hot upsell candidate', confidence: 'Estimated', refreshRate: 'Real-time' }} />
        <KpiCard label="🔥 Hot Upsell Accounts" value={hotAccounts.toString()} sub="Score ≥ 70" color="#f97316"
          tooltip={{ metric: 'Hot Accounts', source: 'Computed upsell scores', method: 'COUNT WHERE upsell_score >= 70', confidence: 'Estimated', refreshRate: 'Real-time' }} />
        <KpiCard label="Renewals in 90 Days" value={renewalSoon.length.toString()}
          sub={fmtRevenue(renewalSoon.reduce((s, a) => s + (a.expected_revenue || 0), 0)) + ' at risk'}
          color={renewalSoon.length > 3 ? '#f87171' : '#fbbf24'}
          tooltip={{ metric: 'Upcoming Renewals', source: 'leads.close_date + 365d', method: 'COUNT WHERE renewal_date < now + 90d AND status=won', confidence: 'Medium', refreshRate: 'Real-time' }} />
        <KpiCard label="Untapped VAS Revenue" value={fmtRevenue(totalVasPot)} sub="/yr if all activated" color="#a78bfa"
          tooltip={{ metric: 'VAS Potential', source: 'VAS catalog × service gaps per account', method: 'SUM of monthly prices for all unactivated services × 12, across all accounts', confidence: 'Estimated', refreshRate: 'Real-time' }} />
      </div>

      {/* Scoring methodology banner */}
      <div className="card mb-5 p-3 border-l-2" style={{ borderLeftColor: '#a78bfa' }}>
        <div className="text-xs font-semibold text-[#dde3ed] mb-1">📊 Upsell Score Methodology</div>
        <div className="flex gap-4 flex-wrap">
          {[
            { signal: 'Renewal proximity', weight: '28 pts', desc: '<30 days = highest urgency' },
            { signal: 'Tier headroom', weight: '22 pts', desc: 'seats below Growth/Enterprise threshold' },
            { signal: 'Meeting room adoption', weight: '18 pts', desc: '>88% = expansion pressure imminent' },
            { signal: 'Service attach gap', weight: '12 pts', desc: 'popular VAS not yet activated' },
            { signal: 'Pricing delta', weight: '14 pts', desc: 'paying below ₹8,000/seat floor' },
          ].map(s => (
            <div key={s.signal} className="text-[10px]">
              <span className="text-[#a78bfa] font-medium">{s.signal}</span>
              <span className="text-[#4a5568] ml-1">({s.weight})</span>
              <span className="text-[#4a5568] ml-1">— {s.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quarter filter */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-[10px] text-[#4a5568]">Quarter:</span>
        {(['all', ...getLast4Quarters()] as const).map(q => {
          const active = q === 'all' ? quarterFilter.includes('all') : quarterFilter.includes(q as string);
          return (
            <button key={q} onClick={() => {
              if (q === 'all') { setQuarterFilter(['all']); return; }
              setQuarterFilter(prev => {
                const without = prev.filter(x => x !== 'all');
                if (without.includes(q as string)) {
                  const next = without.filter(x => x !== q);
                  return next.length === 0 ? ['all'] : next;
                }
                return [...without, q as string];
              });
            }}
              className="px-2.5 py-1 rounded text-xs transition-all"
              style={{ background: active ? 'rgba(56,189,248,0.15)' : '#161b23', color: active ? '#38bdf8' : '#8896aa', border: `1px solid ${active ? 'rgba(56,189,248,0.4)' : '#1e2530'}` }}
            >{q === 'all' ? 'All' : q}</button>
          );
        })}
      </div>

      {/* Filters + sort */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex gap-1">
          {cities.map(c => (
            <button key={c} onClick={() => setCityFilter(c)}
              className="px-2.5 py-1 rounded text-xs transition-all"
              style={{ background: cityFilter === c ? 'rgba(249,115,22,0.15)' : '#161b23', color: cityFilter === c ? '#f97316' : '#8896aa', border: `1px solid ${cityFilter === c ? 'rgba(249,115,22,0.4)' : '#1e2530'}` }}
            >{c}</button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1 text-xs text-[#4a5568]">
          Sort:
          {([['upsell','🔥 Upsell'],['acv','₹ ACV'],['renewal','⏰ Renewal'],['meetingroom','🏠 Rooms']] as const).map(([k, lbl]) => (
            <button key={k} onClick={() => setSortBy(k as 'upsell' | 'acv' | 'renewal' | 'meetingroom')}
              className="px-2 py-1 rounded text-xs"
              style={{ background: sortBy === k ? 'rgba(249,115,22,0.12)' : 'transparent', color: sortBy === k ? '#f97316' : '#8896aa', border: `1px solid ${sortBy === k ? 'rgba(249,115,22,0.3)' : 'transparent'}` }}
            >{lbl}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="text-5xl mb-3">🏢</div>
          <div className="text-[#8896aa] font-medium mb-1">No closed accounts yet</div>
          <div className="text-[#4a5568] text-xs">Move leads to Closed Won in Pipeline to track them here</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map(account => {
            const aColor = AVATAR_COLORS[account.assigned_to] || '#8896aa';
            const renewalUrgent = account.daysToRenewal >= 0 && account.daysToRenewal < 90;

            return (
              <div
                key={account.id}
                onClick={() => setSelected(account)}
                className="card cursor-pointer hover:border-[#2d3848] transition-all"
                style={{ borderRadius: '10px', borderColor: account.upsellScore >= 70 ? 'rgba(249,115,22,0.3)' : undefined }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0 mr-2">
                    <div className="font-semibold text-[#dde3ed] truncate">{account.company}</div>
                    <div className="text-[11px] text-[#8896aa] mt-0.5">{account.contact_name} · {account.city} · {account.industry}</div>
                  </div>
                  <div className="text-right shrink-0 relative"
                    onMouseEnter={() => setHoverScore(account.id)}
                    onMouseLeave={() => setHoverScore(null)}>
                    <div className="font-mono font-bold text-xl cursor-help" style={{ color: account.color }}>{account.upsellScore}</div>
                    <div className="text-[9px]" style={{ color: account.color }}>{account.icon} {account.label}</div>
                    {hoverScore === account.id && (
                      <ScoreBreakdown lead={account} services={account.services} meetingRoomUsage={account.meetingRoomUsage} daysToRenewal={account.daysToRenewal} />
                    )}
                  </div>
                </div>

                {/* KPI grid */}
                <div className="grid grid-cols-4 gap-1.5 mb-3">
                  {[
                    { l: 'ACV',       v: fmtRevenue(account.expected_revenue),                                                                    c: '#34d399' },
                    { l: 'Seats',     v: (account.seats_required || 0).toString(),                                                                 c: '#dde3ed' },
                    { l: '₹/seat/mo', v: account.revPerSeat > 0 ? `₹${Math.round(account.revPerSeat/1000)}k` : '—',                              c: account.revPerSeat > 0 && account.revPerSeat < 8000 ? '#f87171' : '#f97316' },
                    { l: 'Renewal',   v: account.daysToRenewal < 0 ? 'Overdue' : `${account.daysToRenewal}d`,                                    c: renewalUrgent ? '#f87171' : '#8896aa' },
                  ].map(m => (
                    <div key={m.l} className="rounded p-1.5" style={{ background: '#161b23' }}>
                      <div className="text-[9px] text-[#4a5568]">{m.l}</div>
                      <div className="font-mono text-[11px] font-semibold" style={{ color: m.c }}>{m.v}</div>
                    </div>
                  ))}
                </div>

                {/* Metric chips */}
                <div className="flex gap-1.5 mb-3">
                  <div className="flex-1 rounded p-1.5" style={{ background: '#161b23' }}>
                    <div className="text-[9px] text-[#4a5568]">Mtg Rooms</div>
                    <div className="font-mono text-[10px] font-semibold" style={{ color: account.meetingRoomUsage > 85 ? '#f87171' : account.meetingRoomUsage > 70 ? '#fbbf24' : '#34d399' }}>{account.meetingRoomUsage}%</div>
                  </div>
                  <div className="flex-1 rounded p-1.5" style={{ background: '#161b23' }}>
                    <div className="text-[9px] text-[#4a5568]">Last Renewal</div>
                    <div className="font-mono text-[10px] font-semibold text-[#8896aa]">{account.close_date ? (() => { const m = Math.max(0, Math.floor((Date.now() - new Date(account.close_date).getTime()) / (1000 * 60 * 60 * 24 * 30))); return m === 0 ? 'This mo' : `${m}mo ago`; })() : '—'}</div>
                  </div>
                  <div className="flex-1 rounded p-1.5" style={{ background: '#161b23' }}>
                    <div className="text-[9px] text-[#4a5568]">Growth</div>
                    <div className="font-mono text-[10px] font-semibold" style={{ color: account.upsellScore >= 70 ? '#f97316' : account.upsellScore >= 45 ? '#fbbf24' : '#38bdf8' }}>
                      {account.upsellScore >= 70 ? 'Expanding' : account.upsellScore >= 45 ? 'Stable' : 'Risk'}
                    </div>
                  </div>
                </div>

                {/* Services chips */}
                <div className="flex items-center gap-1.5 flex-wrap mb-3">
                  {account.services.slice(0, 3).map(s => (
                    <span key={s.id} className="text-[9px] px-1.5 py-0.5 rounded-full"
                      style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>
                      {s.icon} {s.name.split(' ')[0]}
                    </span>
                  ))}
                  {account.services.length > 3 && (
                    <span className="text-[9px] text-[#4a5568]">+{account.services.length - 3}</span>
                  )}
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full ml-auto"
                    style={{ background: 'rgba(249,115,22,0.08)', color: '#f97316' }}>
                    +{VAS_CATALOG.length - account.services.length} upsell
                  </span>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-[#1e2530]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center text-[7px] font-bold"
                      style={{ background: aColor, color: '#080d14' }}>{initials(account.assigned_to)}</div>
                    <span className="text-[10px] text-[#4a5568]">{account.assigned_to?.split(' ')[0]}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {account.quarterLabel && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: '#1e2530', color: '#4a5568' }}>{account.quarterLabel}</span>
                    )}
                    <div className="text-[9px] text-[#4a5568]">
                      VAS: <span className="font-mono" style={{ color: '#a78bfa' }}>{fmtRevenue(account.vasPotential)}/yr</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <LastUpdated />
      {selected && <AccountModal lead={selected as Lead} onClose={() => setSelected(null)} />}
    </div>
  );
}
