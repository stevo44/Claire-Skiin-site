import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            // 'vendor-motion' (framer-motion) and 'vendor-gsap' (gsap,
            // @gsap/react) were removed from here — both packages have
            // ZERO import sites anywhere in src/ (confirmed via a full
            // grep sweep), so Rollup had nothing to put in those chunks.
            // This was never a manualChunks bug; the packages are simply
            // unused. They're still listed in package.json dependencies
            // and worth removing there too in a future dependency-cleanup
            // pass, but that's out of scope for this change.
            'vendor-ui': ['clsx', 'tailwind-merge', 'lucide-react']
          }
        }
      }
    }
  };
});
