import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    fs: {
      // Allow `?raw` imports from contracts/ (one level above app/).
      allow: [path.resolve(__dirname, '..')],
    },
  },
})
