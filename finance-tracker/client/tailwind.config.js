/** @type {import('tailwindcss').Config} */
export default {
  content: ['./client/index.html', './client/src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1B3A6B',
        accent: '#2E75B6',
        positive: '#1A6B3A',
        negative: '#B03030',
        warning: '#856404',
        income: '#2E75B6',
        expense: '#B03030',
        saving: '#1A6B3A',
      },
    },
  },
  plugins: [],
};
