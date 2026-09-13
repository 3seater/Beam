import dynamic from 'next/dynamic';
import HistoryLoading from './loading';

const HistoryPageClient = dynamic(
  () => import('./HistoryPageClient').then((m) => m.HistoryPageClient),
  { ssr: false, loading: () => <HistoryLoading /> },
);

export default function HistoryPage() {
  return <HistoryPageClient />;
}
