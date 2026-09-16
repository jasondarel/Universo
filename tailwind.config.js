/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        space: ['"Space Grotesk"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      colors: {
        space: {
          dark: "#0a0a0f",
          blue: "#1a1a2e",
          purple: "#16213e",
        },
      },
    },
  },
  plugins: [],
};
