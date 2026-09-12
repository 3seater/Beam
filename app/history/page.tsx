import dynamic from 'next/dynamic';

const HistoryPageClient = dynamic(
  () => import('./HistoryPageClient').then((m) => m.HistoryPageClient),
  { ssr: false },
);

export default function HistoryPage() {
  return <HistoryPageClient />;
}
