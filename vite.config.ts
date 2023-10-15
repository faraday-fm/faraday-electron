import { rmSync, createReadStream } from 'node:fs'
import path from 'node:path'
import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-electron-plugin'
import { customStart, loadViteEnv } from 'vite-electron-plugin/plugin'
import renderer from 'vite-plugin-electron-renderer'
import extract from 'extract-zip'
import pkg from './package.json'

function unzipPlugin({ source, destination }: { source: string; destination: string }): Plugin {
  return {
    name: 'vite-plugin-unzip',
    buildStart: async () => {
      await extract(source, { dir: destination })
    }
  }
}
// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  rmSync('dist-electron', { recursive: true, force: true })

  const sourcemap = command === 'serve' || !!process.env.VSCODE_DEBUG

  return {
    optimizeDeps: command === 'serve' && { exclude: ['@frdy/web-ui'] },
    resolve: command === 'serve' && {
      alias: {
        '@frdy/web-ui': path.join(__dirname, '../web-ui/dist/index.esm.js')
      }
    },
    plugins: [
      unzipPlugin({
        source: path.join(__dirname, 'src/assets/icons.zip'),
        destination: path.join(__dirname, 'src/assets')
      }),

      react(),
      electron({
        include: ['electron'],
        transformOptions: {
          sourcemap
        },
        plugins: [
          ...(!!process.env.VSCODE_DEBUG
            ? [
                // Will start Electron via VSCode Debug
                customStart(() =>
                  console.log(/* For `.vscode/.debug.script.mjs` */ '[startup] Faraday')
                )
              ]
            : []),
          // Allow use `import.meta.env.VITE_SOME_KEY` in Electron-Main
          loadViteEnv()
        ]
      }),
      renderer({})
    ],
    server: !!process.env.VSCODE_DEBUG
      ? (() => {
          const url = new URL(pkg.debug.env.VITE_DEV_SERVER_URL)
          return {
            host: url.hostname,
            port: +url.port
          }
        })()
      : undefined,
    clearScreen: false
  }
})
