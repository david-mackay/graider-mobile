/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        paper: "#fdfaf1",
        cream: {
          DEFAULT: "#f6efe1",
          deep: "#ede3cc",
        },
        ink: {
          DEFAULT: "#2c231b",
          soft: "#6f6151",
          faint: "#a3927b",
        },
        line: {
          DEFAULT: "#e5d9c0",
          soft: "#efe7d4",
        },
        pen: {
          DEFAULT: "#be3a2e",
          deep: "#99291f",
          soft: "#e0a89e",
          wash: "#f8e9e3",
        },
        moss: {
          DEFAULT: "#4a7c59",
          deep: "#38613f",
          wash: "#e9f0e4",
        },
        gold: {
          DEFAULT: "#c8a24b",
          wash: "#f5ecd7",
        },
        marigold: {
          DEFAULT: "#b07a21",
          deep: "#8f6312",
          wash: "#f7ecd5",
        },
        white: "#fffcf5",
      },
      fontFamily: {
        sans: ["Nunito", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
        hand: ["Caveat", "cursive"],
      },
      boxShadow: {
        paper: "0 1px 2px rgba(62, 44, 37, 0.05), 0 4px 14px rgba(62, 44, 37, 0.07)",
        card: "0 10px 24px rgba(62, 44, 37, 0.12)",
        lifted: "0 18px 36px rgba(62, 44, 37, 0.18)",
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        rise: "rise 0.55s cubic-bezier(0.2, 0.7, 0.3, 1) both",
        "rise-slow": "rise 0.8s cubic-bezier(0.2, 0.7, 0.3, 1) both",
      },
    },
  },
  plugins: [],
};
