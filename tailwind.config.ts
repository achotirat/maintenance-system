import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Inter Tight'", "'Noto Sans Thai'", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          DEFAULT: "#5b5bd6",
          hover: "#4a4ac0",
        },
        nav: "var(--nav)",
        surface: {
          DEFAULT: "var(--card)",
          bg: "var(--bg)",
        },
      },
      borderColor: {
        line: "var(--line)",
      },
      textColor: {
        primary: "var(--tx)",
        secondary: "var(--tx2)",
        tertiary: "var(--tx3)",
      },
      boxShadow: {
        card: "var(--shadow)",
      },
      keyframes: {
        toastIn: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        popIn: {
          from: { opacity: "0", transform: "scale(.96) translateY(8px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" },
        },
      },
      animation: {
        "toast-in": "toastIn .2s ease-out",
        "fade-in": "fadeIn .15s ease-out",
        "pop-in": "popIn .18s ease-out",
      },
    },
  },
  plugins: [],
};
export default config;
