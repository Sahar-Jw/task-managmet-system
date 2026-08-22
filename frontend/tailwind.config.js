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

      /*
       * App-wide density pass: every text-* and spacing utility below
       * (padding, margin, gap, width/height, etc.) resolves through
       * these scales, so shrinking them here shrinks titles, body text,
       * card padding, and the whitespace between sections everywhere —
       * including responsive variants like `sm:text-2xl` — without
       * having to touch every page individually. Keys not listed here
       * (e.g. spacing 0.5–4, fontSize xs/sm/base) are intentionally
       * left at Tailwind's defaults so small UI like icons, inputs, and
       * badges keep a safe, legible/tappable size.
       */
      fontSize: {
        lg: ['1rem', { lineHeight: '1.5rem' }],
        xl: ['1.0625rem', { lineHeight: '1.5rem' }],
        '2xl': ['1.1875rem', { lineHeight: '1.625rem' }],
        '3xl': ['1.375rem', { lineHeight: '1.75rem' }],
        '4xl': ['1.625rem', { lineHeight: '1.875rem' }],
        '5xl': ['2rem', { lineHeight: '1' }],
        '6xl': ['2.5rem', { lineHeight: '1' }],
      },

      spacing: {
        5: '1.125rem',
        6: '1.25rem',
        7: '1.5rem',
        8: '1.75rem',
        9: '2rem',
        10: '2.25rem',
        11: '2.5rem',
        12: '2.75rem',
        14: '3.25rem',
        16: '3.5rem',
        20: '4.25rem',
        24: '5rem',
        28: '5.75rem',
        32: '6.5rem',
      },
    },
  },

  plugins: [],
};
