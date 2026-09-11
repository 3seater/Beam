// lib/wagmi-config.ts
import { createConfig, http } from 'wagmi';
import { robinhoodChain } from './chains';

// In the browser we route all RPC calls through /api/rpc (our Next.js proxy)
// so they never hit rpc.mainnet.chain.robinhood.com directly, which blocks
// browser requests with CORS. On the server we can hit the RPC directly.
function rpcUrl(): string {
  if (typeof window !== 'undefined') {
    // Client: use the same-origin proxy to avoid CORS
    return '/api/rpc';
  }
  // Server: hit the RPC directly (no CORS restriction)
  return process.env.NEXT_PUBLIC_RPC_URL ?? 'https://rpc.mainnet.chain.robinhood.com';
}

export const wagmiConfig = createConfig({
  chains: [robinhoodChain],
  transports: {
    [robinhoodChain.id]: http(rpcUrl()),
  },
});
