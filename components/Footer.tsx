import Link from 'next/link';
import { BeamMark } from './BeamMark';

const COLUMNS = [
  { title: 'Explore', links: [['How it works', '/#how-it-works'], ['Why Beam', '/#why-beam'], ['FAQ', '/#faq'], ['Docs', '/docs']] },
  { title: 'Product', links: [['Send a Beam', '/send'], ['Claim', '/claim'], ['Your Beams', '/history']] },
  { title: 'Contact', links: [['X (Twitter)', 'https://x.com/use_beam'], ['hello@usebe.am', 'mailto:hello@usebe.am']] },
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
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Beam</span>
        <span>Built on Robinhood Chain</span>
        <span className="footer-token-ca">
          $BEAM is not live · CA: <span className="footer-token-ca-blur" aria-label="Contract address not yet released">0x4a3b9c1f2e8d7a6c5b0e4f3a2d1c9b8e7a6f5d4c</span>
        </span>
      </div>
    </div>
  </footer>;
}
