/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'var(--canvas)',
        surface: 'var(--surface)',
        'surface-raised': 'var(--surface-raised)',
        'surface-hover': 'var(--surface-hover)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        accent: 'var(--accent)',
        'accent-hover': 'var(--accent-hover)',
        'accent-muted': 'var(--accent-muted)',
        positive: 'var(--positive)',
        'positive-muted': 'var(--positive-muted)',
        negative: 'var(--negative)',
        'negative-muted': 'var(--negative-muted)',
        warning: 'var(--warning)',
        'warning-muted': 'var(--warning-muted)',
      },
      fontFamily: {
        heading: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        data: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        control: '6px',
        card: '10px',
        pill: '999px',
      },
      spacing: {
        button: '36px',
        'icon-button': '32px',
        icon: '18px',
        dot: '6px',
        sidebar: '280px',
        'detail-panel': '360px',
        auth: '400px',
        graph: '600px',
      },
      maxWidth: {
        auth: '400px',
      },
      minHeight: {
        graph: '600px',
      },
      boxShadow: {
        modal: '0 8px 24px rgba(0,0,0,0.4)',
        popover: '0 4px 16px rgba(0,0,0,0.35)',
      },
      transitionDuration: {
        ui: '150ms',
        panel: '200ms',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fade: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s ease-out infinite',
        fade: 'fade 200ms ease-out',
      },
    },
  },
  plugins: [],
};
