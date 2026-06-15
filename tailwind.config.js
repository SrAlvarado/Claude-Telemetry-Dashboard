/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Dark navy base + neon accents, matching the reference dashboard.
        navy: {
          900: "#070b1e",
          800: "#0a0e27",
          700: "#0f1535",
          600: "#161d44",
          500: "#1e2a5a",
        },
        neon: {
          teal: "#2dd4bf",
          cyan: "#38bdf8",
          green: "#34d399",
          amber: "#fbbf24",
          red: "#f87171",
        },
      },
      fontFamily: {
        display: ["'Orbitron'", "'Segoe UI'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(45, 212, 191, 0.25)",
        "glow-cyan": "0 0 20px rgba(56, 189, 248, 0.25)",
      },
    },
  },
  plugins: [],
};
