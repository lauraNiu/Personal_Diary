/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        space: {
          academic: '#6366F1',
          work: '#0EA5E9',
          life: '#10B981',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'PingFang SC', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
