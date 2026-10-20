/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'Arial', 'sans-serif'],
        mono: ['Cascadia Code', 'SFMono-Regular', 'Consolas', 'monospace']
      },
      colors: {
        indigo: {
          50: '#E6F1F8',
          100: '#D3E7F3',
          200: '#B6D8EA',
          300: '#91C4DE',
          400: '#63B4E6',
          500: '#2F91C7',
          600: '#006DB3',
          700: '#075B91',
          800: '#063753',
          900: '#082C43',
          950: '#061F30'
        },
        tolaria: {
          bg: '#0B0F17',
          surface: '#111827',
          card: '#1E293B',
          border: 'rgba(255, 255, 255, 0.08)',
          accent: '#6366F1',
          cyan: '#06B6D4',
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#F43F5E',
          violet: '#8B5CF6',
          muted: '#64748B',
          text: '#F8FAFC'
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glow-indigo': '0 0 15px rgba(99, 102, 241, 0.3)',
        'glow-cyan': '0 0 15px rgba(6, 182, 212, 0.3)',
      }
    },
  },
  plugins: [],
}
