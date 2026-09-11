'use client';
import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/lib/wagmi-config';
import { robinhoodChain } from '@/lib/chains';
import { useEffect } from 'react';

const queryClient = new QueryClient();

// Placeholder used during SSR/static-generation so the build can complete
// without a real Privy App ID. At runtime (client-side) we validate the
// real value inside the component.
const PLACEHOLDER_APP_ID = 'placeholder-app-id';

export function Providers({ children }: { children: React.ReactNode }) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? PLACEHOLDER_APP_ID;

  // Validate the env var at runtime on the client only, not during
  // static generation. Missing ID causes the SDK to fail gracefully with
  // its own error rather than crashing the build.
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
      console.error(
        '[Beam] NEXT_PUBLIC_PRIVY_APP_ID environment variable is missing or empty. ' +
        'Copy .env.local.example to .env.local and fill in your Privy App ID.',
      );
    }
  }, []);

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        // Social login for claimers (embedded wallet auto-provisioned)
        loginMethods: ['apple', 'google', 'twitter', 'wallet'],
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
        // External wallet options for senders — wagmi handles connector setup via wagmiConfig
        defaultChain: robinhoodChain,
        supportedChains: [robinhoodChain],
        appearance: {
          // Match Beam's sky-blue glass aesthetic
          theme: 'dark',
          accentColor: '#4db8f0',        // --sky-light
          logo: 'https://beam.finance/svg star.svg', // update to your hosted logo URL
          landingHeader: 'Sign in to Beam',
          loginMessage: 'Send and receive any token as a shareable link.',
          walletChainType: 'ethereum-only',
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
