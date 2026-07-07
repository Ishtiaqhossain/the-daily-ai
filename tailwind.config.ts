import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF8F3",
        ink: "#11110F",
        subtle: "#5C5A52",
        hair: "#E2DED3",
        accent: "#1B3BFF",
        accentSoft: "#EAEEFF",
        signalHigh: "#0B7A3B",
        signalMed: "#9A6B00",
        signalLow: "#9A2B2B",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      maxWidth: {
        edition: "1180px",
        read: "680px",
      },
    },
  },
  plugins: [],
};

export default config;
