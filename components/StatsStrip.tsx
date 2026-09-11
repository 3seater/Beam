'use client';

export interface Metric {
  value: string | null;
  label: string;
}

export type StatsStripProps = {
  metrics?: [Metric, Metric, Metric];
};

const STATIC_METRICS: [Metric, Metric, Metric] = [
  { value: '10,000+', label: 'Beams Sent' },
  { value: '$500K+', label: 'Value Transferred' },
  { value: '12+', label: 'Supported Assets' },
];

export function StatsStrip({ metrics = STATIC_METRICS }: StatsStripProps) {
  return (
    <div
      className="flex items-stretch gap-3 w-full"
      aria-label="Product metrics"
      role="list"
    >
      {metrics.map((m, i) => (
        <div
          key={i}
          role="listitem"
          className="glass-sm flex-1 flex flex-col items-center gap-1 py-5 px-4"
          aria-label={`${m.label}: ${m.value ?? '—'}`}
        >
          <span className="text-3xl font-medium text-white tracking-tight">
            {m.value ?? '—'}
          </span>
          <span className="text-sm text-white/50 text-center leading-snug">
            {m.label}
          </span>
        </div>
      ))}
    </div>
  );
}
