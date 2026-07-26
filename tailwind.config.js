/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff1f0', 100: '#ffe4e0', 200: '#ffcdc7', 300: '#ffa89f',
          400: '#ff7266', 500: '#ff3a2e', 600: '#e94560', 700: '#c8102e',
          800: '#a50e27', 900: '#8a1024', 950: '#4c0411',
        },
        brand: {
          red: '#e94560', dark: '#0f3460', navy: '#16213e',
          midnight: '#0f3460', surface: '#1a1a2e',
        },
        soc: {
          critical: '#ff2d55', high: '#ff6b35', medium: '#ffd60a',
          low: '#32d74b', info: '#0a84ff',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounceSubtle 2s infinite',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(20px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        bounceSubtle: { '0%, 100%': { transform: 'translateY(-5%)' }, '50%': { transform: 'translateY(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [],
};
