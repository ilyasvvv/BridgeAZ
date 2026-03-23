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
        mist: "#cbd5e1"
      }
    }
  },
  plugins: []
};
