'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, RefreshCw, Filter, AlertCircle, Clock, Edit2, Check, X, GripVertical, ChevronDown } from 'lucide-react';
import ExportButton from '@/components/ExportButton';
import LastUpdated from '@/components/LastUpdated';
import InsightCallout from '@/components/InsightCallout';
import Link from 'next/link';

// ── Consolidated kanban columns: 10 DB stages → 6 visual columns ─
const KANBAN_COLUMNS = [
  { key: 'Qualifying',  label: 'Qualifying',  color: '#38bdf8', prob: 20,
    dbStage: 'Qualification',        dbStages: ['Prospecting','Qualification'] },
  { key: 'Discovery',   label: 'Discovery',   color: '#a78bfa', prob: 35,
    dbStage: 'Needs Analysis',       dbStages: ['Needs Analysis','Value Proposition','Id. Decision Makers','Perception Analysis'] },
  { key: 'Proposal',    label: 'Proposal',    color: '#fbbf24', prob: 65,
    dbStage: 'Proposal/Price Quote', dbStages: ['Proposal/Price Quote'] },
  { key: 'Negotiation', label: 'Negotiation', color: '#f97316', prob: 80,
    dbStage: 'Negotiation/Review',   dbStages: ['Negotiation/Review'] },
  { key: 'Closed Won',  label: 'Closed Won',  color: '#34d399', prob: 100,
    dbStage: 'Closed Won',           dbStages: ['Closed Won'] },
  { key: 'Closed Lost', label: 'Closed Lost', color: '#f43f5e', prob: 0,
    dbStage: 'Closed Lost',          dbStages: ['Closed Lost'] },
];

// Per-DB-stage probabilities (used on individual lead cards)
const DB_STAGE_PROB: Record<string, number> = {
  'Prospecting': 10, 'Qualification': 20, 'Needs Analysis': 25,
  'Value Proposition': 35, 'Id. Decision Makers': 40, 'Perception Analysis': 50,
  'Proposal/Price Quote': 65, 'Negotiation/Review': 80, 'Closed Won': 100, 'Closed Lost': 0,
};

// Kanban column prob (for column weighted totals)
const STAGE_PROB: Record<string, number> = Object.fromEntries(KANBAN_COLUMNS.map(c => [c.key, c.prob]));

// All DB stage names (for modal stage picker)
const ALL_STAGES_DB = [
  'Prospecting','Qualification','Needs Analysis','Value Proposition',
  'Id. Decision Makers','Perception Analysis','Proposal/Price Quote',
  'Negotiation/Review','Closed Won','Closed Lost',
];

// Map DB stage → kanban column key
function mapStageToColumn(dbStage: string): string {
  for (const col of KANBAN_COLUMNS) {
    if (col.dbStages.includes(dbStage)) return col.key;
  }
  return 'Qualifying';
}

// Account type descriptions (seats-based)
const ACCOUNT_TYPE_DESC: Record<string, string> = {
  'Enterprise': 'Companies requiring 150+ seats — large corporates, MNCs, global captives',
  'Growth':     'Scaling companies requiring 70–150 seats — funded startups, regional offices, mid-size firms',
  'SME':        'Small & medium businesses requiring <70 seats — boutique firms, early-stage startups',
};

interface Lead {
  id: number;
  company: string;
  contact_name: string;
  city: string;
  stage: string;
  score: number;
  source: string;
  seats_required: number;
  expected_revenue: number;
  close_date: string;
  account_type: string;
  industry: string;
  status: string;
  notes: string;
  assigned_to: string;
  probability: number;
  created_at: string;
  last_activity: string | null;
}

function scoreColor(score: number) {
  if (score >= 70) return '#34d399';
  if (score >= 45) return '#fbbf24';
  return '#f87171';
}

