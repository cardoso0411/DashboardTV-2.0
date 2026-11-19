import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    root: __dirname,
    appType: 'spa',
    build: {
        outDir: 'dist',
    },
    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:3339',
                changeOrigin: true,
                xfwd: true,
            },
        },
    },
    preview: {
        host: '0.0.0.0',
        port: 4173,
    },
});
