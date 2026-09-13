export function DataSkeleton({ className = '', label = 'Loading data' }: { className?: string; label?: string }) {
  return <span role="status" aria-label={label} className={`data-skeleton ${className}`}><span className="sr-only">{label}</span></span>;
}
