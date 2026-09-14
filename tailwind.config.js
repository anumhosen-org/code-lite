/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // VS Code style dark/gray scale palette
        vsc: {
          bg: "#1e1e1e",
          sidebar: "#191919",
          activity: "#1d1d1d",
          activityActive: "#191919",
          editor: "#1e1e1e",
          tab: "#252525",
          tabActive: "#1e1e1e",
          border: "#2d2d2d",
          panel: "#1e1e1e",
          status: "#141414",
          hover: "#262626",
          selected: "#2c2e33",
          input: "#2d2d2d",
          text: "#cccccc",
          textMuted: "#858585",
        }
      }
    },
  },
  plugins: [],
}
