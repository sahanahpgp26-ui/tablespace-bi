'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Plus, RefreshCw, Filter, Star, AlertCircle, Clock, Edit2, Check, X, Info, GripVertical, ChevronDown, User } from 'lucide-react';
import ExportButton from '@/components/ExportButton';
import LastUpdated from '@/components/LastUpdated';
import InsightCallout from '@/components/InsightCallout';
import Link from 'next/link';

// ── Stage config with Salesforce-style probabilities ──────────
const KANBAN_STAGES = [
  { key: 'Qualification',  label: 'Qualification',  color: '#38bdf8', prob: 20  },
  { key: 'Needs Analysis', label: 'Needs Analysis', color: '#a78bfa', prob: 25  },
  { key: 'Proposal',       label: 'Proposal',       color: '#fbbf24', prob: 65  },
  { key: 'Negotiation',    label: 'Negotiation',    color: '#f97316', prob: 80  },
  { key: 'Closed Won',     label: 'Closed Won',     color: '#34d399', prob: 100 },
];

const ALL_STAGES = [
  'Prospecting','Qualification','Needs Analysis','Value Proposition',
  'Id. Decision Makers','Perception Analysis','Proposal/Price Quote',
  'Negotiation/Review','Closed Won',
];

const STAGE_PROB: Record<string, number> = {
  'Prospecting':10,'Qualification':20,'Needs Analysis':25,'Value Proposition':35,
  'Id. Decision Makers':40,'Perception Analysis':50,'Proposal/Price Quote':65,
  'Negotiation/Review':80,'Closed Won':100,'Closed Lost':0,
};

// account_type descriptions
const ACCOUNT_TYPE_DESC: Record<string, string> = {
  'Enterprise': 'Companies requiring 150+ seats — large corporates, MNCs, global captives',
  'Growth':     'Scaling companies requiring 70–150 seats — funded startups, regional offices, mid-size firms',
  'SME':        'Small & medium businesses requiring <70 seats — boutique firms, early-stage startups',
};

function mapStage(dbStage: string): string {
  if (dbStage === 'Proposal/Price Quote') return 'Proposal';
  if (dbStage === 'Negotiation/Review')   return 'Negotiation';
  if (KANBAN_STAGES.some(s => s.key === dbStage)) return dbStage;
  return dbStage;
}

function mapStageBack(kanbanKey: string): string {
  if (kanbanKey === 'Proposal')    return 'Proposal/Price Quote';
  if (kanbanKey === 'Negotiation') return 'Negotiation/Review';
  return kanbanKey;
}

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

function initials(name: string) {
  return name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
}

