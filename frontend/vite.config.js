import { defineConfig } from 'vite';
import { resolve } from 'path';
import handlebars from 'vite-plugin-handlebars';

export default defineConfig({
  plugins: [
    handlebars({
      partialDirectory: resolve(__dirname, 'src/components'),
      context: {
        title: 'Symbiosis - Scientific Research Platform',
        env: process.env.NODE_ENV || 'development'
      },
      helpers: {
        json: (context) => JSON.stringify(context),
        eq: (a, b) => a === b,
        ne: (a, b) => a !== b,
        lt: (a, b) => a < b,
        gt: (a, b) => a > b,
        and: (a, b) => a && b,
        or: (a, b) => a || b
      }
    })
  ],
  root: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        desktop: resolve(__dirname, 'desktop.html'),
        // Add more pages here as needed
        // dashboard: resolve(__dirname, 'pages/dashboard.html'),
      }
    }
  },
  server: {
    port: 3002,
    open: true,
    hmr: {
      // Limit HMR retry attempts to prevent infinite loops when server is down
      maxRetries: 5,
      // Increase delay between retries to reduce load
      overlay: true
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
        // Prevent proxy from retrying indefinitely
        timeout: 10000,
        // Don't retry on connection errors
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            // Stop retrying after error
            if (res && !res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'text/plain'
              });
              res.end('Proxy error: Server connection failed');
            }
          });
        }
      }
    }
  }
});
