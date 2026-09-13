export function Skeleton({ className = '' }: { className?: string }) {
  return <span className={`beam-skeleton ${className}`} aria-hidden="true" />;
}
