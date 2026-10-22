/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f2ea',
          100: '#e8e1cf',
          500: '#b3a26f',
          600: '#9c8a55',
          700: '#7d6e42',
          900: '#3f3822',
        },
      },
    },
  },
  plugins: [],
}
