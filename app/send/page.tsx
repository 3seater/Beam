import dynamic from 'next/dynamic';

// SendPageClient uses wagmi/privy hooks — must be client-only.
// ssr:false prevents server-rendering before providers are ready,
// matching the same pattern used by HistoryPageClient.
const SendPageClient = dynamic(
    () => import('./SendPageClient').then((m) => ({ default: m.SendPageClient })),
    { ssr: false },
);

export default function SendPage() {
    return <SendPageClient />;
}
