'use client';
import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/lib/wagmi-config';
import { robinhoodChain } from '@/lib/chains';
import { useEffect, useState } from 'react';

const queryClient = new QueryClient();

const PLACEHOLDER_APP_ID = 'placeholder-app-id';

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? PLACEHOLDER_APP_ID;

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
      console.error(
        '[Beam] NEXT_PUBLIC_PRIVY_APP_ID environment variable is missing or empty. ' +
        'Copy .env.local.example to .env.local and fill in your Privy App ID.',
      );
    }
  }, []);

  // IMPORTANT: providers must stay mounted at all times so wagmi can reconnect
  // in the background without losing the session. Only gate *children* rendering,
  // not the provider tree itself — returning null here would destroy the wagmi
  // context on every navigation and force a full reconnect on each page.
  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ['apple', 'google', 'twitter', 'wallet'],
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
        defaultChain: robinhoodChain,
        supportedChains: [robinhoodChain],
        appearance: {
          theme: 'light',
          accentColor: '#2589c4',
          logo: 'https://usebe.am/svg star.svg',
          landingHeader: 'Sign in to Beam',
          loginMessage: 'Send and receive any token as a shareable link.',
          walletChainType: 'ethereum-only',
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          {/* Gate children — not the providers — to avoid hydration mismatches */}
          {mounted ? children : null}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
