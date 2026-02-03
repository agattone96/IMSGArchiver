/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                bg0: '#05060b',
                bg1: '#070912',
                bg2: '#0b0e1a',
                pink: '#ff2aa8',
                pink2: '#ff54da',
                violet: '#7b5cff',
                cyan: '#34f2ff',
                panel: 'rgba(18, 16, 28, 0.54)',
                panel2: 'rgba(10, 10, 18, 0.32)',
                stroke: 'rgba(255, 255, 255, 0.12)',
                stroke2: 'rgba(255, 255, 255, 0.07)',
                text: 'rgba(255, 255, 255, 0.9)',
                muted: 'rgba(255, 255, 255, 0.62)',
            },
            fontFamily: {
                sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
