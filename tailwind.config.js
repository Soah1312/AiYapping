/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: 'var(--bg-primary)',
          sidebar: 'var(--bg-sidebar)',
          card: 'var(--bg-card)',
          hover: 'var(--bg-hover)',
          active: 'var(--bg-active)'
        },
        text: {
          DEFAULT: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-placeholder)',
        },
        border: 'var(--border-color)',
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--btn-hover)',
        },
        btn: {
          DEFAULT: 'var(--btn-bg)',
          text: 'var(--btn-text)',
        },
        danger: 'var(--danger)',
        ai1: 'var(--ai1)',
        ai2: 'var(--ai2)',
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        mono: 'var(--font-mono)',
      },
      borderRadius: {
        card: 'var(--card-radius)',
        btn: 'var(--btn-radius)',
        input: 'var(--input-radius)',
      },
      width: {
        sidebar: 'var(--sidebar-width)',
      }
    },
  },
  plugins: [],
};
