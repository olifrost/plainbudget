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
            // Include .pb files in the watch list
            ignored: ['!**/budget.pb', '!**/*.pb']
        }
    }
})
