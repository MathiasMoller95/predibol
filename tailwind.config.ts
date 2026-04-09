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
        /** Group-scoped theme (set via [data-group-shell] in group layout) */
        gpri: "rgb(var(--gpri-rgb) / <alpha-value>)",
        gsec: "rgb(var(--gsec-rgb) / <alpha-value>)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        dark: {
          900: "#0A0E14",
          800: "#111720",
          700: "#1A2230",
          600: "#243040",
          500: "#2E3E52",
        },
        accent: {
          DEFAULT: "#10B981",
          hover: "#059669",
          light: "#34D399",
          muted: "#064E3B",
        },
        gold: "#F59E0B",
        silver: "#94A3B8",
      },
    },
  },
  plugins: [],
};
export default config;
