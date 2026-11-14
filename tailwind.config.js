/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mars: {
          dark: '#07090e',
          panel: 'rgba(14, 19, 29, 0.88)',
          orange: '#ff5e36',
          amber: '#f59e0b',
          cyan: '#00e5ff',
          red: '#ef4444',
          green: '#10b981'
        }
      },
      fontFamily: {
        aerospace: ['Chakra Petch', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'sans-serif']
      }
    },
  },
  plugins: [],
}