const AVATAR_COLORS: Record<string, string> = {
  'Rohan Kapoor': '#f97316', 'Priya Menon': '#38bdf8', 'Aditya Sharma': '#34d399',
  'Kavya Nair': '#a78bfa', 'Siddharth Rao': '#fbbf24', 'Divya Iyer': '#f43f5e',
};

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
  lead, isDragging, onDragStart, onDragEnd, onClick, onUpdate,
}: {
  lead: Lead;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onClick: () => void;
  onUpdate: (id: number, field: string, value: string | number) => void;
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
  const prob    = STAGE_PROB[lead.stage] ?? lead.probability ?? 10;
  const expectedWeighted = (lead.expected_revenue * prob) / 100;

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

      <div className="text-[11px] text-[#8896aa] mb-1.5 ml-4">{lead.contact_name} · {lead.city}</div>

      {/* Revenue + weighted expected */}
      <div className="flex items-center justify-between text-[11px] ml-4 mb-1">
        <span className="font-mono" style={{ color: '#34d399' }}>{fmtRevenue(lead.expected_revenue)}</span>
        <span className="font-mono text-[10px] text-[#4a5568]" title={`${prob}% probability × deal value`}>≈{fmtRevenue(expectedWeighted)}</span>
      </div>

      {/* Probability bar */}
      <div className="ml-4 mb-1.5">
        <div className="flex items-center justify-between text-[9px] text-[#4a5568] mb-0.5">
          <span>Close probability</span>
          <span className="font-mono">{prob}%</span>
        </div>
        <div className="h-1 rounded-full bg-[#1e2530] overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${prob}%`, background: prob >= 70 ? '#34d399' : prob >= 40 ? '#fbbf24' : '#38bdf8' }} />
        </div>
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
        {lead.assigned_to && (
          <span
            className="badge text-[10px] flex items-center gap-0.5 ml-auto"
            style={{ background: `${aColor}18`, color: aColor }}
            title={lead.assigned_to}
          >
            <span className="w-3.5 h-3.5 rounded-full text-[8px] flex items-center justify-center font-bold" style={{ background: aColor, color: '#000' }}>
              {initials(lead.assigned_to)}
            </span>
            {lead.assigned_to.split(' ')[0]}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Lead Detail Modal ─────────────────────────────────────────
function LeadModal({ lead, onClose, onUpdate }: {
  lead: Lead;
  onClose: () => void;
  onUpdate: (id: number, stage: string, score: number) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [stage, setStage]   = useState(lead.stage);
  const [score, setScore]   = useState(lead.score);
  const [notes, setNotes]   = useState(lead.notes || '');
  const [taskInput, setTaskInput]  = useState('');
  const [eventInput, setEventInput] = useState('');
  const [tasks, setTasks]   = useState<string[]>([]);
  const [events, setEvents] = useState<string[]>([]);

  const prob = STAGE_PROB[stage] ?? 10;

  async function save() {
    setSaving(true);
    await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage, score, notes }),
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
          <div>
            <h2 className="text-lg font-semibold text-[#dde3ed]">{lead.company}</h2>
            <div className="text-xs text-[#8896aa]">{lead.contact_name} · {lead.industry} · {lead.city}</div>
            {lead.assigned_to && (
              <div className="flex items-center gap-1 mt-1 text-[11px]" style={{ color: AVATAR_COLORS[lead.assigned_to] || '#8896aa' }}>
                <User size={10} />
                <span>{lead.assigned_to}</span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-[#8896aa] hover:text-[#dde3ed] text-xl leading-none">×</button>
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
            { k: 'Close Date',   v: lead.close_date ? new Date(lead.close_date).toLocaleDateString('en-IN') : '—' },
            { k: 'Budget/seat',  v: lead.seats_required ? fmtRevenue(lead.expected_revenue / 12 / lead.seats_required) + '/mo' : '—' },
            { k: 'Score',        v: lead.score.toString() },
          ].map(r => (
            <div key={r.k}>
              <span className="text-[10px] text-[#4a5568] block">{r.k}</span>
              <span className="text-[#dde3ed] text-xs">{r.v}</span>
            </div>
          ))}
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

        {/* Stage */}
        <div className="mb-3">
          <label className="text-xs text-[#8896aa] block mb-1.5">Stage <span className="text-[#4a5568] font-mono">(probability: {STAGE_PROB[stage] ?? '?'}%)</span></label>
          <select value={stage} onChange={e => setStage(e.target.value)}
            className="w-full text-sm rounded-md px-3 py-2 bg-[#161b23] border border-[#1e2530] text-[#dde3ed] outline-none focus:border-[#f97316]"
          >
            {ALL_STAGES.map(s => <option key={s} value={s}>{s} — {STAGE_PROB[s] ?? 0}%</option>)}
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
            <div className="flex gap-1">
              <input
                value={taskInput} onChange={e => setTaskInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && taskInput.trim()) { setTasks(p => [...p, taskInput.trim()]); setTaskInput(''); } }}
                placeholder="Task description…"
                className="flex-1 text-[11px] px-2 py-1 rounded bg-[#161b23] border border-[#1e2530] text-[#dde3ed] outline-none focus:border-[#f97316]"
              />
              <button onClick={() => { if (taskInput.trim()) { setTasks(p => [...p, taskInput.trim()]); setTaskInput(''); } }}
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
            <div className="flex gap-1">
              <input
                value={eventInput} onChange={e => setEventInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && eventInput.trim()) { setEvents(p => [...p, eventInput.trim()]); setEventInput(''); } }}
                placeholder="Event title…"
                className="flex-1 text-[11px] px-2 py-1 rounded bg-[#161b23] border border-[#1e2530] text-[#dde3ed] outline-none focus:border-[#f97316]"
              />
              <button onClick={() => { if (eventInput.trim()) { setEvents(p => [...p, eventInput.trim()]); setEventInput(''); } }}
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
  stage, leads, onCardClick, onUpdate, dragOverCol, setDragOverCol, setDraggingId, draggingId, onDrop,
}: {
  stage: typeof KANBAN_STAGES[0];
  leads: Lead[];
  onCardClick: (lead: Lead) => void;
  onUpdate: (id: number, field: string, value: string | number) => void;
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
        <span className="font-mono text-[#4a5568]" title="Weighted expected value">≈{fmtRevenue(weighted)}</span>
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

// ── Main Page ─────────────────────────────────────────────────
export default function PipelinePage() {
  const [leads, setLeads]               = useState<Lead[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selected, setSelected]         = useState<Lead | null>(null);
  const [cityFilter, setCityFilter]     = useState('All');
  const [activeTypeTab, setActiveTypeTab] = useState('All');
  const [draggingId, setDraggingId]     = useState<number | null>(null);
  const [dragOverCol, setDragOverCol]   = useState<string | null>(null);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [showTypeInfo, setShowTypeInfo]  = useState<string | null>(null);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/leads?status=active');
    const data = await res.json();
    setLeads(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  // Drop handler — PATCH stage via API
  async function handleDrop(leadId: number, toStageKey: string) {
    const dbStage = mapStageBack(toStageKey);
    const prob    = STAGE_PROB[dbStage] ?? 10;
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: dbStage, probability: prob } : l));
    await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: dbStage, probability: prob }),
    });
  }

  function handleCardUpdate(id: number, field: string, value: string | number) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  }

  function handleModalUpdate(id: number, stage: string, score: number) {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage, score } : l));
    if (selected?.id === id) setSelected(s => s ? { ...s, stage, score } : s);
  }

  // Filters
  const cityFiltered = leads.filter(l => cityFilter === 'All' || l.city === cityFilter);
  const tabFiltered  = activeTypeTab === 'All' ? cityFiltered : cityFiltered.filter(l => l.account_type === activeTypeTab);

  const kanbanColumns = KANBAN_STAGES.map(s => ({
    ...s,
    leads: tabFiltered.filter(l => mapStage(l.stage) === s.key),
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

      {/* Filters */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-1 text-xs text-[#8896aa]"><Filter size={12} /><span>City:</span></div>
        {cities.map(c => (
          <button key={c} onClick={() => setCityFilter(c)}
            className="px-2.5 py-1 rounded text-xs transition-colors"
            style={{
              background: cityFilter === c ? 'rgba(249,115,22,0.15)' : '#161b23',
              color: cityFilter === c ? '#f97316' : '#8896aa',
              border: `1px solid ${cityFilter === c ? 'rgba(249,115,22,0.4)' : '#1e2530'}`,
            }}
          >{c}</button>
        ))}
      </div>

      {/* Account type tabs with info tooltips */}
      <div className="flex gap-0 mb-4 border-b border-[#1e2530]">
        {['All', 'Enterprise', 'Growth', 'SME'].map(t => {
          const cnt = t === 'All' ? cityFiltered.length : cityFiltered.filter(l => l.account_type === t).length;
          const isActive = activeTypeTab === t;
          return (
            <div key={t} className="relative flex items-center">
              <button
                onClick={() => setActiveTypeTab(t)}
                className="px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  color: isActive ? '#f97316' : '#8896aa',
                  borderBottom: isActive ? '2px solid #f97316' : '2px solid transparent',
                }}
              >{t} ({cnt})</button>
              {t !== 'All' && (
                <button
                  onMouseEnter={() => setShowTypeInfo(t)}
                  onMouseLeave={() => setShowTypeInfo(null)}
                  className="mr-1 text-[#4a5568] hover:text-[#8896aa]"
                ><Info size={11} /></button>
              )}
              {showTypeInfo === t && (
                <div className="absolute top-full left-0 z-20 w-56 p-2.5 rounded-lg text-xs text-[#dde3ed] shadow-xl"
                  style={{ background: '#161b23', border: '1px solid #2d3848', marginTop: '4px' }}>
                  <div className="font-semibold text-[#f97316] mb-1">{t}</div>
                  {ACCOUNT_TYPE_DESC[t]}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Kanban board */}
      {loading ? (
        <div className="flex gap-4">
          {KANBAN_STAGES.map(s => (
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
              dragOverCol={dragOverCol}
              setDragOverCol={setDragOverCol}
              draggingId={draggingId}
              setDraggingId={setDraggingId}
              onDrop={handleDrop}
            />
          ))}
        </div>
      )}

      {/* Pipeline summary bar */}
      <div className="mt-4 flex items-center gap-4 p-4 card flex-wrap">
        <div>
          <div className="text-[10px] text-[#4a5568]">Total Pipeline</div>
          <div className="font-mono font-semibold text-base" style={{ color: '#34d399' }}>{fmtRevenue(totalPipelineValue)}</div>
        </div>
        <div>
          <div className="text-[10px] text-[#4a5568]">Weighted Expected</div>
          <div className="font-mono font-semibold text-base" style={{ color: '#38bdf8' }}>{fmtRevenue(totalWeightedPipeline)}</div>
        </div>
        <div className="flex-1 flex gap-1 h-2 mx-2">
          {kanbanColumns.map(c => {
            const pct = totalPipelineValue > 0
              ? (c.leads.reduce((s, l) => s + l.expected_revenue, 0) / totalPipelineValue) * 100
              : 0;
            return pct > 0 ? (
              <div key={c.key} title={`${c.key}: ${pct.toFixed(0)}%`}
                className="rounded-sm" style={{ width: `${pct}%`, background: c.color, opacity: 0.8 }}
              />
            ) : null;
          })}
        </div>
        <div className="text-xs text-[#8896aa]">{tabFiltered.length} opportunities</div>
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
        />
      )}

      {showSubscribe && <SubscribeModal onClose={() => setShowSubscribe(false)} />}
    </div>
  );
}
