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
        academia: {
          bg: '#141110',
          'bg-light': '#1a1410',
          'bg-hover': '#231a14',
          'bg-active': '#201a15',
          gold: '#cd853f',
          'gold-muted': '#8b7355',
          'gold-light': '#a0826d',
          parchment: '#e8dcc8',
        },
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
        mono: 'var(--font-mono)',
        'academia-display': '"Playfair Display", Lora, "Libre Baskerville", serif',
        'academia-body': 'Merriweather, "Source Serif Pro", Garamond, serif',
        'academia-label': 'Cinzel, "Copperplate", serif',
        'academia-mono': '"Space Mono", Monaco, Menlo, monospace',
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
