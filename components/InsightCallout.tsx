import { Lightbulb } from 'lucide-react';

interface Props {
  insight: string;
}

export default function InsightCallout({ insight }: Props) {
  return (
    <div
      className="flex items-start gap-3 rounded-card p-4 mb-6 text-sm"
      style={{
        border: '1px solid rgba(249,115,22,0.3)',
        background: 'rgba(249,115,22,0.06)',
      }}
    >
      <Lightbulb size={16} className="shrink-0 mt-0.5" style={{ color: '#f97316' }} />
      <span style={{ color: '#dde3ed', lineHeight: '1.6' }}>{insight}</span>
    </div>
  );
}
