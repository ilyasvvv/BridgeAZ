/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        charcoal: "#F8F9FB",
        slate: "#FFFFFF",
        coral: "#D4763C",
        ember: "#C4683A",
        teal: "#1565A3",
        sand: "#1B1F23",
        mist: "#586069",
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
        card: "0 1px 3px rgba(27,31,35,0.06), 0 1px 2px rgba(27,31,35,0.04)",
        elevated: "0 4px 12px rgba(27,31,35,0.08), 0 1px 4px rgba(27,31,35,0.04)",
        floating: "0 8px 24px rgba(27,31,35,0.12), 0 2px 8px rgba(27,31,35,0.06)"
      }
    }
  },
  plugins: []
};
