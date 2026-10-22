import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Local dev (`npm run dev`) serves from "/" at http://localhost:5173/.
// Production builds serve from "/chess-simulator/" for GitHub Pages:
// https://minhhoang2007.github.io/chess-simulator/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/chess-simulator/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true
  }
}));
