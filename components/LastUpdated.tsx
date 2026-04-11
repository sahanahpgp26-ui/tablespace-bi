'use client';

import { useEffect, useState } from 'react';

export default function LastUpdated() {
  const [time, setTime] = useState('');

  useEffect(() => {
    function fmt() {
      setTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
    fmt();
    const id = setInterval(fmt, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center gap-2 mt-6 pt-4 border-t border-[#1e2530]">
      <span className="live-dot w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#34d399' }} />
      <span className="text-[11px] text-[#4a5568] font-mono">
        Simulated live · refreshes every 30s · last at {time}
      </span>
    </div>
  );
}
