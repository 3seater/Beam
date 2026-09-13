import type { CSSProperties } from 'react';

type Palette = readonly [string, string, string, string];

// Logo colors, shared by previews and real receipts. Keep the tint translucent
// so the card remains frosted white and status colors retain their meaning.
const PALETTES: Record<string, Palette> = {
  ETH: ['121, 135, 198', '166, 175, 221', '121, 135, 198', '166, 175, 221'],
  NVDA: ['118, 185, 0', '160, 210, 78', '118, 185, 0', '160, 210, 78'],
  MSFT: ['0, 164, 239', '127, 186, 0', '242, 80, 34', '255, 185, 0'],
  GOOGL: ['66, 133, 244', '52, 168, 83', '234, 67, 53', '251, 188, 5'],
  META: ['8, 102, 255', '89, 170, 245', '8, 102, 255', '89, 170, 245'],
  AAPL: ['120, 130, 145', '177, 187, 198', '120, 130, 145', '177, 187, 198'],
  TSLA: ['227, 25, 55', '246, 143, 155', '227, 25, 55', '246, 143, 155'],
  AMZN: ['255, 153, 0', '255, 203, 114', '255, 153, 0', '255, 203, 114'],
  SPCX: ['57, 84, 113', '131, 159, 184', '57, 84, 113', '131, 159, 184'],
  MU: ['0, 112, 198', '110, 181, 229', '0, 112, 198', '110, 181, 229'],
  MEME: ['224, 17, 51', '246, 131, 150', '224, 17, 51', '246, 131, 150'],
  CASHCAT: ['169, 137, 102', '212, 190, 158', '169, 137, 102', '212, 190, 158'],
  AI: ['108, 92, 231', '168, 155, 255', '108, 92, 231', '168, 155, 255'],
  PONS: ['34, 197, 170', '100, 230, 210', '34, 197, 170', '100, 230, 210'],
  BTC: ['247, 147, 26', '255, 204, 139', '247, 147, 26', '255, 204, 139'],
};
const DEFAULT: Palette = ['56, 160, 225', '155, 231, 253', '121, 214, 252', '155, 231, 253'];

export function tokenCardStyle(symbol?: string): CSSProperties {
  const normalized = symbol?.trim().toUpperCase();
  const colors = PALETTES[normalized === 'WETH' ? 'ETH' : normalized ?? ''] ?? DEFAULT;
  return {
    backgroundImage: [
      `radial-gradient(ellipse at 100% 0%, rgba(${colors[0]}, .18), transparent 65%)`,
      `radial-gradient(ellipse at 0% 100%, rgba(${colors[1]}, .12), transparent 65%)`,
      `radial-gradient(ellipse at 0% 0%, rgba(${colors[2]}, .07), transparent 55%)`,
      `radial-gradient(ellipse at 100% 100%, rgba(${colors[3]}, .08), transparent 55%)`,
      'linear-gradient(125deg, #ffffffeb, #ffffffa6)',
    ].join(', '),
  };
}
