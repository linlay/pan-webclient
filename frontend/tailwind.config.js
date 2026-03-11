/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}", "./index.html"],
  theme: {
    extend: {
      colors: {
        primary: "#D97757", // Claude Terracotta
        "bg-light": "#F9F7F2", // Paper White
        "bg-dark": "#161614", // Deep Charcoal
      },
      fontFamily: {
        display: ["PingFang SC", "SF Pro Display", "Segoe UI", "system-ui", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        "2xl": "1rem",
        full: "9999px",
      },
    },
  },
  plugins: [require("@tailwindcss/forms")],
};
