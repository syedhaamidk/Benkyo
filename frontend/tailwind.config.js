/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: '#A855F7',
        'accent-dim': '#7C3AED',
        'bg-base': '#0a0a0a',
        'bg-secondary': '#120F17',
        'bg-card': '#1a1625',
        text: '#c4c4c4',
        'text-body': '#c4c4c4',
        'text-bright': '#ffffff',
        'text-muted': '#8b8f9a',
        border: 'rgba(168, 85, 247, 0.15)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-up': 'slideUp 0.4s ease forwards',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
