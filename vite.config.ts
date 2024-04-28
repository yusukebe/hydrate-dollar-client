import devServer from '@hono/vite-dev-server'
import { defineConfig } from 'vite'
import islandComponentPlugin from './src/plugin'

export default defineConfig({
  ssr: {
    external: ['react', 'react-dom']
  },
  plugins: [
    islandComponentPlugin(),
    devServer({
      entry: 'app/server.tsx'
    })
  ]
})
