/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#0B0D12',
        surface: '#12151C',
        'surface-raised': '#181C25',
        'surface-hover': '#1D2129',
        border: 'rgba(255,255,255,0.08)',
        'border-strong': 'rgba(255,255,255,0.16)',
        'text-primary': '#E7E9EE',
        'text-secondary': '#9AA1AE',
        'text-muted': '#676E7C',
        accent: '#4C8DFF',
        'accent-hover': '#6BA1FF',
        'accent-muted': 'rgba(76,141,255,0.14)',
        positive: '#4CC38A',
        'positive-muted': 'rgba(76,195,138,0.14)',
        negative: '#E0645C',
        'negative-muted': 'rgba(224,100,92,0.14)',
        warning: '#E0A23D',
        'warning-muted': 'rgba(224,162,61,0.14)',
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
