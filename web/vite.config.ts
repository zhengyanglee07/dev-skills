import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'node:path';

// Build output goes to ../preview/ — the Python server (scripts/preview.py)
// serves that folder as static files. The build output is a single index.html
// + a hashed assets/ folder. React Router handles client-side routing; the
// Python handler also serves index.html for any unmatched /preview/* path.
export default defineConfig({
  plugins: [react()],
  // The SPA is served at /preview/* by scripts/preview.py. All built asset
  // references in index.html must be prefixed with /preview/ so the browser
  // resolves them against the right base path. The Python handler also
  // serves preview/index.html for any unmatched /preview/* path, so deep
  // links work on a hard refresh.
  base: '/preview/',
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  build: {
    outDir: '../preview',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2022',
    rollupOptions: {
      output: {
        // Split heavy libs into their own chunks so the initial bundle stays
        // small. Recharts + React Flow + shiki are lazy-loaded via dynamic
        // imports; this just helps the per-route chunk size.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
          markdown: ['react-markdown', 'remark-gfm', 'rehype-slug', 'rehype-autolink-headings', 'rehype-pretty-code', 'shiki'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      // In dev mode, forward API calls to the running Python server so we get
      // live data without having to run two ports.
      '/api': {
        target: 'http://127.0.0.1:8765',
        changeOrigin: true,
      },
    },
  },
});
