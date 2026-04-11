import DataSourceTooltip from './DataSourceTooltip';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  trend?: string;
  trendUp?: boolean;
  color?: string;
  tooltip?: {
    metric: string;
    source: string;
    method: string;
    confidence: 'High' | 'Medium' | 'Estimated';
    refreshRate: string;
  };
}

export default function KpiCard({ label, value, sub, trend, trendUp, color, tooltip }: Props) {
  return (
    <div className="card flex flex-col gap-2" style={{ minWidth: 0 }}>
      <div className="flex items-center gap-1 text-xs text-[#8896aa]">
        {label}
        {tooltip && <DataSourceTooltip {...tooltip} />}
      </div>
      <div
        className="kpi-num text-2xl font-semibold leading-none truncate"
        style={{ color: color || 'var(--text-primary)' }}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-[#8896aa]">{sub}</div>}
      {trend && (
        <div className="text-xs flex items-center gap-1" style={{ color: trendUp ? '#34d399' : '#f87171' }}>
          <span>{trendUp ? '↑' : '↓'}</span>
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
}
