import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to auth-employee-service during development
      '/api/auth': {
        target: process.env.VITE_AUTH_SERVICE_URL || 'http://localhost:3001',
        changeOrigin: true
      },
      '/api/employees': {
        target: process.env.VITE_AUTH_SERVICE_URL || 'http://localhost:3001',
        changeOrigin: true
      },
      '/api/positions': {
        target: process.env.VITE_AUTH_SERVICE_URL || 'http://localhost:3001',
        changeOrigin: true
      },
      // Proxy API calls to kpi-payroll-service during development
      '/api/kpi': {
        target: process.env.VITE_KPI_SERVICE_URL || 'http://localhost:3002',
        changeOrigin: true
      },
      '/api/reports': {
        target: process.env.VITE_KPI_SERVICE_URL || 'http://localhost:3002',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
});
