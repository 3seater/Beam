/**
 * lib/robinhood-tokens.ts
 *
 * Fetches the canonical Robinhood Stock Token list from the official
 * Robinhood Chain REST API: GET https://api.robinhood.com/rhj/assets
 *
 * Logos: Parqet CDN (real company logos) with Robinhood CDN as fallback.
 * The fallback snapshot is checked against onchain code, symbol, decimals,
 * and Robinhood asset ID by scripts/audit-rh-assets.cjs.
 */

import snapshot from './rh-assets-snapshot.json';
import communityTokens from './community-tokens.json';

const ROBINHOOD_CHAIN_ID = 4663;

export interface RHToken {
  symbol: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
  logoUrl: string;
  /** USD bid price — populated after fetchTokenPrices() */
  priceUsd?: number;
  isStock: boolean;
}

/**
 * Returns the best available logo URL for a stock ticker symbol.
 * Uses Parqet CDN — real company logos (not Robinhood-branded), free, no auth.
 * The TokenLogo component handles 404s gracefully with initials fallback.
 */
export function stockLogoUrl(ticker: string): string {
  return `https://assets.parqet.com/logos/symbol/${ticker.toUpperCase()}?format=png`;
}

/* ── WETH, USDG, and community tokens hardcoded (not in /rhj/assets) ──────── */
const CHAIN_TOKENS: RHToken[] = [
  ...communityTokens.map(token => ({ ...token, address: token.address as `0x${string}` })),
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: '0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73',
    decimals: 18,
    logoUrl: 'https://coin-images.coingecko.com/coins/images/2518/small/weth.png?1696503332',
    isStock: false,
  },
  {
    symbol: 'USDG',
    name: 'Global Dollar',
    address: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168',
    decimals: 18,
    logoUrl: 'https://coin-images.coingecko.com/coins/images/51281/small/GDN_USDG_Token_200x200.png?1730484111',
    isStock: false,
  },
  // ── Top community / meme tokens on Robinhood Chain ──────────────────────
  // Addresses verified from Phemex, Gate.io, Binance, Bitget, OKX (Sept 2026)
  // Logos: DexScreener CDN — sourced directly from each token's verified pair page
  {
    symbol: 'CASHCAT',
    name: 'Cash Cat',
    address: '0x020bfC650A365f8BB26819deAAbF3E21291018b4',
    decimals: 18,
    logoUrl: 'https://cdn.dexscreener.com/cms/images/Lq7a3pS9Wn8EuGp0?width=64&height=64&quality=95&format=auto',
    isStock: false,
  },
  {
    symbol: 'PONS',
    name: 'Pons',
    address: '0x39dBED3a2bd333467115dE45665cC57F813C4571',
    decimals: 18,
    logoUrl: 'https://cdn.dexscreener.com/cms/images/dkmXs8KYMyMXjuU1?width=64&height=64&quality=95&format=auto',
    isStock: false,
  },
  {
    symbol: 'AI',
    name: 'Artificial Inu',
    address: '0x2e8c31162b855a2ffa90f6f8634643ad6f111e18',
    decimals: 18,
    logoUrl: 'https://cdn.dexscreener.com/cms/images/U6RIzs8Fm7Jar6GE?width=64&height=64&quality=95&format=auto',
    isStock: false,
  },
  {
    symbol: 'MEME',
    name: 'A Meme Coin',
    address: '0x385f4f8ae47651ce5f58f5265395a669f8281e18',
    decimals: 18,
    logoUrl: 'https://cdn.dexscreener.com/cms/images/pPWqEwHoGm1tbUMt?width=64&height=64&quality=95&format=auto',
    isStock: false,
  },
];

// Official catalog snapshot, updated only after scripts/audit-rh-assets.cjs verifies every contract.
export const STARTER_ASSETS: RHToken[] = [...mapStockTokens(snapshot.assets), ...CHAIN_TOKENS];

/* ── Robinhood API shapes ─────────────────────────────────────────────────── */
interface RHJDeployment {
  contractAddress: string;
  chainId: number;
}

interface RHJAsset {
  tokenSymbol: string;
  tokenName: string;
  deployments: RHJDeployment[];
  logoUrl: string;
  status: string;
  currentMultiplier: string;
  tokenDecimals: number;
}

interface RHJAssetsResponse {
  assets: RHJAsset[];
}

/* ── Module-level cache ───────────────────────────────────────────────────── */
let _cache: RHToken[] | null = null;
let _cacheTime = 0;
let _usingSnapshot = false;

export function isTokenCatalogUsingSnapshot() { return _usingSnapshot; }

function mapStockTokens(assets: RHJAsset[]): RHToken[] {
  return assets.filter((asset) => asset.status === 'ASSET_STATUS_ACTIVE').flatMap((asset): RHToken[] => {
    const deployment = asset.deployments.find((d) => d.chainId === ROBINHOOD_CHAIN_ID);
    if (!deployment || !/^0x[0-9a-fA-F]{40}$/.test(deployment.contractAddress)) return [];
    if (!Number.isInteger(asset.tokenDecimals) || asset.tokenDecimals < 0 || asset.tokenDecimals > 255) return [];
    return [{ symbol: asset.tokenSymbol, name: asset.tokenName.replace(' • Robinhood Token', '').replace(' • Robinhood ETF Token', ''), address: deployment.contractAddress as `0x${string}`, decimals: asset.tokenDecimals, logoUrl: stockLogoUrl(asset.tokenSymbol), isStock: true }];
  }).sort((a, b) => a.symbol.localeCompare(b.symbol));
}

/**
 * Returns the full token list — stock tokens first (alphabetical), then
 * chain tokens. Successful responses are cached for five minutes.
 *
 * For stock tokens returned by the API we use the Parqet CDN logo (real
 * company logo) rather than the Robinhood CDN branded image, for a better
 * visual experience when users browse the token grid.
 *
 * On fetch failure uses the full verified snapshot without caching the failure.
 */
export async function fetchRobinhoodTokens(): Promise<RHToken[]> {
  if (_cache && Date.now() - _cacheTime < 300_000) return _cache;

  try {
    const res = await fetch('/api/tokens', { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) throw new Error(`RHJ assets HTTP ${res.status}`);

    const data: RHJAssetsResponse = await res.json();

    const stocks = mapStockTokens(data.assets);
    if (!stocks.length) throw new Error('No active Robinhood Chain stocks in catalog');

    _cache = [...stocks, ...CHAIN_TOKENS];
    _cacheTime = Date.now();
    _usingSnapshot = false;
    return _cache;
  } catch (err) {
    console.warn('[robinhood-tokens] fetch failed, using verified catalog snapshot:', err);
    _usingSnapshot = true;
    return STARTER_ASSETS;
  }
}

/** Invalidate the module cache (for testing / manual refresh). */
export function clearTokenCache() {
  _cache = null;
  _cacheTime = 0;
  _usingSnapshot = false;
}

/**
 * Nineteen quick-pick assets, mixed across four rows with native ETH first.
 * Order matches the desired display order in the UI.
 */
export const POPULAR_SYMBOLS = [
  'NVDA', 'INDEX', 'AAPL', 'TSLA',
  'MOO', 'MSFT', 'CASHCAT', 'META', 'GOOGL',
  'AMZN', 'HOOKR', 'SPCX', 'PONS', 'MU',
  'DELTA', 'USDG', 'AI', 'TENDIES', 'MEME',
];
