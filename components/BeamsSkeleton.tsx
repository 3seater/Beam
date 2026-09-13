import { Skeleton } from './ui/Skeleton';

export function BeamRowSkeleton() {
  return <div className="beam-history-row" aria-hidden="true">
    <div className="beam-history-info">
      <Skeleton className="beam-history-logo" />
      <Skeleton className="history-amount-skeleton" />
      <Skeleton className="history-usd-skeleton" />
      <span className="beam-history-actions"><Skeleton className="history-action-skeleton" /><Skeleton className="history-action-skeleton" /></span>
    </div>
    <div className="beam-history-meta">
      <span className="beam-history-status"><Skeleton className="history-status-skeleton" /></span>
      <span className="beam-history-cancel"><Skeleton className="history-action-skeleton" /></span>
      <Skeleton className="history-time-skeleton" />
    </div>
  </div>;
}

export function BeamsSkeleton({ panel = true }: { panel?: boolean }) {
  const rows = <div role="status" aria-label="Loading your Beams" aria-busy="true">
    <span className="sr-only">Loading your Beams…</span>
    <div className="flex flex-col divide-y divide-white/[0.06]">{[0, 1, 2].map(i => <BeamRowSkeleton key={i} />)}</div>
  </div>;
  return panel ? <div className="glass-sm rounded-2xl px-4 py-3"><div className="beams-toolbar" aria-hidden="true"><Skeleton className="beams-toolbar-placeholder" /><Skeleton className="beams-toolbar-placeholder" /></div>{rows}</div> : rows;
}
