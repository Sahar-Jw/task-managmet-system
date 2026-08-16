/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],

  theme: {
    extend: {
      colors: {
        brand: {
          50: 'var(--theme-primary-lightest)',
          100: 'var(--theme-primary-lighter)',
          200: 'var(--theme-primary-light)',
          500: 'var(--theme-primary)',
          600: 'var(--theme-primary-dark)',
          700: 'var(--theme-primary-darker)',
          900: 'var(--theme-primary-darkest)',
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