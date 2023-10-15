import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { Plugin } from 'vite'
import path from 'node:path'
import extract from 'extract-zip'

function unzipPlugin({ source, destination }: { source: string; destination: string }): Plugin {
  return {
    name: 'vite-plugin-unzip',
    buildStart: async () => {
      await extract(source, { dir: destination })
    }
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [
      react(),
      unzipPlugin({
        source: path.join(__dirname, 'src/renderer/assets/icons.zip'),
        destination: path.join(__dirname, 'src/renderer/assets')
      })
    ]
  }
})
