import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Keep development from overwriting a running production build.
    distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
    webpack(config) {
        // Stub broken optional peer deps that various wallet libraries pull in
        // but this project does not use.
        const stub = path.resolve(__dirname, 'lib/empty-stub.js');
        const stubs = [
            '@solana/wallet-adapter-react',
            '@farcaster/mini-app-solana',
            '@x402/evm/upto/client',
            '@x402/evm',
            '@coinbase/cdp-sdk',
        ];
        for (const pkg of stubs) {
            config.resolve.alias[pkg] = stub;
        }
        return config;
    },
};

export default nextConfig;
