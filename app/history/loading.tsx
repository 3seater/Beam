import { Clock } from 'lucide-react';
import { BeamsSkeleton } from '@/components/BeamsSkeleton';
import { ICON_SIZE } from '@/lib/icons';

export default function HistoryLoading() {
  return <main className="app-page min-h-screen flex flex-col items-center px-4 py-28">
    <div className="w-full max-w-xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Clock size={ICON_SIZE.lg} className="text-white/70" aria-hidden="true" />
          <h1 className="text-3xl font-medium text-white tracking-tight">Your Beams</h1>
        </div>
        <p className="text-white/50 text-sm pl-9">All beams you&apos;ve sent — copy links, track status, or cancel unclaimed ones.</p>
      </div>
      <BeamsSkeleton />
    </div>
  </main>;
}
