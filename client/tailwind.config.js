/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        charcoal: "#0f1419",
        slate: "#151c24",
        coral: "#ff6b4a",
        ember: "#ff8a3d",
        teal: "#2dd4bf",
        sand: "#f6f3ee",
        mist: "#cbd5e1",
        chassis: "#e0e5ec",
        panel: "#f0f2f5",
        recessed: "#d1d9e6",
        ink: "#2d3436",
        label: "#4a5568",
        accent: "#ff4757",
        accentfg: "#ffffff",
        shadow: "#babecc",
        highlight: "#ffffff",
        deep: "#a3b1c6"
      },
      fontFamily: {
        industrial: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
        display: ['"Fraunces"', "serif"]
      },
      boxShadow: {
        "industrial-card": "8px 8px 16px #babecc, -8px -8px 16px #ffffff",
        "industrial-floating":
          "12px 12px 24px #babecc, -12px -12px 24px #ffffff, inset 1px 1px 0 rgba(255,255,255,0.5)",
        "industrial-pressed": "inset 6px 6px 12px #babecc, inset -6px -6px 12px #ffffff",
        "industrial-recessed": "inset 4px 4px 8px #babecc, inset -4px -4px 8px #ffffff",
        "industrial-glow": "0 0 10px 2px rgba(255, 71, 87, 0.6)"
      },
      borderRadius: {
        industrial: "24px"
      },
      transitionTimingFunction: {
        mechanical: "cubic-bezier(0.175, 0.885, 0.32, 1.275)"
      }
    }
  },
  plugins: []
};
