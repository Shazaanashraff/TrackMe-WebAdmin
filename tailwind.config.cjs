/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ─── Redesign semantic tokens (map to CSS vars in src/index.css) ───
        background: 'var(--background)',
        surface: {
          DEFAULT: 'var(--surface)',
          muted: 'var(--surface-muted)',
        },
        border: 'var(--border)',
        foreground: 'var(--foreground)',
        'muted-foreground': 'var(--muted-foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          foreground: 'var(--primary-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        ring: 'var(--ring)',
        status: {
          pending: 'var(--status-pending)',
          progress: 'var(--status-progress)',
          settled: 'var(--status-settled)',
          warning: 'var(--status-warning)',
          danger: 'var(--status-danger)',
        },

        // ─── Legacy (kept until MUI pages are migrated — do not add more) ───
        'ace-primary': '#10b981',
        'ace-secondary': '#111827',
        'ace-bg': '#f8f9fa',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        heading: ['var(--font-heading)'],
        mono: ['var(--font-mono)'],
        uber: ['"Uber Move"', 'sans-serif'],
      },
      boxShadow: {
        sm: '0 1px 2px rgb(15 23 42 / 0.06)',
        md: '0 4px 12px rgb(15 23 42 / 0.10)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
