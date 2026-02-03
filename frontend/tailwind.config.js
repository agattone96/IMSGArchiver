/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                bg0: 'var(--bg0)',
                bg1: 'var(--bg1)',
                panel: 'var(--panel)',
                panel2: 'var(--panel2)',
                stroke: 'var(--stroke)',
                text: 'var(--text)',
                muted: 'var(--muted)',
                pink: 'var(--pink)',
                pink2: 'var(--pink2)',
                violet: 'var(--violet)',
                cyan: 'var(--cyan)',
                blue: 'var(--blue)',
                green: 'var(--green)',
                orange: 'var(--orange)',
            }
        },
    },
    plugins: [],
}
