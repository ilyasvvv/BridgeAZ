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
        // More pronounced shadows for better separation
        card: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
        elevated: "0 4px 12px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
        floating: "0 8px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)"
      }
    }
  },
  plugins: []
};
