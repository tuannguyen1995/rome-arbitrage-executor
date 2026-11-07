/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        rome: {
          dark: "#0b0e14",
          card: "#121721",
          border: "#1f293d",
          primary: "#3b82f6",
          accent: "#10b981",
          gold: "#f59e0b",
        },
      },
    },
  },
  plugins: [],
};
