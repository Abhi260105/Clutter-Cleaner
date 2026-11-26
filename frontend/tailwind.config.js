
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',

  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],

  theme: {
    extend: {
      colors: {
        navy: {
          900: '#111827',
          950: '#080d1a',
        },
      },

      boxShadow: {
        card: '0 4px 20px rgba(0, 0, 0, 0.05)',
        lift: '0 10px 30px rgba(124, 58, 237, 0.18)',
      },
    },
  },

  plugins: [],
};
