// lib/wagmi-config.ts
import { createConfig, http } from 'wagmi';
import { robinhoodChain } from './chains';

// Privy's WagmiProvider injects wallet connectors automatically.
// We don't register any connectors here to avoid pulling in broken
// peer dependency trees from @wagmi/connectors.
export const wagmiConfig = createConfig({
  chains: [robinhoodChain],
  transports: {
    [robinhoodChain.id]: http(),
  },
});
