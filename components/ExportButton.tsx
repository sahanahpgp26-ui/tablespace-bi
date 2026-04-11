'use client';

import { Download } from 'lucide-react';

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[];
  filename: string;
}

export default function ExportButton({ data, filename }: Props) {
  function exportCsv() {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
      headers.map(h => {
        const val = row[h];
        const s = String(val ?? '');
        return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(',')
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={exportCsv}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-[#8896aa] border border-[#1e2530] hover:border-[#2d3848] hover:text-[#dde3ed] transition-all"
    >
      <Download size={13} />
      Export CSV
    </button>
  );
}
