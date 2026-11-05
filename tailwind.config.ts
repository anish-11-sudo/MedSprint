import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0B1F3A", 800: "#12294A", 700: "#1B3760" },
        volt: { DEFAULT: "#2F6BFF", 600: "#1F57E6" },
        mint: { DEFAULT: "#3DDBA0", 700: "#0F8F63" },
        sun: { DEFAULT: "#FFC93C", 700: "#8A6200" },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: { card: "0 1px 2px rgba(11,31,58,.06), 0 8px 24px -12px rgba(11,31,58,.18)" },
    },
  },
  plugins: [],
};
export default config;
