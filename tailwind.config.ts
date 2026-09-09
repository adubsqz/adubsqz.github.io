import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'ui-rounded', 'system-ui', 'sans-serif'],
        display: ['Newsreader', 'Georgia', 'serif'],
        mono: [
          'IBM Plex Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },
      colors: {
        'photo-bg': '#f4eee4',
        'photo-panel': '#ebe3d4',
        'photo-fg': '#1a1714',
        'photo-muted': '#5c564e',
        'photo-border': '#d4c8b4',
        'photo-accent': '#a63c32',
        'photo-accent-soft': '#8eb9ce',
        mcm: {
          ink: '#1a1714',
          paper: '#f4eee4',
          cream: '#f7f1e6',
          rust: '#c56a3a',
          brick: '#a63c32',
          sage: '#8eb9ce',
          sky: '#8eb9ce',
          line: '#cbbfa8',
        },
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-reveal': {
          '0%': { opacity: '0', transform: 'translateY(0.6rem)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'specimen-flash': {
          '0%': { opacity: '0.2' },
          '40%': { opacity: '0.06' },
          '100%': { opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 420ms cubic-bezier(0.22, 1, 0.36, 1)',
        'slide-reveal': 'slide-reveal 520ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'specimen-flash': 'specimen-flash 720ms ease-out both',
      },
    },
  },
} satisfies Config;
