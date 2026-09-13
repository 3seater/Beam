import type { Metadata } from 'next';
import { DocsLaunch } from './DocsLaunch';
import '../../docs/docs.css';
import './poster.css';

export const metadata: Metadata = {
  title: 'Beam docs announcement — 16:9',
  robots: { index: false, follow: false },
};

export default function DocsLaunchPage() {
  return <DocsLaunch />;
}
