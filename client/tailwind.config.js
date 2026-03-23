/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: "#0A66C2",
          hover: "#004182",
        },
        bg: {
          app: "#F6F8FA",
          surface: "#FFFFFF",
        },
        text: {
          main: "#1B1F23",
          secondary: "#586069",
          muted: "#848d95",
        },
        accent: {
          success: "#28A745",
          warning: "#E7A33E",
          error: "#D73A49",
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["SF Pro Display", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        'apple': '12px',
        'apple-lg': '16px',
      },
      boxShadow: {
        'apple': '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)',
        'apple-hover': '0 8px 24px rgba(0,0,0,0.12)',
      }
    }
  },
  plugins: []
};
