/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2f6fc',
          100: '#e2ebf7',
          200: '#c2d7ee',
          500: '#3364b8',
          600: '#28518f',
          700: '#203f6f',
          900: '#152a4a',
        },
        ledger: {
          50: '#f0f8f4',
          200: '#bfe3d0',
          500: '#1f9d6b',
          700: '#166b49',
        },
        ink: '#0f1b2d',
      },
      fontFamily: {
        serif: [
          "'Iowan Old Style'",
          "'Source Serif Pro'",
          'Palatino',
          "'Palatino Linotype'",
          'Georgia',
          'serif',
        ],
      },
    },
  },
  plugins: [],
};
