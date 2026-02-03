import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    base: './',  // Required for Electron file:// protocol
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
                    charts: ['recharts'],
                    ui: ['lucide-react', '@tanstack/react-virtual', 'clsx', 'tailwind-merge']
                }
            }
        }
    }
})
