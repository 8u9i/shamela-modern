import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'node:url'

const configDir = fileURLToPath(new URL('.', import.meta.url))

// Strict CSP injected at build time. Dev relaxes script-src to allow Vite's
// react-refresh preamble; prod allows only the self-hosted theme bootstrap
// (sha256-pinned). The PDF iframe uses the privileged shamela-pdf: scheme,
// which carries its own byPassCSP privilege.
function cspPlugin() {
  return {
    name: 'inject-csp',
    transformIndexHtml(html, ctx) {
      const dev = !!ctx.server
      const scriptSrc = dev
        ? "'self' 'unsafe-inline'"
        : "'self' 'sha256-6FSXr/YFaEHYhVSceOHg7eFMhhsCnfS+j+Ii4VXmb38='"
      const connectSrc = dev ? "'self' ws://localhost:5173 http://localhost:5173" : "'self'"
      const csp = [
        "default-src 'self'",
        `script-src ${scriptSrc}`,
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self'",
        "img-src 'self' data:",
        `connect-src ${connectSrc}`,
        "frame-src shamela-pdf:",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'none'",
      ].join('; ')
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta http-equiv="Content-Security-Policy" content="${csp}" />\n    <meta charset="UTF-8" />`
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), cspPlugin()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(configDir, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // React is the single largest dependency. Isolating it into its own
        // chunk means app-code releases ship a small app chunk (stable hashes
        // for everything else), which keeps the auto-updater delta small and
        // lets the browser cache survive app changes.
        manualChunks(id) {
          if (/node_modules\/(react|react-dom)\//.test(id)) return 'vendor-react';
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
})
