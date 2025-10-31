/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#223aa3',
          light: '#4a6dd9',
          dark: '#1a2d7f',
        },
        'reflex-blue': {
          DEFAULT: '#223aa3',
          50: '#e8ecf9',
          100: '#c5d0f0',
          200: '#9fb1e6',
          300: '#7892dc',
          400: '#5b7ad4',
          500: '#3e62cc',
          600: '#3858ba',
          700: '#2f4aa2',
          800: '#273d8a',
          900: '#1a2960',
        },
        'cool-gray': {
          DEFAULT: '#e0e1e2',
          50: '#f9f9fa',
          100: '#f2f3f3',
          200: '#e0e1e2',
          300: '#c8cacc',
          400: '#b0b3b6',
          500: '#989ca0',
          600: '#80858a',
          700: '#686e74',
          800: '#50565e',
          900: '#383f48',
        },
        black: {
          DEFAULT: '#1d1d1b',
          light: '#3a3a38',
          lighter: '#575755',
        },
        sky: {
          DEFAULT: '#A9E0ED',
          light: '#c9eef7',
          dark: '#7ac9dd',
        },
        salmon: {
          DEFAULT: '#EE6C4D',
          light: '#f59a84',
          dark: '#e84521',
        },
        forest: {
          DEFAULT: '#00785C',
          light: '#00a37e',
          dark: '#005544',
        },
        rose: {
          DEFAULT: '#F5D3C8',
          light: '#fbe9e3',
          dark: '#edb8a8',
        },
        honey: {
          DEFAULT: '#F2B200',
          light: '#ffc933',
          dark: '#c98f00',
        },
      },
    },
  },
  plugins: [],
};
