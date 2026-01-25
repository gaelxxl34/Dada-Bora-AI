/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./{app,components,libs,pages,hooks}/**/*.{html,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "cream-50": "#faf9f7",
        "warm-brown": "#7C4A1E",
        gold: "#D4A84B",
        earth: "#6B5A3E",
        blush: "#E8B4BC",
      },
      fontFamily: {
        playfair: ["var(--font-playfair)", "serif"],
      },
      animation: {
        "fade-up": "fadeUp 0.6s ease-out forwards",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      spacing: {
        18: "4.5rem",
      },
    },
  },
  plugins: [],
};
