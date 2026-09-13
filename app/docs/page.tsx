import type { Metadata } from 'next';
import './docs.css';
import { DocsPageClient } from './DocsPageClient';

export const metadata: Metadata = {
  title: 'Docs — Beam',
  description:
    'Learn how to send stocks and crypto by link, create Spectrum bundles, and understand Beam’s escrow contracts and gasless claims.',
};

export default function DocsPage() {
  return <DocsPageClient />;
}
