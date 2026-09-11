import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import './globals.css';

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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
