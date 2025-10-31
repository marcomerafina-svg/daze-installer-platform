import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  define: {
    'import.meta.env.VITE_BoltDatabase_URL': JSON.stringify(process.env.VITE_BoltDatabase_URL),
    'import.meta.env.VITE_BoltDatabase_ANON_KEY': JSON.stringify(process.env.VITE_BoltDatabase_ANON_KEY),
  },
});
