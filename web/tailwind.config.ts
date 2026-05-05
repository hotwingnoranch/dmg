import type { Config } from "tailwindcss";

// Vanguard light theme — premium financial-services-meets-protection.
// The "ink" scale is repurposed for a light-mode palette: low numbers
// are dark (foreground/text) and high numbers are near-white (surfaces).
const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#0c0a09",   // primary text
          100: "#1c1917",  // strong text
          200: "#292524",  // dark
          300: "#57534e",  // body / secondary text
          400: "#78716c",  // muted text
          500: "#a8a29e",  // dim
          600: "#d6d3d1",  // strong border
          700: "#e7e5e4",  // soft border
          800: "#f5f5f4",  // tinted card surface
          900: "#fafaf9",  // section background
          950: "#ffffff",  // page background
        },
        navy: {
          50: "#f3f5f9",
          100: "#e3e8f1",
          200: "#c2cde0",
          300: "#94a4c4",
          400: "#6577a4",
          500: "#3f5384",
          600: "#2e3e6a",
          700: "#1f2c50",
          800: "#142039",
          900: "#0b1730",
          950: "#060d1d",
        },
        amber: {
          glow: "#c8973f",
          accent: "#a87a25",
          deep: "#7c5614",
        },
        signal: {
          DEFAULT: "#1e57c2",
          ring: "#5fa2ff",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(rgba(11,23,48,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(11,23,48,0.05) 1px, transparent 1px)",
        "radial-glow":
          "radial-gradient(60% 60% at 50% 0%, rgba(200,151,63,0.18) 0%, rgba(255,255,255,0) 60%)",
        "vanguard-wash":
          "radial-gradient(80% 60% at 50% 0%, rgba(11,23,48,0.06) 0%, rgba(255,255,255,0) 60%), radial-gradient(40% 40% at 90% 10%, rgba(200,151,63,0.10) 0%, rgba(255,255,255,0) 60%)",
      },
      boxShadow: {
        "glow-amber":
          "0 0 0 1px rgba(168,122,37,0.25), 0 14px 38px -14px rgba(168,122,37,0.5)",
        lift:
          "0 28px 56px -22px rgba(11,23,48,0.22), 0 8px 20px -8px rgba(11,23,48,0.10)",
        card:
          "0 1px 0 rgba(11,23,48,0.05), 0 4px 14px -4px rgba(11,23,48,0.08), 0 16px 40px -20px rgba(11,23,48,0.14)",
        "card-strong":
          "0 1px 0 rgba(11,23,48,0.06), 0 6px 18px -4px rgba(11,23,48,0.10), 0 24px 56px -24px rgba(11,23,48,0.20)",
        ring: "0 0 0 1px rgba(11,23,48,0.08)",
      },
      letterSpacing: {
        tightest: "-0.045em",
      },
    },
  },
  plugins: [],
};

export default config;
