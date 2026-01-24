export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
      },
      keyframes: {
        "context-menu-in": {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "context-menu-out": {
          "0%": { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0", transform: "scale(0.92)" },
        },
      },
      animation: {
        "context-menu-in": "context-menu-in 0.15s ease-out forwards",
        "context-menu-out": "context-menu-out 0.15s ease-in forwards",
      },
    },
  },
  plugins: [],
};
