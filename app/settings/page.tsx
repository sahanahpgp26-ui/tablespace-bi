'use client';

import { useState } from 'react';
import {
  User, Bell, Database, Shield, Palette, Download,
  Globe, RefreshCw, Check, ChevronRight, ExternalLink,
  Eye, EyeOff, Zap, AlertTriangle
} from 'lucide-react';
import LastUpdated from '@/components/LastUpdated';

// ── Shared ────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200"
      style={{ background: checked ? '#f97316' : '#2d3848' }}
    >
      <span
        className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 mt-0.5"
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  );
}

function SavedBadge() {
  return (
    <span className="flex items-center gap-1 text-[11px] text-[#34d399] animate-fade-in">
      <Check size={11} /> Saved
    </span>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="card mb-4" style={{ borderRadius: '10px' }}>
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#1e2530]">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.1)' }}>
          <Icon size={14} style={{ color: '#f97316' }} />
        </div>
        <span className="text-sm font-semibold text-[#dde3ed]">{title}</span>
      </div>
      {children}
    </div>
  );
}

// ── Settings sections ─────────────────────────────────────────

function ProfileSettings() {
  const [name, setName]   = useState('Sales Manager');
  const [email, setEmail] = useState('manager@tablespace.in');
  const [org, setOrg]     = useState('TableSpace');
  const [saved, setSaved] = useState(false);

  function save() { setSaved(true); setTimeout(() => setSaved(false), 2000); }

  return (
    <SectionCard title="Profile" icon={User}>
      <div className="grid grid-cols-2 gap-4 mb-4">
        {[
          { label: 'Display Name', val: name, set: setName },
          { label: 'Email',        val: email, set: setEmail },
          { label: 'Organisation', val: org,   set: setOrg },
        ].map(f => (
          <div key={f.label} className={f.label === 'Organisation' ? 'col-span-2 md:col-span-1' : ''}>
            <label className="text-[11px] text-[#8896aa] block mb-1">{f.label}</label>
            <input
              value={f.val} onChange={e => f.set(e.target.value)}
              className="w-full text-sm rounded-md px-3 py-2 bg-[#161b23] border border-[#1e2530] text-[#dde3ed] outline-none focus:border-[#f97316] transition-colors"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button onClick={save} className="px-4 py-1.5 rounded-md text-xs font-medium text-white" style={{ background: '#f97316' }}>
          Save Profile
        </button>
        {saved && <SavedBadge />}
      </div>
    </SectionCard>
  );
}

function NotificationSettings() {
  const [prefs, setPrefs] = useState({
    pipelineAlerts:   true,
    dealClosed:       true,
    weeklyDigest:     true,
    overdueDeals:     true,
    teamActivity:     false,
    geoAlerts:        false,
    marketAlerts:     false,
    browserPush:      false,
  });
  const [saved, setSaved] = useState(false);

  function toggle(key: string) {
    setPrefs(p => ({ ...p, [key]: !p[key as keyof typeof p] }));
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  }

  const items = [
    { key: 'pipelineAlerts', label: 'Pipeline stage changes',   desc: 'When a deal moves stage in pipeline' },
    { key: 'dealClosed',     label: 'Deal closed alerts',       desc: 'Notify when a deal is marked Won or Lost' },
    { key: 'weeklyDigest',   label: 'Weekly pipeline digest',   desc: 'Every Monday 9am — pipeline summary email' },
    { key: 'overdueDeals',   label: 'Overdue close date alerts',desc: 'Deals past close date still active' },
    { key: 'teamActivity',   label: 'Team activity feed',       desc: 'When reps log calls, meetings, demos' },
    { key: 'geoAlerts',      label: 'Geo expansion signals',    desc: 'When a zone score changes significantly' },
    { key: 'marketAlerts',   label: 'Competitor pricing alerts',desc: 'When market pricing data is refreshed' },
    { key: 'browserPush',    label: 'Browser push notifications',desc: 'Real-time alerts in your browser' },
  ];

  return (
    <SectionCard title="Notifications" icon={Bell}>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.key} className="flex items-center justify-between">
            <div>
              <div className="text-sm text-[#dde3ed]">{item.label}</div>
              <div className="text-[11px] text-[#4a5568]">{item.desc}</div>
            </div>
            <Toggle checked={prefs[item.key as keyof typeof prefs]} onChange={() => toggle(item.key)} />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        {saved && <SavedBadge />}
      </div>
    </SectionCard>
  );
}

function APIConnections() {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const apis = [
    {
      name: 'Google Ads Keyword Planner',
      env: 'GOOGLE_ADS_API_KEY',
      field: 'geo_zones.search_growth',
      status: 'disconnected',
      desc: 'Search volume growth for "coworking [city]" — feeds geo expansion scoring',
      docs: 'https://developers.google.com/google-ads/api/docs/start',
      placeholder: 'AIza...',
      value: '',
    },
    {
      name: 'Google Maps Places API',
      env: 'GOOGLE_MAPS_API_KEY',
      field: 'geo_zones.competitor_count',
      status: 'disconnected',
      desc: 'Auto-discover flex space competitors within 3 km of each expansion zone',
      docs: 'https://developers.google.com/maps/documentation/places/web-service',
      placeholder: 'AIza...',
      value: '',
    },
    {
      name: 'Gmail API',
      env: 'GMAIL_OAUTH_TOKEN',
      field: 'activities, leads.email',
      status: 'disconnected',
      desc: 'Sync inbound lead emails → auto-create activity log entries per rep',
      docs: 'https://developers.google.com/gmail/api/guides',
      placeholder: 'ya29.a0...',
      value: '',
    },
    {
      name: 'WhatsApp Business API',
      env: 'WHATSAPP_API_TOKEN',
      field: 'activities, notifications',
      status: 'disconnected',
      desc: 'Send deal-stage alerts and follow-up reminders to sales reps via WhatsApp',
      docs: 'https://developers.facebook.com/docs/whatsapp/cloud-api',
      placeholder: 'EAAx...',
      value: '',
    },
    {
      name: 'Slack Webhooks',
      env: 'SLACK_WEBHOOK_URL',
      field: 'notifications, pipeline alerts',
      status: 'disconnected',
      desc: 'Post Closed Won notifications and weekly pipeline summaries to Slack channels',
      docs: 'https://api.slack.com/messaging/webhooks',
      placeholder: 'https://hooks.slack.com/services/...',
      value: '',
    },
    {
      name: 'Twilio SMS',
      env: 'TWILIO_AUTH_TOKEN',
      field: 'notifications',
      status: 'disconnected',
      desc: 'SMS alerts for high-priority leads and overdue follow-ups',
      docs: 'https://www.twilio.com/docs/sms',
      placeholder: 'SK...',
      value: '',
    },
    {
      name: 'Luminocity3d / NASA VIIRS',
      env: 'GEE_SERVICE_ACCOUNT_KEY',
      field: 'geo_zones.nightlight_index',
      status: 'calibrated',
      desc: 'Nighttime light intensity (nW/cm²/sr) — calibrated manually, Apr 2026',
      docs: 'https://luminocity3d.org/UrbanLights',
      placeholder: '(JSON service account key)',
      value: '',
    },
    {
      name: 'MCA21 Company Filings',
      env: 'MCA21_API_KEY',
      field: 'geo_zones.enterprise_density',
      status: 'disconnected',
      desc: 'Enterprise density — count of registered companies with 50+ employees within 5 km',
      docs: 'https://www.mca.gov.in/content/mca/global/en/mca/master-data.html',
      placeholder: 'mca-...',
      value: '',
    },
    {
      name: 'Razorpay / Stripe',
      env: 'PAYMENT_API_KEY',
      field: 'leads.payment_status',
      status: 'disconnected',
      desc: 'Link deal closure to payment events — auto-move lead to Closed Won on payment',
      docs: 'https://razorpay.com/docs/api/',
      placeholder: 'rzp_live_...',
      value: '',
    },
    {
      name: 'Calendly / Google Calendar',
      env: 'CALENDLY_API_TOKEN',
      field: 'activities.due_date',
      status: 'disconnected',
      desc: 'Sync scheduled demos and site visits directly into the activity log',
      docs: 'https://developer.calendly.com/api-docs',
      placeholder: 'eyJh...',
      value: '',
    },
  ];

  const statusCfg = {
    connected:    { color: '#34d399', bg: 'rgba(52,211,153,0.1)',  label: 'Connected' },
    disconnected: { color: '#f87171', bg: 'rgba(248,113,113,0.1)', label: 'Not connected' },
    calibrated:   { color: '#38bdf8', bg: 'rgba(56,189,248,0.1)',  label: 'Calibrated' },
    manual:       { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',   label: 'Manual' },
  };

  return (
    <SectionCard title="API Connections" icon={Zap}>
      <div className="mb-3 p-3 rounded-lg text-xs text-[#8896aa] border" style={{ background: '#161b23', borderColor: '#fbbf24' + '30' }}>
        <span className="text-[#fbbf24]">⚠ Demo mode</span> — All metrics use simulated data. To wire a real API, set the environment variable and redeploy.
      </div>
      <div className="space-y-4">
        {apis.map(api => {
          const cfg = statusCfg[api.status as keyof typeof statusCfg];
          const visible = showKeys[api.name];
          return (
            <div key={api.name} className="p-3 rounded-lg" style={{ background: '#161b23' }}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="text-sm font-medium text-[#dde3ed] flex items-center gap-2">
                    {api.name}
                    <a href={api.docs} target="_blank" rel="noopener noreferrer" className="text-[#4a5568] hover:text-[#8896aa]">
                      <ExternalLink size={11} />
                    </a>
                  </div>
                  <div className="text-[11px] text-[#4a5568] mt-0.5">{api.desc}</div>
                  <div className="flex items-center gap-1 mt-1 text-[10px]">
                    <span className="text-[#4a5568]">Powers:</span>
                    <span className="font-mono text-[#a78bfa]">{api.field}</span>
                  </div>
                </div>
                <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: cfg.bg, color: cfg.color }}>
                  {cfg.label}
                </span>
              </div>
              <div className="flex gap-2 mt-2">
                <div className="relative flex-1">
                  <input
                    type={visible ? 'text' : 'password'}
                    defaultValue={api.value}
                    placeholder={`${api.env}=  ${api.placeholder}`}
                    className="w-full text-[11px] font-mono rounded px-2.5 py-1.5 bg-[#0f1318] border border-[#1e2530] text-[#dde3ed] outline-none focus:border-[#f97316] pr-8"
                  />
                  <button onClick={() => setShowKeys(p => ({ ...p, [api.name]: !p[api.name] }))}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#4a5568] hover:text-[#8896aa]"
                  >{visible ? <EyeOff size={11} /> : <Eye size={11} />}</button>
                </div>
                <button className="px-3 py-1.5 rounded text-[11px] border border-[#1e2530] text-[#8896aa] hover:text-[#dde3ed] hover:border-[#2d3848] whitespace-nowrap">
                  Test connection
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

function DataSettings() {
  const [refreshRate, setRefreshRate] = useState('30s');
  const [retentionDays, setRetentionDays] = useState(90);
  const [autoSeed, setAutoSeed] = useState(true);
  const [saved, setSaved] = useState(false);

  function save() { setSaved(true); setTimeout(() => setSaved(false), 2000); }

  return (
    <SectionCard title="Data & Refresh" icon={Database}>
      <div className="space-y-4">
        <div>
          <label className="text-[11px] text-[#8896aa] block mb-2">Dashboard refresh rate</label>
          <div className="flex gap-2">
            {['15s','30s','1m','5m','Manual'].map(r => (
              <button key={r} onClick={() => setRefreshRate(r)}
                className="px-3 py-1.5 rounded text-xs transition-colors"
                style={{
                  background: refreshRate === r ? 'rgba(249,115,22,0.15)' : '#161b23',
                  color: refreshRate === r ? '#f97316' : '#8896aa',
                  border: `1px solid ${refreshRate === r ? 'rgba(249,115,22,0.4)' : '#1e2530'}`,
                }}
              >{r}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] text-[#8896aa] block mb-1">Snapshot retention window</label>
          <div className="flex items-center gap-3">
            <input type="range" min={30} max={365} step={30} value={retentionDays}
              onChange={e => setRetentionDays(Number(e.target.value))}
              className="flex-1 accent-orange-500"
            />
            <span className="font-mono text-sm text-[#f97316] w-16 text-right">{retentionDays} days</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-[#dde3ed]">Auto-seed on startup</div>
            <div className="text-[11px] text-[#4a5568]">Populate demo data if DB is empty (for hosted deployments)</div>
          </div>
          <Toggle checked={autoSeed} onChange={setAutoSeed} />
        </div>

        <div className="flex items-center gap-3 pt-2 border-t border-[#1e2530]">
          <button onClick={save} className="px-4 py-1.5 rounded-md text-xs font-medium text-white" style={{ background: '#f97316' }}>
            Save
          </button>
          {saved && <SavedBadge />}
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-[#1e2530] text-[#8896aa] hover:text-[#dde3ed] ml-auto">
            <RefreshCw size={11} />Force re-seed DB
          </button>
        </div>
      </div>
    </SectionCard>
  );
}

function ExportSettings() {
  const [format, setFormat]       = useState('csv');
  const [timezone, setTimezone]   = useState('Asia/Kolkata');
  const [currency, setCurrency]   = useState('INR');
  const [includeWon, setIncludeWon] = useState(true);
  const [includeLost, setIncludeLost] = useState(false);

  return (
    <SectionCard title="Export Preferences" icon={Download}>
      <div className="space-y-4">
        <div>
          <label className="text-[11px] text-[#8896aa] block mb-2">Default export format</label>
          <div className="flex gap-2">
            {['CSV', 'JSON', 'XLSX (coming)'].map(f => (
              <button key={f}
                onClick={() => f !== 'XLSX (coming)' && setFormat(f.toLowerCase())}
                disabled={f === 'XLSX (coming)'}
                className="px-3 py-1.5 rounded text-xs transition-colors"
                style={{
                  background: format === f.toLowerCase() ? 'rgba(249,115,22,0.15)' : '#161b23',
                  color: format === f.toLowerCase() ? '#f97316' : f === 'XLSX (coming)' ? '#2d3848' : '#8896aa',
                  border: `1px solid ${format === f.toLowerCase() ? 'rgba(249,115,22,0.4)' : '#1e2530'}`,
                  cursor: f === 'XLSX (coming)' ? 'not-allowed' : 'pointer',
                }}
              >{f}</button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-[#8896aa] block mb-1">Timezone</label>
            <select value={timezone} onChange={e => setTimezone(e.target.value)}
              className="w-full text-xs rounded-md px-3 py-2 bg-[#161b23] border border-[#1e2530] text-[#dde3ed] outline-none focus:border-[#f97316]"
            >
              {['Asia/Kolkata','Asia/Singapore','UTC','America/New_York','Europe/London'].map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] text-[#8896aa] block mb-1">Currency display</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)}
              className="w-full text-xs rounded-md px-3 py-2 bg-[#161b23] border border-[#1e2530] text-[#dde3ed] outline-none focus:border-[#f97316]"
            >
              {['INR','USD','SGD','GBP'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          {[
            { key: 'includeWon',  label: 'Include Closed Won in exports',  val: includeWon,  set: setIncludeWon },
            { key: 'includeLost', label: 'Include Closed Lost in exports', val: includeLost, set: setIncludeLost },
          ].map(p => (
            <div key={p.key} className="flex items-center justify-between">
              <span className="text-sm text-[#dde3ed]">{p.label}</span>
              <Toggle checked={p.val} onChange={p.set} />
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function AppearanceSettings() {
  const [density, setDensity]     = useState('comfortable');
  const [numbers, setNumbers]     = useState('lakhs');
  const [animations, setAnimations] = useState(true);

  return (
    <SectionCard title="Appearance" icon={Palette}>
      <div className="space-y-4">
        <div>
          <label className="text-[11px] text-[#8896aa] block mb-1">Theme</label>
          <div className="flex gap-2">
            {['Dark (current)', 'Light (coming)', 'System (coming)'].map(t => (
              <button key={t}
                disabled={t !== 'Dark (current)'}
                className="px-3 py-1.5 rounded text-xs"
                style={{
                  background: t === 'Dark (current)' ? 'rgba(249,115,22,0.15)' : '#161b23',
                  color: t === 'Dark (current)' ? '#f97316' : '#2d3848',
                  border: `1px solid ${t === 'Dark (current)' ? 'rgba(249,115,22,0.4)' : '#1e2530'}`,
                  cursor: t === 'Dark (current)' ? 'default' : 'not-allowed',
                }}
              >{t}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] text-[#8896aa] block mb-2">Table density</label>
          <div className="flex gap-2">
            {['compact','comfortable','spacious'].map(d => (
              <button key={d} onClick={() => setDensity(d)}
                className="px-3 py-1.5 rounded text-xs capitalize"
                style={{
                  background: density === d ? 'rgba(249,115,22,0.15)' : '#161b23',
                  color: density === d ? '#f97316' : '#8896aa',
                  border: `1px solid ${density === d ? 'rgba(249,115,22,0.4)' : '#1e2530'}`,
                }}
              >{d}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] text-[#8896aa] block mb-2">Number format</label>
          <div className="flex gap-2">
            {[['lakhs', '₹12.5L'], ['crores', '₹1.25Cr'], ['full', '₹1,25,000']].map(([k, ex]) => (
              <button key={k} onClick={() => setNumbers(k)}
                className="px-3 py-1.5 rounded text-xs"
                style={{
                  background: numbers === k ? 'rgba(249,115,22,0.15)' : '#161b23',
                  color: numbers === k ? '#f97316' : '#8896aa',
                  border: `1px solid ${numbers === k ? 'rgba(249,115,22,0.4)' : '#1e2530'}`,
                }}
              >{ex}</button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-[#dde3ed]">Page transition animations</div>
            <div className="text-[11px] text-[#4a5568]">Fade-in and slide effects between pages</div>
          </div>
          <Toggle checked={animations} onChange={setAnimations} />
        </div>
      </div>
    </SectionCard>
  );
}

function SecuritySettings() {
  const [showPass, setShowPass]   = useState(false);
  const [username, setUsername]   = useState('Tablespace');
  const [password, setPassword]   = useState('Ramki@Altera');
  const [saved, setSaved]         = useState(false);
  const [twoFA, setTwoFA]         = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('8h');

  function save() { setSaved(true); setTimeout(() => setSaved(false), 2000); }

  return (
    <SectionCard title="Security & Access" icon={Shield}>
      <div className="mb-4 p-3 rounded-lg border" style={{ background: 'rgba(56,189,248,0.05)', borderColor: 'rgba(56,189,248,0.2)' }}>
        <div className="text-xs text-[#38bdf8] font-medium mb-1">Basic Auth Protection</div>
        <div className="text-[11px] text-[#8896aa]">
          This app is protected by HTTP Basic Auth via <span className="font-mono text-[#a78bfa]">middleware.ts</span>.
          Credentials are set via environment variables <span className="font-mono text-[#a78bfa]">BASIC_AUTH_USER</span> and <span className="font-mono text-[#a78bfa]">BASIC_AUTH_PASS</span>.
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <label className="text-[11px] text-[#8896aa] block mb-1">Username</label>
          <input value={username} onChange={e => setUsername(e.target.value)}
            className="w-full text-sm rounded-md px-3 py-2 bg-[#161b23] border border-[#1e2530] text-[#dde3ed] outline-none focus:border-[#f97316]"
          />
        </div>
        <div>
          <label className="text-[11px] text-[#8896aa] block mb-1">Password</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={password} onChange={e => setPassword(e.target.value)}
              className="w-full text-sm rounded-md px-3 py-2 pr-10 bg-[#161b23] border border-[#1e2530] text-[#dde3ed] outline-none focus:border-[#f97316]"
            />
            <button onClick={() => setShowPass(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4a5568] hover:text-[#8896aa]">
              {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <label className="text-[11px] text-[#8896aa] block mb-2">Session timeout</label>
          <div className="flex gap-2">
            {['1h','4h','8h','24h','Never'].map(t => (
              <button key={t} onClick={() => setSessionTimeout(t)}
                className="px-3 py-1.5 rounded text-xs"
                style={{
                  background: sessionTimeout === t ? 'rgba(249,115,22,0.15)' : '#161b23',
                  color: sessionTimeout === t ? '#f97316' : '#8896aa',
                  border: `1px solid ${sessionTimeout === t ? 'rgba(249,115,22,0.4)' : '#1e2530'}`,
                }}
              >{t}</button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-[#dde3ed]">Two-factor authentication</div>
            <div className="text-[11px] text-[#4a5568]">Coming soon — TOTP via authenticator app</div>
          </div>
          <Toggle checked={twoFA} onChange={setTwoFA} />
        </div>
      </div>

      <div className="p-3 rounded-lg text-xs text-[#8896aa]" style={{ background: '#161b23' }}>
        <div className="flex items-center gap-1.5 text-[#fbbf24] mb-1"><AlertTriangle size={11} />Note</div>
        Changing credentials here updates the UI display only. To actually change auth, update <span className="font-mono text-[#a78bfa]">BASIC_AUTH_USER</span> / <span className="font-mono text-[#a78bfa]">BASIC_AUTH_PASS</span> env vars in your hosting platform and redeploy.
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button onClick={save} className="px-4 py-1.5 rounded-md text-xs font-medium text-white" style={{ background: '#f97316' }}>Save</button>
        {saved && <SavedBadge />}
      </div>
    </SectionCard>
  );
}

function DeploymentInfo() {
  return (
    <SectionCard title="Deployment & Hosting" icon={Globe}>
      <div className="space-y-3">
        {[
          { label: 'Platform',     value: 'Vercel (free tier)',         color: '#34d399' },
          { label: 'Framework',    value: 'Next.js 14 App Router',      color: '#dde3ed' },
          { label: 'Database',     value: 'SQLite (node:sqlite, in-memory on serverless)', color: '#dde3ed' },
          { label: 'Auth',         value: 'HTTP Basic Auth (middleware.ts)', color: '#dde3ed' },
          { label: 'Cold start',   value: '~0ms (Vercel edge-cached static)', color: '#34d399' },
          { label: 'Node version', value: '22.x (required for node:sqlite)', color: '#dde3ed' },
          { label: 'Version',      value: 'v1.2.0 — TableSpace BI Suite', color: '#f97316' },
        ].map(r => (
          <div key={r.label} className="flex items-center justify-between py-1.5 border-b border-[#1e2530]">
            <span className="text-[11px] text-[#4a5568]">{r.label}</span>
            <span className="text-xs font-mono" style={{ color: r.color }}>{r.value}</span>
          </div>
        ))}

        <div className="mt-3 pt-2">
          <div className="text-[11px] text-[#8896aa] mb-2">Quick links</div>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: 'Vercel Dashboard', href: 'https://vercel.com/dashboard' },
              { label: 'GitHub Repo', href: 'https://github.com' },
              { label: 'Vercel Docs', href: 'https://vercel.com/docs' },
            ].map(l => (
              <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 rounded text-xs border border-[#1e2530] text-[#8896aa] hover:text-[#dde3ed] hover:border-[#2d3848] transition-colors"
              >{l.label}<ExternalLink size={10} /></a>
            ))}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

// ── Nav tabs ──────────────────────────────────────────────────
const TABS = [
  { key: 'profile',     label: 'Profile',     icon: User },
  { key: 'notifications',label: 'Notifications',icon: Bell },
  { key: 'apis',        label: 'API Keys',    icon: Zap },
  { key: 'data',        label: 'Data',        icon: Database },
  { key: 'export',      label: 'Export',      icon: Download },
  { key: 'appearance',  label: 'Appearance',  icon: Palette },
  { key: 'security',    label: 'Security',    icon: Shield },
  { key: 'deployment',  label: 'Deployment',  icon: Globe },
] as const;

// ── Main page ─────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<typeof TABS[number]['key']>('profile');

  return (
    <div className="p-6 page-enter">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-[#dde3ed]">Settings</h1>
        <div className="text-xs text-[#8896aa] mt-0.5">Manage preferences, API connections, security, and deployment</div>
      </div>

      <div className="flex gap-6">
        {/* Left nav */}
        <div className="w-44 shrink-0">
          <div className="space-y-0.5">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-all text-left"
                  style={{
                    background: active ? 'rgba(249,115,22,0.1)' : 'transparent',
                    color: active ? '#f97316' : '#8896aa',
                    borderLeft: active ? '2px solid #f97316' : '2px solid transparent',
                  }}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                  {active && <ChevronRight size={12} className="ml-auto" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === 'profile'       && <ProfileSettings />}
          {activeTab === 'notifications' && <NotificationSettings />}
          {activeTab === 'apis'          && <APIConnections />}
          {activeTab === 'data'          && <DataSettings />}
          {activeTab === 'export'        && <ExportSettings />}
          {activeTab === 'appearance'    && <AppearanceSettings />}
          {activeTab === 'security'      && <SecuritySettings />}
          {activeTab === 'deployment'    && <DeploymentInfo />}
        </div>
      </div>

      <LastUpdated />
    </div>
  );
}
