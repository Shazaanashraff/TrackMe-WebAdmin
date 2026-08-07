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
        'table-header-foreground': 'var(--table-header-foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          foreground: 'var(--primary-foreground)',
          soft: 'var(--primary-soft)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        overlay: 'var(--overlay)',
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
        // Atlas spends depth ONCE — `float` is for the two shell cards and for
        // overlays (dialog/sheet/popover). Nothing inside the content card gets
        // a shadow; use a 1px border or surface-muted instead.
        float: 'var(--shadow-float)',
        sm: '0 1px 2px rgb(11 18 32 / 0.05)',
      },
      // NOTE: no borderRadius override — Tailwind's defaults already match the
      // Atlas scale (lg 8px controls · xl 12px panels · 2xl 16px shell cards).
    },
  },
  plugins: [require('tailwindcss-animate')],
};
