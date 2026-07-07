import type { Config } from "tailwindcss";

// Every value below is taken directly from zama_org-design.md ("Zama Light").
// Nothing here is a guessed/default Tailwind value.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#ffd208",
        secondary: "#000000",
        tertiary: "#190e065c",
        neutral: "#ffffff",
        surface: "#edf2f5",
        "on-surface": "#000000",
        error: "#d92d20",
      },
      fontFamily: {
        display: ["Telegraf", "sans-serif"],
        "display-variable": ["Telegraf Variable", "sans-serif"],
      },
      fontSize: {
        "headline-display": ["72px", { lineHeight: "79.2px", letterSpacing: "0px", fontWeight: "400" }],
        "headline-lg": ["49px", { lineHeight: "61.6px", letterSpacing: "-0.6px", fontWeight: "400" }],
        "headline-md": ["34px", { lineHeight: "41px", letterSpacing: "0px", fontWeight: "400" }],
        "headline-sm": ["23px", { lineHeight: "26.4px", letterSpacing: "0px", fontWeight: "400" }],
        "body-lg": ["18px", { lineHeight: "28px", letterSpacing: "-0.12px", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "24px", letterSpacing: "-0.18px", fontWeight: "400" }],
        "body-sm": ["14px", { lineHeight: "20px", letterSpacing: "-0.12px", fontWeight: "400" }],
        "label-lg": ["16px", { lineHeight: "24px", letterSpacing: "0px", fontWeight: "400" }],
        "label-md": ["14px", { lineHeight: "20px", letterSpacing: "0px", fontWeight: "400" }],
        "label-sm": ["12px", { lineHeight: "16px", letterSpacing: "0px", fontWeight: "400" }],
      },
      borderRadius: {
        none: "0px",
        sm: "4px",
        md: "10px",
        lg: "12px",
        xl: "16px",
        full: "9999px",
      },
      spacing: {
        xs: "8px",
        sm: "16px",
        md: "32px",
        lg: "46px",
        xl: "146px",
      },
    },
  },
  plugins: [],
};

export default config;
