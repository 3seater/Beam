import type { Metadata } from 'next';
import './globals.css';
import './premium.css';
import { Navbar } from '@/components/Navbar';
import { Providers } from '@/components/providers/PrivyProviderWrapper';

export const metadata: Metadata = {
  title: 'Beam',
  description:
    'Send ETH and tokens as a shareable link. No wallet required to receive — just a social login.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          {/* Navbar lives here — renders once, never unmounts on navigation */}
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
