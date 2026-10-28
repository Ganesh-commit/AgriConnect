/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        agri: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#2E7D32', // Brand primary green
          800: '#1B5E20',
          900: '#14532d',
          950: '#052e16',
        },
        earth: {
          50: '#fdfbf7', // light cream
          100: '#f7f2ea',
          200: '#eee3d2',
          300: '#e1cdb3',
          400: '#cfb18f',
          500: '#b7916c',
          600: '#9d7453',
          700: '#7f5a41',
          800: '#674a38',
          900: '#543d30',
        },
        harvest: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#F59E0B', // Brand accent amber
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
