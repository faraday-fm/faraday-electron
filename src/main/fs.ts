import { FileChangeEvent, FileChangeType, FsEntry } from '@frdy/web-ui'
import chokidar from 'chokidar'
import { ipcMain, WebContents } from 'electron'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { Stats } from 'fs'
import { FsOperation } from '../shared/types'

const pendingOperations = new Map<number, AbortController>()

function startOp(id: number): AbortSignal {
  const controller = new AbortController()
  pendingOperations.set(id, controller)
  return controller.signal
}

function finishOp(sender: WebContents, id: number, err: unknown, data?: unknown): void {
  pendingOperations.delete(id)
  sender.send('fs.result', { id, err, data })
}

function eventNameToFileChangeType(
  eventName: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir'
): FileChangeType {
  switch (eventName) {
    case 'add':
    case 'addDir':
      return 'created'
    case 'unlink':
    case 'unlinkDir':
      return 'deleted'
    case 'change':
      return 'changed'
  }
}

async function listDir(dirPath: string, signal: AbortSignal): Promise<FsEntry[]> {
  const dir = await fs.opendir(dirPath)
  const entries: FsEntry[] = []
  for await (const dirent of dir) {
    signal.throwIfAborted()
    try {
      let stat: Stats
      if (dirent.isFile() && dirent.isSymbolicLink()) {
        const link = await fs.readlink(path.join(dirPath, dirent.name))
        stat = await fs.stat(link)
      } else {
        stat = await fs.stat(path.join(dirPath, dirent.name))
      }
      entries.push({
        name: dirent.name,
        isDir: stat.isDirectory(),
        isFile: stat.isFile(),
        isSymlink: stat.isSymbolicLink(),
        isBlockDevice: stat.isBlockDevice(),
        isCharacterDevice: stat.isCharacterDevice(),
        isFIFO: stat.isFIFO(),
        isSocket: stat.isSocket(),
        accessed: stat.atimeMs,
        created: stat.ctimeMs,
        modified: stat.mtimeMs,
        size: stat.size
      })
    } catch (err) {
      console.error(err)
      entries.push({
        name: dirent.name,
        isDir: dirent.isDirectory(),
        isFile: dirent.isFile(),
        isSymlink: dirent.isSymbolicLink(),
        isBlockDevice: dirent.isBlockDevice(),
        isCharacterDevice: dirent.isCharacterDevice(),
        isFIFO: dirent.isFIFO(),
        isSocket: dirent.isSocket()
      })
    }
  }
  return entries
}

export function initFsApi(): void {
  ipcMain.on('fs', async (e, { id, operation }: { id: number; operation: FsOperation }) => {
    const sender = e.sender
    const signal = startOp(id)
    try {
      switch (operation.cmd) {
        case 'watch':
          {
            const changesListener = (
              eventName: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir',
              path: string,
              stats?: Stats
            ): void => {
              const ev: FileChangeEvent = {
                type: eventNameToFileChangeType(eventName),
                path,
                entry: {
                  name: path,
                  size: stats?.size,
                  isDir: stats?.isDirectory(),
                  isFile: stats?.isFile(),
                  accessed: stats?.atimeMs,
                  created: stats?.ctimeMs,
                  modified: stats?.mtimeMs
                }
              }
              sender.send('fs.event', { id, events: [ev] })
            }

            const watchPath = operation.path
            const isDir = (await fs.stat(watchPath)).isDirectory()
            const watcher = chokidar.watch(isDir ? watchPath + '/*' : watchPath, {
              depth: 0,
              alwaysStat: true,
              cwd: watchPath,
              persistent: true,
              ignoreInitial: true,
              // awaitWriteFinish: true,
              // followSymlinks: false,
              usePolling: true
            })
            signal.addEventListener(
              'abort',
              () => {
                watcher.close()
                finishOp(sender, id, undefined, undefined)
              },
              { once: true }
            )
            watcher.on('all', changesListener)
            // watcher.on("ready", readyListener);
            watcher.on('error', (err) => console.error(err))

            const entries: FsEntry[] = []
            if ((await fs.stat(operation.path)).isDirectory()) {
              ;(await listDir(operation.path, signal)).forEach((e) => entries.push(e))
            }
            const events = entries.map<FileChangeEvent>((entry) => ({
              entry,
              path: path.join(watchPath, entry.name),
              type: 'created'
            }))
            events.push({ type: 'ready' })
            sender.send('fs.event', { id, events })
          }
          break
        case 'readDirectory':
          {
            const entries = await listDir(operation.path, signal)
            finishOp(sender, id, undefined, entries)
          }
          break
        case 'createDirectory':
          await fs.mkdir(operation.path)
          finishOp(sender, id, undefined)
          break
        case 'readFile':
          const data = await fs.readFile(operation.path, { signal })
          finishOp(sender, id, undefined, data)
          break
        case 'writeFile':
          await fs.writeFile(operation.path, operation.content, {
            signal
          })
          finishOp(sender, id, undefined)
          break
        case 'delete':
          await fs.rm(operation.path, operation.options)
          finishOp(sender, id, undefined)
          break
        case 'rename':
          await fs.rename(operation.oldPath, operation.newPath)
          finishOp(sender, id, undefined)
          break
        case 'copy':
          await fs.cp(operation.source, operation.destination)
          finishOp(sender, id, undefined)
      }
    } catch (err) {
      finishOp(sender, id, err)
    }
  })
  ipcMain.on('fs.abort', (_, id) => {
    pendingOperations.get(id)?.abort()
  })
  ipcMain.handle('fs.homedir', () => {
    return os.homedir()
  })
}
