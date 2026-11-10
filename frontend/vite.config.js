import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 开发时前端 5173，/api 全部代理到后端 8080，避免跨域和 CORS 配置麻烦
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
