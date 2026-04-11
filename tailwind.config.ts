import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#080b10',
        card: '#0f1318',
        'card-hover': '#161b23',
        border: '#1e2530',
        orange: {
          DEFAULT: '#f97316',
          hover: '#ea6c0a',
        },
        text: {
          primary: '#dde3ed',
          secondary: '#8896aa',
          muted: '#4a5568',
        },
        green: '#34d399',
        red: '#f87171',
        blue: '#38bdf8',
        purple: '#a78bfa',
        yellow: '#fbbf24',
      },
      fontFamily: {
        sans: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        card: '10px',
        input: '6px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideIn: { '0%': { transform: 'translateX(20px)', opacity: '0' }, '100%': { transform: 'translateX(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
};

export default config;
