'use client';

import { useState } from 'react';
import { Info } from 'lucide-react';

interface Props {
  metric: string;
  source: string;
  method?: string;   // kept for backwards compat but no longer displayed
  confidence: 'High' | 'Medium' | 'Estimated';
  refreshRate: string;
}

const confidenceColor = {
  High:      '#34d399',
  Medium:    '#fbbf24',
  Estimated: '#a78bfa',
};

const confidenceLabel = {
  High:      'High — directly from internal DB',
  Medium:    'Medium — cross-referenced proxy',
  Estimated: 'Estimated — modelled / proxied data',
};

export default function DataSourceTooltip({ metric, source, confidence, refreshRate }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="relative inline-flex items-center ml-1">
      <button
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className="text-[#4a5568] hover:text-[#8896aa] transition-colors outline-none"
        aria-label={`Data source for ${metric}`}
      >
        <Info size={12} />
      </button>

      {visible && (
        <div
          className="ds-tooltip"
          style={{ bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '6px' }}
        >
          <div className="font-semibold text-[#dde3ed] mb-2 text-xs">{metric}</div>
          <div className="space-y-1.5">
            <Row emoji="📦" label="Source"     value={source} />
            <Row emoji="📊" label="Confidence" value={confidenceLabel[confidence]} valueStyle={{ color: confidenceColor[confidence] }} />
            <Row emoji="🔄" label="Refresh"    value={refreshRate} />
          </div>
        </div>
      )}
    </span>
  );
}

function Row({ emoji, label, value, valueStyle }: {
  emoji: string; label: string; value: string; valueStyle?: React.CSSProperties
}) {
  return (
    <div className="flex gap-1.5 text-[11px]">
      <span>{emoji}</span>
      <span className="text-[#8896aa] shrink-0">{label}:</span>
      <span className="text-[#dde3ed]" style={valueStyle}>{value}</span>
    </div>
  );
}
