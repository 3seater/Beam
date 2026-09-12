/**
 * Beam Icon System
 * ─────────────────────────────────────────────────────────────────
 * Single source of truth for icon sizes and colors.
 * All components should import from here rather than hard-coding
 * sizes and opacity values inline.
 *
 * SIZE SCALE
 *   xs  — 12  decorative / inline with fine print (timestamps, badges)
 *   sm  — 14  inline with body text (labels, row actions)
 *   md  — 16  buttons, inputs, modal close
 *   lg  — 20  section/feature icons
 *   xl  — 28  hero/CTA glow orbs
 *   2xl — 32  full-screen progress states
 *
 * COLOR TOKENS  (Tailwind className strings)
 *   primary   — text-white           fully opaque, high-emphasis
 *   secondary — text-white/70        standard interactive
 *   muted     — text-white/50        supporting / decorative
 *   dim       — text-white/35        intentionally de-emphasised
 *   success   — text-emerald-300
 *   warn      — text-amber-300
 *   error     — text-red-300
 * ─────────────────────────────────────────────────────────────────
 */

export const ICON_SIZE = {
  xs:  12,
  sm:  14,
  md:  16,
  lg:  20,
  xl:  28,
  xxl: 32,
} as const;

export type IconSize = keyof typeof ICON_SIZE;

export const ICON_COLOR = {
  primary:   'text-white',
  secondary: 'text-white/70',
  muted:     'text-white/50',
  dim:       'text-white/35',
  success:   'text-emerald-300',
  warn:      'text-amber-300',
  error:     'text-red-300',
} as const;

export type IconColor = keyof typeof ICON_COLOR;
