import type { NextConfig } from "next";

const STUB_ALIASES = {
  '@react-native-async-storage/async-storage': false,
  '@x402/evm/upto/client': false,
  '@x402/evm/exact/client': false,
  '@x402/core/client': false,
  '@x402/svm/exact/client': false,
  '@x402/evm': false,
  '@x402/core': false,
  '@x402/extensions': false,
  '@x402/svm': false,
} as const;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.robinhood.com',
        pathname: '/ncw_assets/logos/**',
      },
      {
        protocol: 'https',
        hostname: 'coin-images.coingecko.com',
        pathname: '/coins/images/**',
      },
      {
        protocol: 'https',
        hostname: 'assets.parqet.com',
        pathname: '/logos/**',
      },
    ],
  },
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      ...STUB_ALIASES,
    };

    // Suppress the "Critical dependency: dynamic expression" warning from
    // ox/tempo/virtualMasterPool which is a transitive dep of privy → x402 → viem.
    // It's a bundler noise issue — not a runtime problem.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      /Critical dependency: the request of a dependency is an expression/,
      /ox\/_esm\/tempo/,
    ];

    return config;
  },
};

export default nextConfig;
