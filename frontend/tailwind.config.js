/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}", "./index.html"],
  theme: {
    extend: {
      colors: {
        primary: "#0052D9",
        "primary-hover": "#003EB3",
        accent: "#4656FF",
        "bg-light": "#ECF2FF",
        "bg-dark": "#0F172A",
        "sidebar-bg": "#F2F5F9",
        "sidebar-border": "#E5E8ED",
        "panel-wash": "#F0F5FF",
        "body-text": "#4B5B76",
        "heading-text": "#161B2E",
        "night-0": "#091221",
        "night-1": "#0F172A",
        "night-2": "#13203A",
        "night-3": "#1A2A49",
        "dark-primary": "#0B66FC",
        "dark-link": "#3E78FF",
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
