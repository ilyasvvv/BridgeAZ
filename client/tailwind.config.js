/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  safelist: [
    { pattern: /^(bg|text|border|ring|shadow|font)-q-/ },
  ],
  theme: {
    extend: {
      colors: {
        // BizimCircle: Monochrome palette
        // App background
        charcoal: "#F7F7F7",
        // Card/Surface (Pure white)
        slate: "#FFFFFF",
        // Primary brand (black for text/elements)
        brand: "#000000",
        // Neutral greys
        "grey-100": "#F8F8F8",
        "grey-200": "#EFEFEF",
        "grey-300": "#E8E8E8",
        "grey-400": "#D0D0D0",
        "grey-500": "#A8A8A8",
        "grey-600": "#808080",
        "grey-700": "#505050",
        // Removed color accents - keeping for backward compatibility
        coral: "#000000",
        ember: "#303030",
        teal: "#000000",
        // Dynamic page accent (set via CSS variable per page)
        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-soft": "rgb(var(--accent-soft, var(--accent)) / <alpha-value>)",
        // Text
        sand: "#000000", // Primary text (black)
        mist: "#808080", // Secondary text (grey-600)
        // UI elements
        border: "#EFEFEF",
        "surface-alt": "#F8F8F8",

        // Qovshaq design tokens (keeping for compatibility)
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
        // Subtle monochrome shadows
        card: "0 0.5px 1px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06), 0 4px 10px rgba(0,0,0,0.05), 0 0 0 0.5px rgba(0,0,0,0.04)",
        elevated: "0 1px 2px rgba(0,0,0,0.05), 0 3px 8px rgba(0,0,0,0.08), 0 12px 28px -4px rgba(0,0,0,0.12), 0 0 0 0.5px rgba(0,0,0,0.04)",
        floating: "0 2px 4px rgba(0,0,0,0.06), 0 8px 18px rgba(0,0,0,0.1), 0 20px 44px -6px rgba(0,0,0,0.16), 0 0 0 0.5px rgba(0,0,0,0.04)",
        glow: "0 0 8px rgba(0,0,0,0.08), 0 0 24px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.06)",
        "glow-ring": "0 0 0 3px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(0,0,0,0.04)",
        // For backward compatibility
        "glow-bridge": "0 0 0 2px rgba(0,0,0,0.1), 0 0 12px rgba(0,0,0,0.12)",
        "glow-mentor": "0 0 0 2px rgba(0,0,0,0.1), 0 0 12px rgba(0,0,0,0.12)",
        "glow-mentee": "0 0 0 2px rgba(0,0,0,0.1), 0 0 12px rgba(0,0,0,0.12)",
        "glow-follow": "0 0 0 2px rgba(0,0,0,0.08), 0 0 8px rgba(0,0,0,0.08)",
        "q-card": "0 1px 3px rgba(44,40,37,0.04), 0 4px 12px rgba(44,40,37,0.06), 0 0 0 0.5px rgba(44,40,37,0.03)",
        "q-elevated": "0 2px 6px rgba(44,40,37,0.06), 0 8px 24px rgba(44,40,37,0.1), 0 0 0 0.5px rgba(44,40,37,0.03)",
        "q-floating": "0 4px 12px rgba(44,40,37,0.08), 0 16px 40px rgba(44,40,37,0.14), 0 0 0 0.5px rgba(44,40,37,0.04)"
      },
      keyframes: {
        "ring-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(0, 0, 0, 0.4)" },
          "50%": { boxShadow: "0 0 0 10px rgba(0, 0, 0, 0)" }
        },
        "spin-slow": {
          "from": { transform: "rotate(0deg)" },
          "to": { transform: "rotate(360deg)" }
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" }
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        "ring-pulse": "ring-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin-slow 3s linear infinite",
        "scale-in": "scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "slide-up": "slide-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)"
      }
    }
  },
  plugins: []
};
