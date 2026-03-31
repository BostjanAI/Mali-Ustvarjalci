import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#7c9acc',
          50: '#f2f5fb',
          100: '#e6ecf7',
          200: '#c8d7ee',
          300: '#a9c1e4',
          400: '#8baada',
          500: '#7c9acc',
          600: '#5f79a8',
          700: '#475a7f',
          800: '#2f3c56',
          900: '#18202f',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'Open Sans', 'ui-sans-serif', 'system-ui'],
      },
      keyframes: {
        'slide-in': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        'slide-in': 'slide-in 0.3s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;







