'use client';

import { useState } from 'react';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const CITIES = ['Bangalore', 'Mumbai', 'Gurugram', 'Hyderabad', 'Pune', 'Chennai'];
const STAGES = ['Prospecting', 'Qualification', 'Needs Analysis', 'Value Proposition', 'Id. Decision Makers', 'Perception Analysis', 'Proposal/Price Quote', 'Negotiation/Review'];
const SOURCES = ['Inbound Web', 'Cold Outreach', 'Referral', 'LinkedIn', 'Event', 'Broker', 'Phone Inquiry'];
const INDUSTRIES = ['Technology', 'BFSI', 'Consulting', 'E-Commerce', 'Healthcare', 'Media', 'Manufacturing', 'Legal'];
const ACCOUNT_TYPES = ['Enterprise', 'Growth', 'SME'];

export default function SubmitPage() {
  const [form, setForm] = useState({
    company: '', contact_name: '', email: '', phone: '',
    city: 'Bangalore', seats_required: '', budget_per_seat: '',
    stage: 'Qualification', source: 'Inbound Web', account_type: 'Growth',
    industry: 'Technology', notes: '', close_date: '',
    expected_revenue: '',
  });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  function set(field: string, value: string) {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      // Auto-calc expected revenue
      if (field === 'seats_required' || field === 'budget_per_seat') {
        const seats = Number(field === 'seats_required' ? value : prev.seats_required);
        const budget = Number(field === 'budget_per_seat' ? value : prev.budget_per_seat);
        if (seats && budget) updated.expected_revenue = String(seats * budget * 12);
      }
      return updated;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.company || !form.city) { setError('Company and City are required.'); return; }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          seats_required: Number(form.seats_required) || null,
          budget_per_seat: Number(form.budget_per_seat) || null,
          expected_revenue: Number(form.expected_revenue) || null,
          score: 50,
        }),
      });
      if (!res.ok) throw new Error('Failed to submit');
      setSuccess(true);
    } catch {
      setError('Failed to submit. Please try again.');
    }
    setSaving(false);
  }

  if (success) {
    return (
      <div className="p-6 max-w-lg mx-auto mt-16 text-center">
        <div className="card p-10">
          <CheckCircle size={48} className="mx-auto mb-4" style={{ color: '#34d399' }} />
          <h2 className="text-xl font-semibold text-[#dde3ed] mb-2">Lead Submitted!</h2>
          <p className="text-[#8896aa] text-sm mb-6">The opportunity has been added to the pipeline.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/pipeline" className="px-4 py-2 rounded-md text-sm text-white" style={{ background: '#f97316' }}>
              View Pipeline
            </Link>
            <button onClick={() => { setSuccess(false); setForm({ company: '', contact_name: '', email: '', phone: '', city: 'Bangalore', seats_required: '', budget_per_seat: '', stage: 'Qualification', source: 'Inbound Web', account_type: 'Growth', industry: 'Technology', notes: '', close_date: '', expected_revenue: '' }); }} className="px-4 py-2 rounded-md text-sm border border-[#1e2530] text-[#8896aa] hover:text-[#dde3ed]">
              Add Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto page-enter">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/pipeline" className="text-[#8896aa] hover:text-[#dde3ed] transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-[#dde3ed]">New Opportunity</h1>
          <div className="text-xs text-[#8896aa] mt-0.5">Add a new lead to the pipeline</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Company info */}
        <div className="card">
          <h2 className="text-sm font-semibold text-[#dde3ed] mb-4">Company Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#8896aa] block mb-1.5">Company Name *</label>
              <input value={form.company} onChange={e => set('company', e.target.value)} required placeholder="e.g. Acme Corp" className="field-input" />
            </div>
            <div>
              <label className="text-xs text-[#8896aa] block mb-1.5">Industry</label>
              <select value={form.industry} onChange={e => set('industry', e.target.value)} className="field-input">
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#8896aa] block mb-1.5">Contact Name</label>
              <input value={form.contact_name} onChange={e => set('contact_name', e.target.value)} placeholder="e.g. Priya Sharma" className="field-input" />
            </div>
            <div>
              <label className="text-xs text-[#8896aa] block mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="priya@example.com" className="field-input" />
            </div>
            <div>
              <label className="text-xs text-[#8896aa] block mb-1.5">Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98XXXXXXXX" className="field-input" />
            </div>
            <div>
              <label className="text-xs text-[#8896aa] block mb-1.5">City *</label>
              <select value={form.city} onChange={e => set('city', e.target.value)} className="field-input">
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Deal info */}
        <div className="card">
          <h2 className="text-sm font-semibold text-[#dde3ed] mb-4">Deal Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#8896aa] block mb-1.5">Seats Required</label>
              <input type="number" value={form.seats_required} onChange={e => set('seats_required', e.target.value)} placeholder="e.g. 50" className="field-input" />
            </div>
            <div>
              <label className="text-xs text-[#8896aa] block mb-1.5">Budget / Seat / Month (₹)</label>
              <input type="number" value={form.budget_per_seat} onChange={e => set('budget_per_seat', e.target.value)} placeholder="e.g. 9000" className="field-input" />
            </div>
            <div>
              <label className="text-xs text-[#8896aa] block mb-1.5">Expected Annual Revenue (₹)</label>
              <input type="number" value={form.expected_revenue} onChange={e => set('expected_revenue', e.target.value)} placeholder="Auto-calculated" className="field-input" style={{ color: '#34d399' }} />
            </div>
            <div>
              <label className="text-xs text-[#8896aa] block mb-1.5">Expected Close Date</label>
              <input type="date" value={form.close_date} onChange={e => set('close_date', e.target.value)} className="field-input" />
            </div>
            <div>
              <label className="text-xs text-[#8896aa] block mb-1.5">Account Type</label>
              <select value={form.account_type} onChange={e => set('account_type', e.target.value)} className="field-input">
                {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#8896aa] block mb-1.5">Lead Source</label>
              <select value={form.source} onChange={e => set('source', e.target.value)} className="field-input">
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#8896aa] block mb-1.5">Stage</label>
              <select value={form.stage} onChange={e => set('stage', e.target.value)} className="field-input">
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="text-xs text-[#8896aa] block mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              placeholder="Any additional context, requirements, or next steps…"
              className="field-input w-full resize-none"
            />
          </div>
        </div>

        {error && <div className="text-xs text-[#f87171] px-1">{error}</div>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2.5 rounded-md text-sm font-medium text-white transition-opacity"
            style={{ background: '#f97316', opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Saving…' : 'Add to Pipeline'}
          </button>
          <Link href="/pipeline" className="px-6 py-2.5 rounded-md text-sm border border-[#1e2530] text-[#8896aa] hover:text-[#dde3ed] transition-colors flex items-center">
            Cancel
          </Link>
        </div>
      </form>

      <style jsx>{`
        .field-input {
          width: 100%;
          background: #161b23;
          border: 1px solid #1e2530;
          border-radius: 6px;
          padding: 8px 12px;
          font-size: 13px;
          color: #dde3ed;
          outline: none;
          transition: border-color 0.15s;
        }
        .field-input:focus {
          border-color: #f97316;
        }
        .field-input::placeholder {
          color: #4a5568;
        }
      `}</style>
    </div>
  );
}
