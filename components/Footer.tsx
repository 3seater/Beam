import Link from 'next/link';
import { BeamMark } from './BeamMark';

const COLUMNS = [
  { title: 'Explore', links: [['How it works', '/#how-it-works'], ['Why Beam', '/#why-beam'], ['FAQ', '/#faq'], ['Docs', 'https://docs.beam.finance']] },
  { title: 'Product', links: [['Send a Beam', '/send'], ['Claim', '/claim'], ['Your Beams', '/history']] },
  { title: 'Contact', links: [['X (Twitter)', 'https://twitter.com/beamfinance'], ['hello@beam.finance', 'mailto:hello@beam.finance']] },
  { title: 'Legal', links: [['Privacy Policy', '/privacy'], ['Terms of Service', '/terms']] },
];
export function Footer() {
  return <footer className="premium-footer">
    <div className="layout">
      <div className="footer-columns">
        <Link href="/" className="beam-wordmark" aria-label="Beam home"><BeamMark />beam</Link>
        {COLUMNS.map(column => <nav key={column.title} aria-label={column.title}>
          <h3>{column.title}</h3>
          {column.links.map(([label, href]) => <Link key={label} href={href} {...(href.startsWith('https:') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{label}</Link>)}
        </nav>)}
      </div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} Beam</span><span>Built on Robinhood Chain</span></div>
    </div>
  </footer>;
}
