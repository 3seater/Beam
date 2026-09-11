import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import './globals.css';
import { Navbar } from '@/components/Navbar';

const Providers = dynamic(
  () => import('@/components/providers/PrivyProviderWrapper').then((m) => m.Providers),
  { ssr: false },
);

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
        {/* Giant background logo — fixed, very subtle, slowly drifting */}
        <div className="bg-logo" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 736 736">
            <path d="M413.01,112.99l-3,191.01,193.7-65.86c2.77-.17,2.93,5.64,4.15,7.56l-.84,1.75-170.99,123.04,125.8,124.99-5.83,8.07-170.98-67.56-67.9,191.38-8.47.48,1.36-191.86-194.52,67.86-3.53-8.35,1.08-2,169.91-123.16-124.81-124.65c2.48-2.29,4.09-7.83,7.9-7.32l168.95,65.58,67.14-190.86,10.91-.11Z" />
          </svg>
        </div>
        <Providers>
          {/* Navbar lives here — renders once, never unmounts on navigation */}
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
