/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'ace-primary': '#10b981',
        'ace-secondary': '#111827',
        'ace-bg': '#f8f9fa',
      },
      fontFamily: {
        'uber': ['"Uber Move"', 'sans-serif'],
      },
    },
  },
  plugins: []
};
