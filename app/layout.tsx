import type { Metadata } from 'next';
import './globals.css';
import './premium.css';
import './spectrum.css';
import { Navbar } from '@/components/Navbar';
import { Providers } from '@/components/providers/PrivyProviderWrapper';

const siteTitle = 'Beam — An easier way to send stocks and crypto.';
const siteDescription =
  'An easier way to send stocks and crypto. Send a single asset or a Spectrum bundle through one link. Recipients sign in and claim. No existing wallet needed.';
const shareImage = {
  url: '/social/beam-opengraph.png',
  width: 1200,
  height: 630,
  alt: 'Crypto and stock token icons floating in frosted glass tiles against a sky-blue background.',
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? 'https://usebeam.netlify.app'
  ),
  title: siteTitle,
  description: siteDescription,
  icons: {
    icon: '/favicon.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'Beam',
    title: siteTitle,
    description: siteDescription,
    images: [shareImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    images: [shareImage],
  },
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
