/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        theme: {
          pure: 'var(--theme-bg-pure)',
          midnight: 'var(--theme-bg-midnight)',
          charcoal: 'var(--theme-bg-charcoal)',
          rich: 'var(--theme-bg-rich)',
          gold: 'var(--theme-gold-cartier)',
          'gold-bulgari': 'var(--theme-gold-bulgari)',
          'gold-vancleef': 'var(--theme-gold-vancleef)',
          'gold-champagne': 'var(--theme-gold-champagne)',
          'gold-light': 'var(--theme-gold-light)',
          'bronze-wine': 'var(--theme-bronze-wine)',
          'bronze-light': 'var(--theme-bronze-wine-light)',
          'blue-royal': 'var(--theme-blue-royal)',
          'blue-sapphire': 'var(--theme-blue-sapphire)',
        }
      },
      animation: {
        'gradient-x': 'gradient-x 15s ease infinite',
        'gradient-y': 'gradient-y 15s ease infinite',
        'gradient-xy': 'gradient-xy 15s ease infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-slow': 'bounce 3s infinite',
      },
      keyframes: {
        'gradient-y': {
          '0%, 100%': {
            'background-size': '400% 400%',
            'background-position': 'center top'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'center center'
          }
        },
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          }
        },
        'gradient-xy': {
          '0%, 100%': {
            'background-size': '400% 400%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          }
        }
      }
    }
  },
  plugins: [
    require('@tailwindcss/aspect-ratio'),
  ],
}