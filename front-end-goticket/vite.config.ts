import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

const portalProxy = {
  target: 'http://127.0.0.1:3336',
  changeOrigin: true,
}

const proxyRules = {
  '/api': {
    target: 'http://localhost:5555',
    changeOrigin: true,
    xfwd: true,
  },
  '/launch': portalProxy,
  '/session': portalProxy,
  '^/pay(\\?.*)?$': portalProxy,
  '/vnpay': portalProxy,
  // Keep GoPay assets available without intercepting GoTicket's own brand files.
  '^/brand/gopay-': portalProxy,
  '/fonts': portalProxy,
  '/gopay-mark.svg': portalProxy,
  '/styles.css': portalProxy,
  '/app.js': portalProxy,
  '/vnpay-return.js': portalProxy,
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 3334,
    host: true,
    allowedHosts: true,
    proxy: proxyRules,
  },
  preview: {
    port: 3334,
    host: true,
    allowedHosts: true,
    proxy: proxyRules,
  },
})


