import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'fs'
import { join } from 'path'

// Custom plugin to serve .pb files and watch them for changes
const pbPlugin = {
    name: 'pb-plugin',
    configureServer(server) {
        // Serve .pb files
        server.middlewares.use('/', (req, res, next) => {
            if (req.url?.endsWith('.pb')) {
                try {
                    const filePath = join(process.cwd(), req.url.substring(1))
                    const content = readFileSync(filePath, 'utf-8')
                    res.setHeader('Content-Type', 'text/plain')
                    res.end(content)
                } catch (error) {
                    res.statusCode = 404
                    res.end('File not found')
                }
                return
            }
            next()
        })
        
        // Watch for .pb file changes and trigger reload
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
        this.addWatchFile('income.pb')
    }
}

export default defineConfig({
    plugins: [
        tailwindcss(),
        pbPlugin
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
