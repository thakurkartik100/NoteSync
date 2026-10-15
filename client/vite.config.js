import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const gatewayTarget = process.env.VITE_GATEWAY_URL || 'http://localhost:5000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: gatewayTarget,
        changeOrigin: true
      },
      '/uploads': {
        target: gatewayTarget,
        changeOrigin: true
      }
    }
  }
});
