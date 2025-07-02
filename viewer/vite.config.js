import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    plugins: [
        tailwindcss(),
    ],
    server: {
        open: true,
        host: true,
        watch: {
            // Include .pb files in the watch list for hot reload
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
