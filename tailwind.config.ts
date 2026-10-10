import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#f1f5fb",
          100: "#dfe8f5",
          200: "#c2d3ec",
          300: "#94b2dd",
          400: "#5f89c9",
          500: "#3d68b2",
          600: "#2c5096",
          700: "#24407a",
          800: "#1c3160",
          900: "#14244a",
          950: "#0c1730",
        },
        teal: {
          50: "#effdfb",
          100: "#c8f7f0",
          200: "#93eee2",
          300: "#57ddd0",
          400: "#27c4b8",
          500: "#0ea89e",
          600: "#088780",
          700: "#0b6b67",
          800: "#0e5553",
          900: "#104745",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      boxShadow: {
        book: "0 1px 2px rgba(12,23,48,.08), 0 12px 28px -8px rgba(12,23,48,.35)",
      },
    },
  },
  plugins: [typography],
} satisfies Config;
