/**
 * lib/robinhood-tokens.ts
 *
 * Fetches the canonical Robinhood Stock Token list from the official
 * Robinhood Chain REST API: GET https://api.robinhood.com/rhj/assets
 *
 * Logos: Parqet CDN (real company logos) with Robinhood CDN as fallback.
 * Contract addresses verified from the live API and cross-checked against
 * the SQD Robinhood Chain data guide (sqd.dev/learn/robinhood-tokenized-stocks).
 */

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

/* ── WETH & USDG hardcoded (not in /rhj/assets, from official docs) ──────── */
const CHAIN_TOKENS: RHToken[] = [
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
];

/**
 * Hardcoded fallback data for the 9 preset stock tokens.
 * Addresses: canonical on-chain contracts on Robinhood Chain (chainId 4663),
 * sourced directly from GET https://api.robinhood.com/rhj/assets.
 * Logos: Parqet CDN — real company logos, not Robinhood-branded images.
 *
 * Used when the API is slow or unavailable so the quick-pick grid always
 * renders immediately with correct addresses and recognizable logos.
 */
const STOCK_TOKEN_FALLBACKS: RHToken[] = [
  { symbol: 'NVDA', name: 'NVIDIA', address: '0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC', decimals: 18, logoUrl: stockLogoUrl('NVDA'), isStock: true },
  { symbol: 'AAPL', name: 'Apple', address: '0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9', decimals: 18, logoUrl: stockLogoUrl('AAPL'), isStock: true },
  { symbol: 'TSLA', name: 'Tesla', address: '0x322F0929c4625eD5bAd873c95208D54E1c003b2d', decimals: 18, logoUrl: stockLogoUrl('TSLA'), isStock: true },
  { symbol: 'MSFT', name: 'Microsoft', address: '0xe93237C50D904957Cf27E7B1133b510C669c2e74', decimals: 18, logoUrl: stockLogoUrl('MSFT'), isStock: true },
  { symbol: 'META', name: 'Meta Platforms', address: '0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35', decimals: 18, logoUrl: stockLogoUrl('META'), isStock: true },
  { symbol: 'GOOGL', name: 'Alphabet', address: '0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3', decimals: 18, logoUrl: stockLogoUrl('GOOGL'), isStock: true },
  { symbol: 'AMZN', name: 'Amazon', address: '0x12f190a9F9d7D37a250758b26824B97CE941bF54', decimals: 18, logoUrl: stockLogoUrl('AMZN'), isStock: true },
  { symbol: 'SPCX', name: 'SpaceX', address: '0x4a0E65A3EcceC6dBe60AE065F2e7bb85Fae35eEa', decimals: 18, logoUrl: stockLogoUrl('SPCX'), isStock: true },
  { symbol: 'MU', name: 'Micron Technology', address: '0xfF080c8ce2E5feadaCa0Da81314Ae59D232d4afD', decimals: 18, logoUrl: stockLogoUrl('MU'), isStock: true },
];

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
}

interface RHJAssetsResponse {
  assets: RHJAsset[];
}

/* ── Module-level cache ───────────────────────────────────────────────────── */
let _cache: RHToken[] | null = null;

const ROBINHOOD_CHAIN_ID = 4663;

/**
 * Returns the full token list — stock tokens first (alphabetical), then
 * chain tokens (WETH, USDG).  Results are cached for the lifetime of the
 * browser session (module scope).
 *
 * For stock tokens returned by the API we use the Parqet CDN logo (real
 * company logo) rather than the Robinhood CDN branded image, for a better
 * visual experience when users browse the token grid.
 *
 * On fetch failure falls back to STOCK_TOKEN_FALLBACKS + CHAIN_TOKENS so
 * the quick-pick grid still shows the 9 preset tokens with correct addresses.
 */
export async function fetchRobinhoodTokens(): Promise<RHToken[]> {
  if (_cache) return _cache;

  try {
    const res = await fetch('https://api.robinhood.com/rhj/assets', { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`RHJ assets HTTP ${res.status}`);

    const data: RHJAssetsResponse = await res.json();

    const stocks: RHToken[] = data.assets
      .filter((a) => a.status === 'ASSET_STATUS_ACTIVE')
      .flatMap((a): RHToken[] => {
        const dep = a.deployments.find((d) => d.chainId === ROBINHOOD_CHAIN_ID);
        if (!dep) return [];
        const addr = dep.contractAddress as `0x${string}`;
        return [{
          symbol: a.tokenSymbol,
          name: a.tokenName.replace(' • Robinhood Token', '').replace(' • Robinhood ETF Token', ''),
          address: addr,
          decimals: 18,
          // Use Parqet CDN for real company logos; falls back to initials in TokenLogo
          logoUrl: stockLogoUrl(a.tokenSymbol),
          isStock: true,
        }];
      })
      .sort((a, b) => a.symbol.localeCompare(b.symbol));

    _cache = [...stocks, ...CHAIN_TOKENS];
    return _cache;
  } catch (err) {
    console.warn('[robinhood-tokens] fetch failed, falling back to preset list:', err);
    _cache = [...STOCK_TOKEN_FALLBACKS, ...CHAIN_TOKENS];
    return _cache;
  }
}

/** Invalidate the module cache (for testing / manual refresh). */
export function clearTokenCache() {
  _cache = null;
}

/**
 * The 9 preset stock tokens shown in the quick-pick grid, plus USDG.
 * Order matches the desired display order in the UI.
 */
export const POPULAR_SYMBOLS = [
  'NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'GOOGL', 'AMZN', 'SPCX', 'MU', 'USDG',
];
