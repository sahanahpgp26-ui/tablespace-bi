'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, GitMerge, PlusSquare, Settings,
  Users, TrendingUp, Building2, Map, Globe,
  ExternalLink, Layers, UserCheck
} from 'lucide-react';

const SECTIONS = [
  {
    label: 'SALES',
    items: [
      { label: 'Pipeline',         href: '/pipeline',   icon: GitMerge },
      { label: 'Dashboard',        href: '/dashboard',  icon: LayoutDashboard },
      { label: 'Team Performance', href: '/team',       icon: UserCheck },
    ],
  },
  {
    label: 'MARKET',
    items: [
      { label: 'Competitor Intel', href: '/market/competitors', icon: Users },
      { label: 'Market Pricing',   href: '/market/pricing',     icon: TrendingUp },
    ],
  },
  {
    label: 'SPACE',
    items: [
      { label: 'Portfolio Overview', href: '/space',            icon: Building2 },
      { label: 'City Drilldown',     href: '/space/bangalore',  icon: Layers, indent: true },
    ],
  },
  {
    label: 'GEO',
    items: [
      { label: 'Expansion Scoring', href: '/geo',          icon: Map },
      { label: 'Micro-Markets',     href: '/geo/markets',  icon: Globe },
    ],
  },
];

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  indent?: boolean;
}

export default function Sidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/pipeline') return pathname === '/pipeline' || pathname === '/';
    if (href === '/space/bangalore') return pathname.startsWith('/space/');
    // Exact match for /geo to avoid it matching /geo/markets
    if (href === '/geo') return pathname === '/geo';
    return pathname === href || (href !== '/' && pathname.startsWith(href + '/'));
  }

  return (
    <aside
      className="fixed left-0 top-0 h-screen z-30 flex flex-col"
      style={{ width: '220px', background: '#080d14', borderRight: '1px solid #1e2530' }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#1e2530]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#f97316' }}>
            <Building2 size={14} className="text-white" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[#dde3ed] leading-none">TableSpace</div>
            <div className="text-[10px] text-[#8896aa] mt-0.5">BI Suite</div>
          </div>
        </div>
        <SearchBox />
      </div>

      {/* Nav sections */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {SECTIONS.map((section) => (
          <div key={section.label} className="mb-5">
            <div className="px-3 mb-1.5 text-[10px] font-semibold tracking-widest text-[#4a5568]">
              {section.label}
            </div>
            {(section.items as NavItem[]).map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 py-2 rounded-md mb-0.5 text-sm transition-all ${active ? 'nav-active' : 'nav-inactive'}`}
                  style={{
                    paddingLeft: item.indent ? '28px' : '12px',
                    paddingRight: '12px',
                  }}
                >
                  {item.indent ? (
                    <span className="flex items-center gap-1.5 text-[#4a5568]">
                      <span className="text-[10px] leading-none" style={{ marginLeft: '-4px' }}>└</span>
                      <Icon size={13} style={{ color: active ? '#f97316' : undefined }} />
                    </span>
                  ) : (
                    <Icon size={15} style={{ color: active ? '#f97316' : undefined }} />
                  )}
                  <span className={item.indent ? 'text-xs' : ''}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}

        {/* Settings */}
        <div className="mb-5">
          <div className="px-3 mb-1.5 text-[10px] font-semibold tracking-widest text-[#4a5568]">SETTINGS</div>
          <Link
            href="/settings"
            className={`flex items-center gap-2.5 px-3 py-2 rounded-md mb-0.5 text-sm transition-all ${pathname === '/settings' ? 'nav-active' : 'nav-inactive'}`}
          >
            <Settings size={15} style={{ color: pathname === '/settings' ? '#f97316' : undefined }} />
            <span>Settings</span>
          </Link>
          <a
            href="/submit"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-2 rounded-md mb-0.5 text-sm transition-all nav-inactive"
          >
            <PlusSquare size={15} />
            <span className="flex-1">Add Lead</span>
            <ExternalLink size={11} className="opacity-50" />
          </a>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#1e2530]">
        <div className="flex items-center gap-2 mb-1">
          <span className="live-dot w-1.5 h-1.5 rounded-full bg-[#34d399] inline-block"></span>
          <span className="text-[11px] text-[#8896aa]">Mock data · Apr 2026</span>
        </div>
        <div className="text-[10px] text-[#4a5568] font-mono">v1.2.0</div>
      </div>
    </aside>
  );
}

// ─── Global Search ────────────────────────────────────────────
function SearchBox() {
  return (
    <div className="mt-3 relative">
      <input
        type="text"
        placeholder="Search…"
        className="w-full text-xs rounded-md px-3 py-1.5 bg-[#0f1318] border border-[#1e2530] text-[#dde3ed] placeholder:text-[#4a5568] outline-none focus:border-[#f97316] transition-colors"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const val = (e.target as HTMLInputElement).value.trim();
            if (val) window.location.href = `/search?q=${encodeURIComponent(val)}`;
          }
        }}
      />
    </div>
  );
}
