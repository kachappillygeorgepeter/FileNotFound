/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#ffffff',
        surface: {
          DEFAULT: '#ffffff',
          warm: '#F7F7F5',
          elevated: '#ffffff',
          dark: '#111111',
          night: '#0D0D0D',
        },
        border: {
          DEFAULT: '#E5E5E5',
          hairline: '#E5E5E5',
          dark: '#111111',
        },
        foreground: {
          DEFAULT: '#111111',
          primary: '#111111',
          secondary: '#555555',
          muted: '#555555',
          dim: '#999999',
        },
      },
      fontFamily: {
        sans: [
          'Geist',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Arial',
          'Helvetica',
          'sans-serif',
        ],
        mono: [
          'Geist Mono',
          'JetBrains Mono',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      letterSpacing: {
        widest: '0.25em',
        tightest: '-0.05em',
      },
    },
  },
  plugins: [],
};
