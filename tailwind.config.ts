import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-spartan)", "system-ui", "sans-serif"],
        display: ["var(--font-spartan)", "system-ui", "sans-serif"],
      },
      colors: {
        ink: {
          DEFAULT: "#0A0A0A",
          soft: "#1A1A1A",
          muted: "#6B6B6B",
          faint: "#A8A8A8",
        },
        paper: {
          DEFAULT: "#FFFFFF",
          warm: "#FAFAF8",
          cool: "#F4F4F2",
          line: "#E8E8E6",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -8px rgba(0,0,0,0.08)",
        pop: "0 2px 4px rgba(0,0,0,0.06), 0 24px 48px -12px rgba(0,0,0,0.18)",
        ring: "inset 0 0 0 1px rgba(0,0,0,0.06)",
      },
      borderRadius: {
        pill: "9999px",
        card: "24px",
      },
      animation: {
        "spin-slow": "spin 30s linear infinite",
        "spin-slower": "spin 60s linear infinite",
        "float": "float 6s ease-in-out infinite",
        "pulse-ring": "pulseRing 2.4s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite",
        "fade-up": "fadeUp 0.6s ease forwards",
      },
      keyframes: {
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        pulseRing: {
          "0%": { transform: "scale(0.8)", opacity: "0.6" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
