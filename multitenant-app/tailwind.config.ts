import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'fp-bg': '#f3efec',
        'fp-bg-alt': '#fdf9f6',
        'fp-teal': '#00798c',
        'fp-teal-hover': '#148da0',
        'fp-teal-dark': '#006073',
        'fp-text': '#222222',
        'fp-text-light': '#8b7765',
        'fp-brown': '#6b5d54',
        'fp-brown-light': '#c9b29b',
      },
      fontFamily: {
        primary: ["'Work Sans'", 'sans-serif'],
        arapey: ["'Arapey'", 'serif'],
        opensans: ["'Open Sans'", 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
