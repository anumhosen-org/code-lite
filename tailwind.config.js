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
          sidebar: "#252526",
          activity: "#333333",
          activityActive: "#252526",
          editor: "#1e1e1e",
          tab: "#2d2d2d",
          tabActive: "#1e1e1e",
          border: "#3c3c3c",
          panel: "#1e1e1e",
          status: "#007acc",
          hover: "#2a2d2e",
          selected: "#094771",
          input: "#3c3c3c",
          text: "#cccccc",
          textMuted: "#858585",
        }
      }
    },
  },
  plugins: [],
}
