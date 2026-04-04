/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  safelist: [
    { pattern: /^(bg|text|border|ring|shadow|font)-q-/ },
  ],
  theme: {
    extend: {
      colors: {
        // App background (Cool, distinct gray)
        charcoal: "#F0F2F5",
        // Card/Surface (Pure white)
        slate: "#FFFFFF",
        // Primary brand color
        brand: "#1565A3",
        // Accents
        coral: "#D4763C",
        ember: "#C4683A",
        teal: "#1565A3",
        // Dynamic page accent (set via CSS variable per page)
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-soft": "rgb(var(--accent-soft, var(--accent)) / <alpha-value>)",
        // Text
        sand: "#1B1F23", // Primary text
        mist: "#586069", // Secondary text
        // UI elements
        border: "#E1E5EB",
        "surface-alt": "#F0F2F5",

        // Qovshaq design tokens
        "q-bg": "#FBF8F4",
        "q-surface": "#FFFFFF",
        "q-surface-alt": "#F5F0E8",
        "q-primary": "#2D7A6F",
        "q-primary-light": "#E8F4F1",
        "q-secondary": "#C4683A",
        "q-secondary-light": "#FDF0E8",
        "q-accent": "#D4A853",
        "q-accent-light": "#FDF6E3",
        "q-text": "#2C2825",
        "q-text-muted": "#7A726A",
        "q-border": "#E8E2D9",
        "q-danger": "#D94F4F",
        "q-success": "#3D8B5F"
      },
      fontFamily: {
        display: ["Newsreader", "serif"],
        body: ["Source Sans 3", "system-ui", "sans-serif"],
        "q-display": ["DM Serif Display", "serif"],
        "q-body": ["Inter", "system-ui", "sans-serif"]
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px"
      },
      boxShadow: {
        card: "0 0.5px 1px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.05), 0 4px 10px rgba(0,0,0,0.04), 0 0 0 0.5px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.7)",
        elevated: "0 1px 2px rgba(0,0,0,0.03), 0 3px 8px rgba(0,0,0,0.06), 0 12px 28px -4px rgba(0,0,0,0.09), 0 0 0 0.5px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.8)",
        floating: "0 2px 4px rgba(0,0,0,0.04), 0 8px 18px rgba(0,0,0,0.08), 0 20px 44px -6px rgba(0,0,0,0.14), 0 0 0 0.5px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)",
        glow: "0 0 8px rgba(29,29,68,0.1), 0 0 24px rgba(29,29,68,0.12), 0 4px 16px rgba(29,29,68,0.06), inset 0 1px 0 rgba(29,29,68,0.08)",
        "glow-bridge": "0 0 0 2px rgba(21,101,163,0.15), 0 0 12px rgba(21,101,163,0.2), 0 0 24px rgba(21,101,163,0.1)",
        "glow-mentor": "0 0 0 2px rgba(212,118,60,0.15), 0 0 12px rgba(212,118,60,0.2), 0 0 24px rgba(212,118,60,0.1)",
        "glow-mentee": "0 0 0 2px rgba(16,185,129,0.15), 0 0 12px rgba(16,185,129,0.2), 0 0 24px rgba(16,185,129,0.1)",
        "glow-follow": "0 0 0 2px rgba(88,96,105,0.1), 0 0 8px rgba(88,96,105,0.08)",
        "q-card": "0 1px 3px rgba(44,40,37,0.04), 0 4px 12px rgba(44,40,37,0.06), 0 0 0 0.5px rgba(44,40,37,0.03)",
        "q-elevated": "0 2px 6px rgba(44,40,37,0.06), 0 8px 24px rgba(44,40,37,0.1), 0 0 0 0.5px rgba(44,40,37,0.03)",
        "q-floating": "0 4px 12px rgba(44,40,37,0.08), 0 16px 40px rgba(44,40,37,0.14), 0 0 0 0.5px rgba(44,40,37,0.04)"
      }
    }
  },
  plugins: []
};
