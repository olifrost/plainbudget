import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// Custom plugin to watch .pb files
const pbWatcher = {
    name: 'pb-watcher',
    configureServer(server) {
        server.ws.on('pb-update', () => {
            server.ws.send({
                type: 'full-reload'
            })
        })
    },
    buildStart() {
        // Add .pb files to the watch list
        this.addWatchFile('budget.pb')
        this.addWatchFile('subscriptions.pb')
    },
    load(id) {
        if (id.endsWith('.pb')) {
            // Force a reload when .pb files change
            this.emitFile({
                type: 'asset',
                fileName: id,
                source: ''
            })
        }
    }
}

export default defineConfig({
    plugins: [
        tailwindcss(),
        pbWatcher
    ],
    build: {
        outDir: 'dist',
        emptyOutDir: true
    },
    server: {
        open: false, // Don't auto-open browser since we're using Tauri
        host: true,
        port: 1420, // Default Tauri dev server port
        strictPort: true,
        watch: {
            usePolling: true,
            ignored: (path) => {
                // Don't ignore .pb files
                if (path.endsWith('.pb')) return false
                // Use default ignore patterns for everything else
                return path.includes('node_modules')
            }
        }
    },
    clearScreen: false // Don't clear screen to preserve Tauri logs
})
