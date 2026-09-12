'use client';

const FOOTER_COLS = [
  {
    heading: 'Explore',
    links: [
      { label: 'How it works', href: '#how-it-works' },
      { label: 'Why Beam', href: '#why-beam' },
      { label: 'FAQ', href: '#faq' },
      { label: 'Docs', href: 'https://docs.beam.finance', external: true },
    ],
  },
  {
    heading: 'Product',
    links: [
      { label: 'Send a Beam', href: '/send' },
      { label: 'Claim', href: '/claim' },
      { label: 'Robinhood Chain', href: 'https://docs.robinhood.com/chain/', external: true },
    ],
  },
  {
    heading: 'Contact',
    links: [
      { label: 'X (Twitter)', href: 'https://twitter.com/beamfinance', external: true },
      { label: 'hello@beam.finance', href: 'mailto:hello@beam.finance' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative pt-20 pb-10">
      {/* Subtle top separator */}
      <div className="layout mb-16">
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.12)' }} />
      </div>

      <div className="layout">
        {/* Main row — logo left, link columns right */}
        <div className="flex flex-col sm:flex-row gap-12 sm:gap-8">

          {/* Logo column */}
          <div className="flex flex-col gap-4 shrink-0 sm:w-48">
            <a href="/" aria-label="Beam home" className="inline-block w-fit">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/svg star.svg"
                alt="Beam"
                width={48}
                height={48}
                style={{ filter: 'brightness(0) invert(1)', opacity: 0.85 }}
              />
            </a>
            <p
              style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif',
                fontSize: '13px',
                fontWeight: 400,
                color: 'rgba(255,255,255,0.40)',
                lineHeight: '1.6',
                maxWidth: '180px',
              }}
            >
              Send any token as a shareable link. No wallet needed to receive.
            </p>
          </div>

          {/* Link columns */}
          <div className="flex flex-wrap gap-10 sm:gap-12 flex-1 sm:justify-end">
            {FOOTER_COLS.map((col) => (
              <div key={col.heading} className="flex flex-col gap-3 min-w-[110px]">
                <p
                  style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif',
                    fontSize: '12px',
                    fontWeight: 500,
                    color: 'rgba(255,255,255,0.40)',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                  }}
                >
                  {col.heading}
                </p>
                {col.links.map(({ label, href, external }) => (
                  <a
                    key={label}
                    href={href}
                    target={(external as boolean | undefined) ? '_blank' : undefined}
                    rel={(external as boolean | undefined) ? 'noopener noreferrer' : undefined}
                    style={{
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif',
                      fontSize: '14px',
                      fontWeight: 400,
                      color: 'rgba(255,255,255,0.70)',
                      textDecoration: 'none',
                      transition: 'color 150ms ease',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.95)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'rgba(255,255,255,0.70)'; }}
                  >
                    {label}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom row */}
        <div
          className="mt-16 flex items-center justify-between flex-wrap gap-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.10)', paddingTop: '24px' }}
        >
          <p
            style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif',
              fontSize: '13px',
              fontWeight: 400,
              color: 'rgba(255,255,255,0.35)',
            }}
          >
            © {year} Beam. All rights reserved.
          </p>
          <p
            style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif',
              fontSize: '13px',
              fontWeight: 400,
              color: 'rgba(255,255,255,0.30)',
            }}
          >
            Built on Robinhood Chain
          </p>
        </div>
      </div>
    </footer>
  );
}
