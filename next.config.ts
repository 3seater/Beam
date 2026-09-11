import type { NextConfig } from "next";

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
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Stub out @x402 peer-optional modules from @coinbase/cdp-sdk that
      // are not installed (Coinbase payment protocol; not used in this app).
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        "@x402/evm/upto/client": false,
        "@x402/evm/exact/client": false,
        "@x402/core/client": false,
        "@x402/svm/exact/client": false,
        "@x402/evm": false,
        "@x402/core": false,
        "@x402/extensions": false,
        "@x402/svm": false,
      };
    } else {
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        "@x402/evm/upto/client": false,
        "@x402/evm/exact/client": false,
        "@x402/core/client": false,
        "@x402/svm/exact/client": false,
        "@x402/evm": false,
        "@x402/core": false,
        "@x402/extensions": false,
        "@x402/svm": false,
      };
    }
    return config;
  },
};

export default nextConfig;