function fmtRevenue(n: number) {
  if (!n) return '₹0';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

function daysTill(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

function daysSince(dateStr: string | null) {
  if (!dateStr) return 999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function initials(name: string) {
  return name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
}

const AVATAR_COLORS: Record<string, string> = {
  'Rohan Kapoor': '#f97316', 'Priya Menon': '#38bdf8', 'Aditya Sharma': '#34d399',
  'Kavya Nair': '#a78bfa', 'Siddharth Rao': '#fbbf24', 'Divya Iyer': '#f43f5e',
};

const ALL_REPS = ['Rohan Kapoor', 'Priya Menon', 'Aditya Sharma', 'Kavya Nair', 'Siddharth Rao', 'Divya Iyer'];

// ── Subscribe Modal ───────────────────────────────────────────
function SubscribeModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [freq, setFreq] = useState('daily');
  const [saved, setSaved] = useState(false);

  function handleSave() {
    if (!email.includes('@')) return;
    setSaved(true);
    setTimeout(onClose, 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="card w-full max-w-sm animate-fade-in" style={{ borderRadius: '12px' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-[#dde3ed]">Subscribe to Pipeline Report</h2>
            <div className="text-xs text-[#8896aa] mt-0.5">Receive pipeline updates via email</div>
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
              <label className="text-xs text-[#8896aa] block mb-1.5">Frequency</label>
              <div className="flex gap-2">
                {['daily','weekly','on change'].map(f => (
                  <button key={f} onClick={() => setFreq(f)}
                    className="flex-1 py-1.5 rounded text-xs capitalize border transition-colors"
                    style={{
                      background: freq === f ? 'rgba(249,115,22,0.15)' : '#161b23',
                      color:      freq === f ? '#f97316' : '#8896aa',
                      border:     `1px solid ${freq === f ? 'rgba(249,115,22,0.4)' : '#1e2530'}`,
                    }}
                  >{f}</button>
                ))}
              </div>
            </div>
            <button onClick={handleSave}
              className="w-full py-2 rounded-md text-sm font-medium text-white"
              style={{ background: '#f97316' }}
            >Subscribe</button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Inline-editable Lead Card ─────────────────────────────────
function LeadCard({
  lead, isDragging, onDragStart, onDragEnd, onClick, onUpdate, onAssign,
}: {
  lead: Lead;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onClick: () => void;
  onUpdate: (id: number, field: string, value: string | number) => void;
  onAssign: (id: number, rep: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draftCompany, setDraftCompany] = useState(lead.company);
  const [draftScore, setDraftScore]     = useState(lead.score);
  const [draftDate, setDraftDate]       = useState(lead.close_date?.split('T')[0] ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  const days    = daysTill(lead.close_date);
  const overdue = days < 0;
  const urgent  = days >= 0 && days <= 7;
  const aColor  = AVATAR_COLORS[lead.assigned_to] || '#8896aa';
  const prob    = DB_STAGE_PROB[lead.stage] ?? lead.probability ?? 10;
  const expectedWeighted = (lead.expected_revenue * prob) / 100;
  const stale   = daysSince(lead.last_activity) >= 15;
  const [showAssignMenu, setShowAssignMenu] = useState(false);

  function startEdit(field: string, e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(field);
    setTimeout(() => inputRef.current?.focus(), 10);
  }

  async function commitEdit(field: string) {
    let value: string | number = '';
    if (field === 'company') value = draftCompany;
    if (field === 'score')   value = draftScore;
    if (field === 'close_date') value = draftDate;
    setEditing(null);
    onUpdate(lead.id, field, value);
    await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
  }

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('leadId', lead.id.toString()); onDragStart(); }}
      onDragEnd={onDragEnd}
      className="kanban-card card cursor-grab active:cursor-grabbing mb-2 group"
      style={{
        padding: '11px 12px', borderRadius: '8px',
        opacity: isDragging ? 0.45 : 1,
        border: `1px solid ${isDragging ? '#f97316' : '#1e2530'}`,
        transition: 'opacity 0.15s, border-color 0.15s',
      }}
      onClick={onClick}
    >
      {/* Drag handle + company name */}
      <div className="flex items-start gap-1.5 mb-1.5">
        <GripVertical size={12} className="text-[#2d3848] mt-0.5 shrink-0 group-hover:text-[#4a5568] transition-colors" />
        <div className="flex-1 min-w-0">
          {editing === 'company' ? (
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <input
                ref={inputRef}
                value={draftCompany}
                onChange={e => setDraftCompany(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitEdit('company'); if (e.key === 'Escape') setEditing(null); }}
                className="flex-1 text-xs bg-[#0f1318] border border-[#f97316] rounded px-1.5 py-0.5 text-[#dde3ed] outline-none"
              />
              <button onClick={() => commitEdit('company')} className="text-[#34d399]"><Check size={11} /></button>
              <button onClick={() => setEditing(null)} className="text-[#f87171]"><X size={11} /></button>
            </div>
          ) : (
            <div className="flex items-center gap-1 group/name">
              <span className="font-medium text-[13px] text-[#dde3ed] leading-tight truncate">{lead.company}</span>
              <button
                onClick={e => startEdit('company', e)}
                className="opacity-0 group-hover/name:opacity-100 transition-opacity text-[#4a5568] hover:text-[#8896aa]"
              ><Edit2 size={9} /></button>
              {stale && (
                <span title={`No activity for ${daysSince(lead.last_activity)} days`} className="shrink-0">
                  <AlertCircle size={10} style={{ color: '#f87171' }} />
                </span>
              )}
            </div>
          )}
        </div>
        {/* Score badge */}
        {editing === 'score' ? (
          <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
            <input
              ref={inputRef}
              type="number" min={0} max={100}
              value={draftScore}
              onChange={e => setDraftScore(Number(e.target.value))}
              onKeyDown={e => { if (e.key === 'Enter') commitEdit('score'); if (e.key === 'Escape') setEditing(null); }}
              className="w-10 text-[10px] bg-[#0f1318] border border-[#f97316] rounded px-1 py-0.5 text-center text-[#dde3ed] outline-none font-mono"
            />
            <button onClick={() => commitEdit('score')} className="text-[#34d399]"><Check size={10} /></button>
          </div>
        ) : (
          <button
            onClick={e => startEdit('score', e)}
            className="badge shrink-0 text-[10px] cursor-pointer hover:opacity-80"
            style={{ background: `${scoreColor(lead.score)}20`, color: scoreColor(lead.score), fontFamily: 'JetBrains Mono' }}
          >{lead.score}</button>
        )}
      </div>

      <div className="text-[11px] text-[#8896aa] mb-0.5 ml-4">{lead.contact_name} · {lead.city}</div>
      {lead.last_activity && (
        <div className="text-[10px] ml-4 mb-1.5" style={{ color: '#4a5568' }}>
          Last contact: {new Date(lead.last_activity).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
        </div>
      )}

      {/* Revenue + weighted expected */}
      <div className="flex items-center justify-between text-[11px] ml-4 mb-1">
        <span className="font-mono" style={{ color: '#34d399' }}>{fmtRevenue(lead.expected_revenue)}</span>
        <span className="font-mono text-[10px] text-[#4a5568]" title={`${prob}% probability × deal value`}>≈{fmtRevenue(expectedWeighted)}</span>
      </div>

      {/* Close date */}
      <div className="ml-4 mb-1.5">
        {editing === 'close_date' ? (
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <input
              ref={inputRef}
              type="date" value={draftDate}
              onChange={e => setDraftDate(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commitEdit('close_date'); if (e.key === 'Escape') setEditing(null); }}
              className="flex-1 text-[10px] bg-[#0f1318] border border-[#f97316] rounded px-1.5 py-0.5 text-[#dde3ed] outline-none"
            />
            <button onClick={() => commitEdit('close_date')} className="text-[#34d399]"><Check size={10} /></button>
            <button onClick={() => setEditing(null)} className="text-[#f87171]"><X size={10} /></button>
          </div>
        ) : lead.close_date ? (
          <button
            onClick={e => startEdit('close_date', e)}
            className="flex items-center gap-1 text-[10px] hover:opacity-80 cursor-pointer"
            style={{ color: overdue ? '#f87171' : urgent ? '#fbbf24' : '#8896aa' }}
          >
            {overdue ? <AlertCircle size={9} /> : <Clock size={9} />}
            {overdue ? `${Math.abs(days)}d overdue` : days === 0 ? 'Closes today' : `${days}d to close`}
            <Edit2 size={8} className="opacity-0 group-hover:opacity-60 transition-opacity" />
          </button>
        ) : null}
      </div>

      {/* Footer row */}
      <div className="ml-4 flex items-center gap-1 flex-wrap">
        <span className="badge text-[10px]" style={{ background: '#1e2530', color: '#8896aa' }}>{lead.seats_required}seats</span>
        <span className="badge text-[10px]" style={{ background: '#1e2530', color: '#8896aa' }}>{lead.source}</span>
        {stale && (
          <span className="badge text-[9px]" style={{ background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>⚡ Follow up</span>
        )}
        {lead.created_at && (
          <span className="badge text-[10px]" style={{ background: '#1e2530', color: '#4a5568' }} title="Date added">
            + {new Date(lead.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </span>
        )}
        {/* Assignee — click to reassign */}
        <div className="relative ml-auto" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setShowAssignMenu(p => !p)}
            className="badge text-[10px] flex items-center gap-0.5 hover:opacity-80 transition-opacity"
            style={{ background: `${aColor}18`, color: aColor }}
            title="Click to reassign"
          >
            <span className="w-3.5 h-3.5 rounded-full text-[8px] flex items-center justify-center font-bold" style={{ background: aColor, color: '#080d14' }}>
              {lead.assigned_to ? initials(lead.assigned_to) : '?'}
            </span>
            {lead.assigned_to ? lead.assigned_to.split(' ')[0] : 'Unassigned'}
            <ChevronDown size={8} className="opacity-60" />
          </button>
          {showAssignMenu && (
            <div className="absolute right-0 bottom-full mb-1 z-20 rounded-lg border border-[#1e2530] overflow-hidden" style={{ background: '#0f1318', minWidth: '140px' }}>
              {ALL_REPS.map(rep => (
                <button
                  key={rep}
                  onClick={() => { onAssign(lead.id, rep); setShowAssignMenu(false); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] hover:bg-[#161b23] text-left transition-colors"
                  style={{ color: rep === lead.assigned_to ? AVATAR_COLORS[rep] : '#8896aa' }}
                >
                  <span className="w-4 h-4 rounded-full text-[8px] flex items-center justify-center font-bold shrink-0" style={{ background: AVATAR_COLORS[rep] || '#8896aa', color: '#080d14' }}>
                    {initials(rep)}
                  </span>
                  {rep}
                  {rep === lead.assigned_to && <Check size={9} className="ml-auto" style={{ color: AVATAR_COLORS[rep] }} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Lead Detail Modal ─────────────────────────────────────────
function LeadModal({ lead, onClose, onUpdate, onAssign, suggestRep }: {
  lead: Lead;
  onClose: () => void;
  onUpdate: (id: number, stage: string, score: number) => void;
  onAssign: (id: number, rep: string) => void;
  suggestRep: (lead: Lead) => string;
}) {
  const [saving, setSaving] = useState(false);
  const [stage, setStage]   = useState(lead.stage);
  const [score, setScore]   = useState(lead.score);
  const [notes, setNotes]   = useState(lead.notes || '');
  const [status, setStatus] = useState(lead.status || 'active');
  const [taskInput, setTaskInput]  = useState('');
  const [eventInput, setEventInput] = useState('');
  const [taskDate, setTaskDate]   = useState('');
  const [eventDate, setEventDate] = useState('');
  const [tasks, setTasks]   = useState<string[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [assignedTo, setAssignedTo] = useState(lead.assigned_to);
  const [closeDate, setCloseDate]   = useState(lead.close_date?.split('T')[0] ?? '');
  const suggested = suggestRep(lead);

  const prob = STAGE_PROB[stage] ?? 10;

  async function save() {
    setSaving(true);
    await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage, score, notes, status, close_date: closeDate }),
    });
    onUpdate(lead.id, stage, score);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="card w-full max-w-lg max-h-[92vh] overflow-y-auto animate-fade-in" onClick={e => e.stopPropagation()} style={{ borderRadius: '12px' }}>

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0 mr-3">
            <h2 className="text-lg font-semibold text-[#dde3ed]">{lead.company}</h2>
            <div className="text-xs text-[#8896aa]">{lead.contact_name} · {lead.industry} · {lead.city}</div>
            {/* Assignee row with reassign dropdown */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <div className="text-[10px] text-[#4a5568]">Assigned to:</div>
              <select
                value={assignedTo}
                onChange={async e => {
                  setAssignedTo(e.target.value);
                  onAssign(lead.id, e.target.value);
                }}
                className="text-[11px] rounded px-2 py-0.5 border outline-none"
                style={{ background: '#161b23', borderColor: '#1e2530', color: AVATAR_COLORS[assignedTo] || '#8896aa' }}
              >
                {ALL_REPS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              {suggested !== assignedTo && (
                <button
                  onClick={() => { setAssignedTo(suggested); onAssign(lead.id, suggested); }}
                  className="text-[10px] px-2 py-0.5 rounded border transition-colors"
                  style={{ borderColor: '#34d39940', color: '#34d399', background: 'rgba(52,211,153,0.07)' }}
                  title="Suggested based on lowest active lead count in this city"
                >
                  ✦ Suggest: {suggested.split(' ')[0]}
                </button>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-[#8896aa] hover:text-[#dde3ed] text-xl leading-none shrink-0">×</button>
        </div>

        {/* KPI mini row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Deal Value', value: fmtRevenue(lead.expected_revenue), color: '#34d399' },
            { label: `Weighted (${prob}%)`, value: fmtRevenue((lead.expected_revenue * prob) / 100), color: '#38bdf8' },
            { label: 'Seats', value: lead.seats_required.toString() },
          ].map(m => (
            <div key={m.label} className="rounded-lg p-2.5" style={{ background: '#161b23' }}>
              <div className="text-[10px] text-[#8896aa] mb-0.5">{m.label}</div>
              <div className="font-mono font-semibold text-sm" style={{ color: m.color || '#dde3ed' }}>{m.value}</div>
            </div>
          ))}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
          {[
            { k: 'City',         v: lead.city },
            { k: 'Source',       v: lead.source },
            { k: 'Account Type', v: lead.account_type },
            { k: 'Budget/seat',  v: lead.seats_required ? fmtRevenue(lead.expected_revenue / 12 / lead.seats_required) + '/mo' : '—' },
            { k: 'Score',        v: lead.score.toString() },
            { k: 'Added',        v: lead.created_at ? new Date(lead.created_at).toLocaleDateString('en-IN') : '—' },
          ].map(r => (
            <div key={r.k}>
              <span className="text-[10px] text-[#4a5568] block">{r.k}</span>
              <span className="text-[#dde3ed] text-xs">{r.v}</span>
            </div>
          ))}
          {/* Expected Close Date — editable */}
          <div className="col-span-2">
            <label className="text-[10px] text-[#4a5568] block mb-1">Expected Close Date</label>
            <input
              type="date" value={closeDate}
              onChange={e => setCloseDate(e.target.value)}
              className="w-full text-xs rounded-md px-2.5 py-1.5 bg-[#161b23] border border-[#1e2530] text-[#dde3ed] outline-none focus:border-[#f97316] transition-colors"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label className="text-xs text-[#8896aa] block mb-1.5">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            className="w-full text-xs rounded-md px-3 py-2 bg-[#161b23] border border-[#1e2530] text-[#dde3ed] outline-none focus:border-[#f97316] resize-none"
          />
        </div>

        {/* Status */}
        <div className="mb-3">
          <label className="text-xs text-[#8896aa] block mb-1.5">Status</label>
          <div className="flex gap-1.5 flex-wrap">
            {([['active','Active','#34d399'],['on_hold','On Hold','#fbbf24'],['nurture','Nurture','#a78bfa'],['won','Won','#34d399'],['lost','Lost','#f87171']] as const).map(([val, lbl, col]) => (
              <button key={val} onClick={() => setStatus(val)}
                className="px-3 py-1 rounded text-xs transition-all"
                style={{
                  background: status === val ? `${col}20` : '#161b23',
                  color:      status === val ? col : '#8896aa',
                  border:     `1px solid ${status === val ? col + '50' : '#1e2530'}`,
                  fontWeight: status === val ? 600 : 400,
                }}
              >{lbl}</button>
            ))}
          </div>
        </div>

        {/* Stage */}
        <div className="mb-3">
          <label className="text-xs text-[#8896aa] block mb-1.5">Stage <span className="text-[#4a5568] font-mono">(probability: {KANBAN_COLUMNS.find(c => c.dbStage === stage)?.prob ?? DB_STAGE_PROB[stage] ?? '?'}%)</span></label>
          <select value={stage} onChange={e => setStage(e.target.value)}
            className="w-full text-sm rounded-md px-3 py-2 bg-[#161b23] border border-[#1e2530] text-[#dde3ed] outline-none focus:border-[#f97316]"
          >
            {KANBAN_COLUMNS.map(col => <option key={col.key} value={col.dbStage}>{col.label} — {col.prob}%</option>)}
          </select>
        </div>

        {/* Score slider */}
        <div className="mb-5">
          <div className="flex justify-between text-xs text-[#8896aa] mb-1.5">
            <span>Lead Score</span>
            <span className="font-mono" style={{ color: scoreColor(score) }}>{score}</span>
          </div>
          <input type="range" min={0} max={100} value={score} onChange={e => setScore(Number(e.target.value))} className="w-full accent-orange-500" />
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-3">
          <button onClick={save} disabled={saving}
            className="flex-1 py-2 rounded-md text-sm font-medium text-white transition-opacity"
            style={{ background: '#f97316', opacity: saving ? 0.6 : 1 }}
          >{saving ? 'Saving…' : 'Save Changes'}</button>
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm text-[#8896aa] border border-[#1e2530] hover:border-[#2d3848]">Cancel</button>
        </div>

        {/* New Task / New Event */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-[10px] text-[#4a5568] mb-1">+ New Task</div>
            <div className="flex gap-1 mb-1">
              <input
                value={taskInput} onChange={e => setTaskInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && taskInput.trim()) { setTasks(p => [...p, taskDate ? `${taskInput.trim()} (${taskDate})` : taskInput.trim()]); setTaskInput(''); setTaskDate(''); } }}
                placeholder="Task description…"
                className="flex-1 text-[11px] px-2 py-1 rounded bg-[#161b23] border border-[#1e2530] text-[#dde3ed] outline-none focus:border-[#f97316]"
              />
              <input type="date" value={taskDate} onChange={e => setTaskDate(e.target.value)}
                className="text-[10px] w-28 px-1 py-1 rounded bg-[#161b23] border border-[#1e2530] text-[#8896aa] outline-none"
              />
            </div>
            <div className="flex gap-1">
              <div className="flex-1" />
              <button onClick={() => { if (taskInput.trim()) { setTasks(p => [...p, taskDate ? `${taskInput.trim()} (${taskDate})` : taskInput.trim()]); setTaskInput(''); setTaskDate(''); } }}
                className="px-2 py-1 text-[10px] rounded border border-[#1e2530] text-[#8896aa] hover:text-[#dde3ed]"
              >Add</button>
            </div>
            {tasks.map((t, i) => (
              <div key={i} className="flex items-center gap-1 mt-1 text-[11px] text-[#8896aa]">
                <span className="text-[#34d399]">✓</span>{t}
              </div>
            ))}
          </div>
          <div>
            <div className="text-[10px] text-[#4a5568] mb-1">+ New Event</div>
            <div className="flex gap-1 mb-1">
              <input
                value={eventInput} onChange={e => setEventInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && eventInput.trim()) { setEvents(p => [...p, eventDate ? `${eventInput.trim()} (${eventDate})` : eventInput.trim()]); setEventInput(''); setEventDate(''); } }}
                placeholder="Event title…"
                className="flex-1 text-[11px] px-2 py-1 rounded bg-[#161b23] border border-[#1e2530] text-[#dde3ed] outline-none focus:border-[#f97316]"
              />
              <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)}
                className="text-[10px] w-28 px-1 py-1 rounded bg-[#161b23] border border-[#1e2530] text-[#8896aa] outline-none"
              />
            </div>
            <div className="flex gap-1">
              <div className="flex-1" />
              <button onClick={() => { if (eventInput.trim()) { setEvents(p => [...p, eventDate ? `${eventInput.trim()} (${eventDate})` : eventInput.trim()]); setEventInput(''); setEventDate(''); } }}
                className="px-2 py-1 text-[10px] rounded border border-[#1e2530] text-[#8896aa] hover:text-[#dde3ed]"
              >Add</button>
            </div>
            {events.map((ev, i) => (
              <div key={i} className="flex items-center gap-1 mt-1 text-[11px] text-[#8896aa]">
                <span className="text-[#38bdf8]">📅</span>{ev}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Kanban Column ─────────────────────────────────────────────
function KanbanColumn({
  stage, leads, onCardClick, onUpdate, onAssign, dragOverCol, setDragOverCol, setDraggingId, draggingId, onDrop,
}: {
  stage: typeof KANBAN_COLUMNS[0];
  leads: Lead[];
  onCardClick: (lead: Lead) => void;
  onUpdate: (id: number, field: string, value: string | number) => void;
  onAssign: (id: number, rep: string) => void;
  dragOverCol: string | null;
  setDragOverCol: (c: string | null) => void;
  setDraggingId: (id: number | null) => void;
  draggingId: number | null;
  onDrop: (leadId: number, toStage: string) => void;
}) {
  const isOver = dragOverCol === stage.key;
  const total  = leads.reduce((s, l) => s + (l.expected_revenue || 0), 0);
  const weighted = leads.reduce((s, l) => s + ((l.expected_revenue || 0) * stage.prob / 100), 0);

  return (
    <div
      className="flex-shrink-0 flex flex-col"
      style={{ width: '220px' }}
      onDragOver={e => { e.preventDefault(); setDragOverCol(stage.key); }}
      onDragLeave={() => setDragOverCol(null)}
      onDrop={e => {
        e.preventDefault();
        const leadId = parseInt(e.dataTransfer.getData('leadId'));
        if (!isNaN(leadId)) onDrop(leadId, stage.key);
        setDragOverCol(null);
      }}
    >
      {/* Column header */}
      <div className="rounded-t-md px-3 py-2 mb-1" style={{ background: `${stage.color}14`, borderBottom: `2px solid ${stage.color}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold" style={{ color: stage.color }}>{stage.label}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full" style={{ background: `${stage.color}25`, color: stage.color }}>
              {leads.length}
            </span>
          </div>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', color: '#8896aa' }}>
            {stage.prob}%
          </span>
        </div>
      </div>

      {/* Totals */}
      <div className="px-1 mb-1.5 flex items-center justify-between text-[10px]">
        <span className="font-mono text-[#8896aa]">{fmtRevenue(total)}</span>
        <span className="font-mono font-semibold" style={{ color: '#f97316' }} title="Probability-weighted expected value">≈{fmtRevenue(weighted)} <span style={{ color: '#4a5568', fontWeight: 400 }}>wtd</span></span>
      </div>

      {/* Drop zone */}
      <div
        className="flex-1 rounded-b-md transition-all"
        style={{
          minHeight: '200px',
          background: isOver ? `${stage.color}08` : 'transparent',
          border: isOver ? `1px dashed ${stage.color}60` : '1px dashed transparent',
          borderRadius: '6px',
          padding: '2px',
        }}
      >
        {leads.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            isDragging={draggingId === lead.id}
            onDragStart={() => setDraggingId(lead.id)}
            onDragEnd={() => setDraggingId(null)}
            onClick={() => onCardClick(lead)}
            onUpdate={onUpdate}
            onAssign={onAssign}
          />
        ))}
        {leads.length === 0 && (
          <div className="text-[11px] text-[#4a5568] text-center py-8 rounded-lg" style={{ border: '1px dashed #1e2530' }}>
            No open activities
            <div className="mt-1.5 text-[10px]">Drag a card here or take action</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Current Quarter Wins View ─────────────────────────────────
function ExistingAccountsView({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-56 text-center">
        <div className="text-4xl mb-3">🏆</div>
        <div className="text-[#8896aa] text-sm font-medium mb-1">No closed accounts yet</div>
        <div className="text-[#4a5568] text-xs">Drag leads to Closed Won to see them here for cross-sell & upsell tracking</div>
      </div>
    );
  }

  // Group by company
  const grouped = leads.reduce((acc, l) => {
    if (!acc[l.company]) acc[l.company] = [];
    acc[l.company].push(l);
    return acc;
  }, {} as Record<string, Lead[]>);

  const companies = Object.entries(grouped).sort((a, b) =>
    b[1].reduce((s, l) => s + l.expected_revenue, 0) - a[1].reduce((s, l) => s + l.expected_revenue, 0)
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="text-xs text-[#8896aa]">{companies.length} accounts · Cross-sell & upsell pipeline</div>
        <div className="flex items-center gap-3 ml-auto text-[9px] text-[#4a5568]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block bg-[#f97316]"/>Upsell signal</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block bg-[#38bdf8]"/>Multi-city</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {companies.map(([company, acctLeads]) => {
          const totalRev   = acctLeads.reduce((s, l) => s + (l.expected_revenue || 0), 0);
          const totalSeats = acctLeads.reduce((s, l) => s + (l.seats_required || 0), 0);
          const latest     = [...acctLeads].sort((a, b) => new Date(b.close_date || 0).getTime() - new Date(a.close_date || 0).getTime())[0];
          const cities     = [...new Set(acctLeads.map(l => l.city))];
          const upsell     = totalSeats < 70 ? 'Upgrade to Growth tier' : totalSeats < 150 ? 'Upgrade to Enterprise tier' : cities.length < 3 ? 'Multi-city expansion' : 'Premium services upsell';
          const upsellCol  = totalSeats < 150 ? '#f97316' : '#38bdf8';
          const aColor     = AVATAR_COLORS[latest.assigned_to] || '#8896aa';
          return (
            <div key={company} className="card" style={{ borderRadius: '10px' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#dde3ed] truncate">{company}</div>
                  <div className="text-[11px] text-[#8896aa] mt-0.5">{latest.contact_name} · {cities.join(', ')}</div>
                </div>
                <span className="badge text-[10px] shrink-0 ml-2" style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399' }}>Closed Won</span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: 'ACV', value: fmtRevenue(totalRev), color: '#34d399' },
                  { label: 'Seats', value: totalSeats.toString(), color: '#dde3ed' },
                  { label: 'Deals', value: acctLeads.length.toString(), color: '#dde3ed' },
                ].map(m => (
                  <div key={m.label} className="rounded-lg p-2" style={{ background: '#161b23' }}>
                    <div className="text-[9px] text-[#4a5568] mb-0.5">{m.label}</div>
                    <div className="font-mono text-xs font-semibold" style={{ color: m.color }}>{m.value}</div>
                  </div>
                ))}
              </div>

              <div className="p-2 rounded-lg mb-3" style={{ background: `${upsellCol}0c`, border: `1px solid ${upsellCol}30` }}>
                <div className="text-[10px] font-medium mb-0.5" style={{ color: upsellCol }}>💡 {upsell}</div>
                <div className="text-[9px] text-[#4a5568]">
                  {totalSeats < 70 ? `${70 - totalSeats} seats to Growth threshold` :
                   totalSeats < 150 ? `${150 - totalSeats} seats to Enterprise threshold` :
                   `Operating in ${cities.length} cit${cities.length !== 1 ? 'ies' : 'y'}`}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ background: aColor, color: '#080d14' }}>
                    {latest.assigned_to ? latest.assigned_to.split(' ').map((w: string) => w[0]).join('') : '?'}
                  </div>
                  <span className="text-[10px] text-[#4a5568]">{latest.assigned_to?.split(' ')[0]}</span>
                </div>
                <div className="flex gap-1.5">
                  <button className="px-2 py-1 text-[10px] rounded border border-[#1e2530] text-[#8896aa] hover:text-[#f97316] hover:border-[rgba(249,115,22,0.3)] transition-colors">
                    + Add Seats
                  </button>
                  <button className="px-2 py-1 text-[10px] rounded border border-[#1e2530] text-[#8896aa] hover:text-[#38bdf8] hover:border-[rgba(56,189,248,0.3)] transition-colors">
                    Renewal
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function PipelinePage() {
  const [leads, setLeads]               = useState<Lead[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selected, setSelected]         = useState<Lead | null>(null);
  const [cityFilter, setCityFilter]     = useState('All');
  const [typeFilter, setTypeFilter]     = useState('All');
  const [repFilter, setRepFilter]       = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('all');
  const [smeMax, setSmeMax]             = useState(70);
  const [growthMax, setGrowthMax]       = useState(150);
  const [viewMode, setViewMode]         = useState<'kanban' | 'accounts'>('kanban');
  const [draggingId, setDraggingId]     = useState<number | null>(null);
  const [dragOverCol, setDragOverCol]   = useState<string | null>(null);
  const [showSubscribe, setShowSubscribe] = useState(false);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    // Load all leads so Closed Won / Closed Lost columns are populated
    const res = await fetch('/api/leads?status=all');
    const data = await res.json();
    setLeads(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  // Drop handler — PATCH stage + status via API
  async function handleDrop(leadId: number, toColKey: string) {
    const col     = KANBAN_COLUMNS.find(c => c.key === toColKey)!;
    const dbStage = col.dbStage;
    const prob    = col.prob;
    const status  = toColKey === 'Closed Won' ? 'won' : toColKey === 'Closed Lost' ? 'lost' : 'active';
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: dbStage, probability: prob, status } : l));
    await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: dbStage, probability: prob, status }),
    });
  }

  function handleCardUpdate(id: number, field: string, value: string | number) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  }

  async function handleAssign(leadId: number, rep: string) {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, assigned_to: rep } : l));
    await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assigned_to: rep }),
    });
  }

  // Smart assignment suggestion: rep with fewest active leads in same city
  function suggestRep(lead: Lead): string {
    const cityLeads = leads.filter(l => l.city === lead.city && l.status === 'active');
    const counts = ALL_REPS.reduce((acc, rep) => {
      acc[rep] = cityLeads.filter(l => l.assigned_to === rep).length;
      return acc;
    }, {} as Record<string, number>);
    return ALL_REPS.sort((a, b) => counts[a] - counts[b])[0];
  }

  function handleModalUpdate(id: number, stage: string, score: number) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage, score } : l));
    if (selected?.id === id) setSelected(s => s ? { ...s, stage, score } : s);
  }

  // Seats-based account type (overrides stored account_type)
  function acctType(seats: number): string {
    if (!seats || seats < smeMax) return 'SME';
    if (seats < growthMax) return 'Growth';
    return 'Enterprise';
  }

  // All filters applied
  const tabFiltered = leads
    .filter(l => cityFilter === 'All' || l.city === cityFilter)
    .filter(l => typeFilter === 'All' || acctType(l.seats_required) === typeFilter)
    .filter(l => repFilter === 'All' || l.assigned_to === repFilter)
    .filter(l => sourceFilter === 'All' || l.source === sourceFilter)
    .filter(l => statusFilter === 'all' || l.status === statusFilter);

  const kanbanColumns = KANBAN_COLUMNS.map(col => ({
    ...col,
    leads: tabFiltered.filter(l => mapStageToColumn(l.stage) === col.key),
  }));

  const totalPipelineValue   = tabFiltered.reduce((s, l) => s + (l.expected_revenue || 0), 0);
  const totalWeightedPipeline = tabFiltered.reduce((s, l) => s + (l.expected_revenue || 0) * (STAGE_PROB[l.stage] ?? 10) / 100, 0);

  const cities = ['All', ...Array.from(new Set(leads.map(l => l.city))).sort()];

  const insight = leads.length > 0
    ? `${leads.filter(l => l.stage === 'Negotiation/Review').length} deals in Negotiation worth ${fmtRevenue(leads.filter(l => l.stage === 'Negotiation/Review').reduce((s, l) => s + l.expected_revenue, 0))}. Weighted pipeline (probability-adjusted): ${fmtRevenue(totalWeightedPipeline)} from ${tabFiltered.length} opportunities.`
    : 'Loading pipeline data…';

  return (
    <div className="p-6 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-[#dde3ed]">All Opportunities</h1>
          <div className="text-xs text-[#8896aa] mt-0.5">
            {tabFiltered.length} items · Sorted by Score · Updated a few seconds ago
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton data={leads} filename="pipeline" />
          <button onClick={loadLeads}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-[#8896aa] border border-[#1e2530] hover:border-[#2d3848] hover:text-[#dde3ed] transition-all"
          ><RefreshCw size={12} />Refresh</button>
          <button
            onClick={() => setShowSubscribe(true)}
            className="px-3 py-1.5 rounded-md text-xs border border-[#f97316] text-[#f97316] hover:bg-[rgba(249,115,22,0.1)] transition-colors"
          >Subscribe</button>
          <Link href="/submit"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-white transition-all"
            style={{ background: '#f97316' }}
          ><Plus size={13} />New</Link>
        </div>
      </div>

      <InsightCallout insight={insight} />

      {/* View toggle */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex rounded-lg overflow-hidden border border-[#1e2530]" style={{ background: '#0f1318' }}>
          {(['kanban', 'accounts'] as const).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className="px-4 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: viewMode === mode ? 'rgba(249,115,22,0.15)' : 'transparent',
                color: viewMode === mode ? '#f97316' : '#8896aa',
              }}
            >{mode === 'accounts' ? '🏆 Current Quarter Wins' : '📋 Kanban'}</button>
          ))}
        </div>
        <div className="text-[10px] text-[#4a5568]">{tabFiltered.length} records</div>
      </div>

      {/* Filter panel */}
      <div className="flex items-center gap-2 mb-4 flex-wrap px-3 py-2 rounded-lg" style={{ background: '#0f1318', border: '1px solid #1e2530' }}>
        <Filter size={12} className="text-[#4a5568] shrink-0" />
        <span className="text-[10px] text-[#4a5568] uppercase tracking-widest mr-1">Filter</span>

        <select value={cityFilter} onChange={e => setCityFilter(e.target.value)} className="filter-sel">
          <option value="All">All Cities</option>
          {cities.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="filter-sel">
          <option value="All">All Types</option>
          <option value="Enterprise">Enterprise (150+ seats)</option>
          <option value="Growth">Growth (70–150)</option>
          <option value="SME">SME (&lt;70 seats)</option>
        </select>

        <select value={repFilter} onChange={e => setRepFilter(e.target.value)} className="filter-sel">
          <option value="All">All Agents</option>
          {ALL_REPS.map(r => <option key={r} value={r}>{r.split(' ')[0]} {r.split(' ')[1]}</option>)}
        </select>

        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="filter-sel">
          <option value="All">All Sources</option>
          {[...new Set(leads.map(l => l.source).filter(Boolean))].sort().map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="filter-sel">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="on_hold">On Hold</option>
          <option value="nurture">Nurture</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>

        {typeFilter !== 'All' && (
          <div className="flex items-center gap-1.5 text-[10px] text-[#4a5568] border-l border-[#1e2530] pl-2.5 ml-1">
            <span>Thresholds — SME &lt;</span>
            <input type="number" value={smeMax} onChange={e => setSmeMax(Number(e.target.value))}
              className="w-10 text-center text-[10px] bg-[#161b23] border border-[#1e2530] rounded px-1 py-0.5 text-[#dde3ed] outline-none focus:border-[#f97316]" />
            <span className="text-[#4a5568]">· Growth &lt;</span>
            <input type="number" value={growthMax} onChange={e => setGrowthMax(Number(e.target.value))}
              className="w-10 text-center text-[10px] bg-[#161b23] border border-[#1e2530] rounded px-1 py-0.5 text-[#dde3ed] outline-none focus:border-[#f97316]" />
          </div>
        )}

        {(cityFilter !== 'All' || typeFilter !== 'All' || repFilter !== 'All' || sourceFilter !== 'All' || statusFilter !== 'all') && (
          <button
            onClick={() => { setCityFilter('All'); setTypeFilter('All'); setRepFilter('All'); setSourceFilter('All'); setStatusFilter('all'); }}
            className="ml-auto text-[10px] px-2 py-0.5 rounded transition-colors"
            style={{ color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}
          >Clear all ×</button>
        )}
      </div>

      {/* Kanban board or Existing Accounts */}
      {viewMode === 'accounts' ? (
        <ExistingAccountsView leads={leads.filter(l => l.status === 'won')} />
      ) : loading ? (
        <div className="flex gap-4">
          {KANBAN_COLUMNS.map(s => (
            <div key={s.key} className="flex-shrink-0" style={{ width: '220px' }}>
              <div className="h-10 rounded mb-2 animate-pulse" style={{ background: '#161b23' }} />
              {[1,2,3].map(i => <div key={i} className="h-28 rounded mb-2 animate-pulse" style={{ background: '#0f1318' }} />)}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
          {kanbanColumns.map((col) => (
            <KanbanColumn
              key={col.key}
              stage={col}
              leads={col.leads}
              onCardClick={setSelected}
              onUpdate={handleCardUpdate}
              onAssign={handleAssign}
              dragOverCol={dragOverCol}
              setDragOverCol={setDragOverCol}
              draggingId={draggingId}
              setDraggingId={setDraggingId}
              onDrop={handleDrop}
            />
          ))}
        </div>
      )}

      {/* Pipeline summary bar (kanban only) */}
      <div className="mt-4 card p-0 overflow-hidden">
        {/* Hero weighted number */}
        <div className="flex items-stretch">
          <div className="px-5 py-3 border-r border-[#1e2530]" style={{ background: 'rgba(56,189,248,0.06)' }}>
            <div className="text-[10px] text-[#8896aa] mb-0.5 uppercase tracking-widest">Weighted Pipeline</div>
            <div className="flex items-baseline gap-2">
              <span className="font-mono font-bold text-2xl" style={{ color: '#38bdf8' }}>{fmtRevenue(totalWeightedPipeline)}</span>
              <span className="text-xs text-[#4a5568]">probability-adjusted</span>
            </div>
            <div className="text-[10px] text-[#4a5568] mt-0.5">from <span className="text-[#8896aa] font-semibold">{tabFiltered.filter(l => l.status === 'active').length} active opportunities</span></div>
          </div>
          <div className="px-5 py-3 border-r border-[#1e2530]">
            <div className="text-[10px] text-[#8896aa] mb-0.5 uppercase tracking-widest">Total Pipeline</div>
            <div className="font-mono font-bold text-2xl" style={{ color: '#34d399' }}>{fmtRevenue(totalPipelineValue)}</div>
            <div className="text-[10px] text-[#4a5568] mt-0.5">face value</div>
          </div>
          <div className="flex-1 px-5 py-3 flex flex-col justify-between">
            <div className="text-[10px] text-[#4a5568] mb-1.5">Pipeline by stage</div>
            <div className="flex gap-1 h-2.5">
              {kanbanColumns.map(c => {
                const pct = totalPipelineValue > 0
                  ? (c.leads.reduce((s, l) => s + l.expected_revenue, 0) / totalPipelineValue) * 100
                  : 0;
                return pct > 0 ? (
                  <div key={c.key} title={`${c.label}: ${fmtRevenue(c.leads.reduce((s, l) => s + l.expected_revenue, 0))} (${pct.toFixed(0)}%)`}
                    className="rounded-sm transition-all" style={{ width: `${pct}%`, background: c.color, opacity: 0.85 }}
                  />
                ) : null;
              })}
            </div>
            <div className="flex gap-3 mt-1.5 flex-wrap">
              {kanbanColumns.filter(c => c.leads.length > 0).map(c => (
                <span key={c.key} className="text-[9px] flex items-center gap-1" style={{ color: '#4a5568' }}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: c.color }} />
                  {c.label} ({c.leads.length})
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center gap-3 text-[10px] text-[#4a5568]">
        <span>💡 Drag cards between columns to update stage</span>
        <span>·</span>
        <span>Click any field on a card to edit inline</span>
        <span>·</span>
        <span>≈ values show probability-weighted expected revenue</span>
      </div>

      <LastUpdated />

      {selected && (
        <LeadModal
          lead={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleModalUpdate}
          onAssign={handleAssign}
          suggestRep={suggestRep}
        />
      )}

      {showSubscribe && <SubscribeModal onClose={() => setShowSubscribe(false)} />}
    </div>
  );
}
