/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
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
        // Page-specific accents
        "accent-profile": "#4338CA",
        "accent-opp": "#0D9488",
        "accent-chat": "#7C3AED",
        // Text
        sand: "#1B1F23", // Primary text
        mist: "#586069", // Secondary text
        // UI elements
        border: "#E1E5EB",
        "surface-alt": "#F0F2F5"
      },
      fontFamily: {
        display: ["Newsreader", "serif"],
        body: ["Source Sans 3", "system-ui", "sans-serif"]
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
        glow: "0 0 8px rgba(21,101,163,0.1), 0 0 24px rgba(21,101,163,0.12), 0 4px 16px rgba(21,101,163,0.06), inset 0 1px 0 rgba(21,101,163,0.08)"
      }
    }
  },
  plugins: []
};
