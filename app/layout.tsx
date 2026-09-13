import type { Metadata } from 'next';
import './globals.css';
import './premium.css';
import { Navbar } from '@/components/Navbar';
import { Preloader } from '@/components/Preloader';
import { Providers } from '@/components/providers/PrivyProviderWrapper';

const siteTitle = 'Beam — Send crypto. Share a link.';
const siteDescription =
  'Send crypto and stock tokens to anyone with a simple link. They can claim with Apple or Google. No existing wallet needed.';
const shareImage = {
  url: '/social/beam-opengraph.png',
  width: 1200,
  height: 630,
  alt: 'Crypto and stock token icons floating in frosted glass tiles against a sky-blue background.',
};

export const metadata: Metadata = {
  metadataBase: new URL('https://usebeam.netlify.app'),
  title: siteTitle,
  description: siteDescription,
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
          <Preloader />
          {/* Navbar lives here — renders once, never unmounts on navigation */}
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
