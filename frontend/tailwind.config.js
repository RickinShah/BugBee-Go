/** @type {import('tailwindcss').Config} */
import textStroke from 'tailwindcss-text-stroke';
import scrollbarHide from 'tailwind-scrollbar-hide';
import scrollbar from 'tailwind-scrollbar';

import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily : {
        body: ['Libre Baskerville', ...defaultTheme.fontFamily.sans]
      },
      animation: {
        
        'move-right-slow': 'moveRight 10s linear infinite',  // Custom animation definition
        'move-right-very-fast': 'moveRight 25s linear infinite',  // Custom animation definition
        'move-right-fast': 'moveRight 15s linear infinite',  // Custom animation definition
        
      },
      keyframes: {
        "moveRight": {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-100%)' },
        },
        
      },
      textStrokeColor: {
        black: '#000',
        white: '#fff',
        red: '#f00',
      },
    },
  },
  plugins: [
    textStroke,
    scrollbarHide,
    scrollbar,
  ],
}

