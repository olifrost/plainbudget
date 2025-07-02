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
    server: {
        open: true,
        host: true,
        watch: {
            usePolling: true,
            ignored: (path) => {
                // Don't ignore .pb files
                if (path.endsWith('.pb')) return false
                // Use default ignore patterns for everything else
                return path.includes('node_modules')
            }
        }
    }
})
