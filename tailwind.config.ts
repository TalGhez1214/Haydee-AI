import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#534AB7",
          light: "#6B63C8",
          dark: "#3D3592",
        },
        success: "#1D9E75",
        danger: "#E24B4A",
        warning: "#E8A838",
        info: "#0C447C",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "Oxygen",
          "Ubuntu",
          "Cantarell",
          '"Helvetica Neue"',
          "sans-serif",
        ],
        mono: [
          '"SF Mono"',
          '"Fira Code"',
          '"Fira Mono"',
          '"Roboto Mono"',
          "monospace",
        ],
      },
      fontSize: {
        "page-title": ["20px", { fontWeight: "600", lineHeight: "1.3" }],
        section: ["15px", { fontWeight: "500", lineHeight: "1.4" }],
        body: ["14px", { fontWeight: "400", lineHeight: "1.5" }],
        prose: ["15px", { fontWeight: "400", lineHeight: "2.0" }],
        meta: ["12px", { fontWeight: "400", lineHeight: "1.4" }],
        label: ["11px", { fontWeight: "500", lineHeight: "1.4" }],
      },
      borderRadius: {
        btn: "4px",
        card: "8px",
        badge: "20px",
        input: "6px",
      },
      transitionDuration: {
        quick: "150ms",
        panel: "220ms",
      },
      transitionTimingFunction: {
        panel: "cubic-bezier(.4,0,.2,1)",
      },
      maxWidth: {
        prose: "680px",
      },
      width: {
        sidebar: "56px",
        "sidebar-open": "200px",
      },
      spacing: {
        "sidebar": "56px",
        "sidebar-open": "200px",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)",
        panel: "0 4px 24px 0 rgb(0 0 0 / 0.12)",
      },
    },
  },
  plugins: [],
};
export default config;
