import type { Metadata } from 'next';
import './docs.css';
import { DocsPageClient } from './DocsPageClient';

export const metadata: Metadata = {
  title: 'Docs — Beam',
  description:
    'Beam protocol documentation. Learn how to send ETH and tokens as shareable links, understand the BeamEscrow smart contract, and integrate with the Relayer.',
};

export default function DocsPage() {
  return <DocsPageClient />;
}
