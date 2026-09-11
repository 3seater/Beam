import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sky: {
          top: "#0a4a6e",
          mid: "#1a7ab5",
          light: "#4db8f0",
          pale: "#a8dff7",
          white: "#dff0fb",
        },
        glass: {
          white: "rgba(255,255,255,0.14)",
          strong: "rgba(255,255,255,0.24)",
          border: "rgba(255,255,255,0.30)",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "'SF Pro Display'",
          "'SF Pro Text'",
          "'Helvetica Neue'",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
        mono: ["'SF Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
        "4xl": "24px",
        "5xl": "32px",
      },
      keyframes: {
        "float-up": {
          "0%": { opacity: "0", transform: "translateY(20px) scale(0.97)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(100%)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255,255,255,0.20)" },
          "50%": { boxShadow: "0 0 0 6px rgba(255,255,255,0.08)" },
        },
        "spin-slow": {
          "from": { transform: "rotate(0deg)" },
          "to": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "float-up": "float-up   0.55s cubic-bezier(0.22,1,0.36,1) both",
        "scale-in": "scale-in   0.35s cubic-bezier(0.34,1.56,0.64,1) both",
        "slide-up": "slide-up   0.45s cubic-bezier(0.22,1,0.36,1) both",
        "shimmer": "shimmer    2s linear infinite",
        "glow-pulse": "glow-pulse 2.4s ease-in-out infinite",
        "spin-slow": "spin-slow  2s linear infinite",
      },
      backdropBlur: {
        glass: "24px",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(10,74,110,0.25), 0 2px 8px rgba(10,74,110,0.15), inset 0 1px 0 rgba(255,255,255,0.35)",
        "glass-lg": "0 16px 48px rgba(10,74,110,0.30), 0 4px 12px rgba(10,74,110,0.20), inset 0 1.5px 0 rgba(255,255,255,0.45)",
        "glass-sm": "0 4px 16px rgba(10,74,110,0.18), inset 0 1px 0 rgba(255,255,255,0.28)",
      },
    },
  },
  plugins: [],
};

export default config;
