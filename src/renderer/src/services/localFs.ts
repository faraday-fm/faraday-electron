import { FileChangeEvent, FileSystemProvider, FsEntry } from '@frdy/web-ui'
import { FsOperation, LocalFsApi } from 'src/shared/types'

const localFsApi = (window as any).localFsApi as LocalFsApi

const pendingOperations = new Map<number, (val: { err: unknown; data: unknown }) => void>()

const watchers = new Map<number, (events: FileChangeEvent[]) => void>()

async function invokeFsOp<TResult>(
  id: number,
  operation: FsOperation,
  signal?: AbortSignal
): Promise<TResult> {
  localFsApi.startOperation(id, operation)
  const onAbort = () => {
    if (pendingOperations.has(id)) {
      localFsApi.abortOperation(id)
    }
  }
  signal?.addEventListener('abort', onAbort)
  let cb: (value: { err: unknown; data: unknown }) => void
  const promise = new Promise<{ err: unknown; data: unknown }>((res) => {
    cb = res
  })
  pendingOperations.set(id, cb!)
  const { err, data } = await promise
  signal?.removeEventListener('abort', onAbort)
  pendingOperations.delete(id)
  if (err) {
    throw err
  } else {
    return data as TResult
  }
}

localFsApi.onOperationComplete(({ id, err, data }) => {
  pendingOperations.get(id)?.({ err, data })
})

localFsApi.onFsEvent(({ id, events }) => {
  watchers.get(id)?.(events)
})

let nextId = 0

export const localFs: (root: string) => FileSystemProvider = (root) => ({
  async watch(path, watcher, options) {
    const id = nextId++
    watchers.set(id, watcher)
    await invokeFsOp(id, { cmd: 'watch', path: root + path }, options?.signal)
    watchers.delete(id)
  },
  readDirectory(path, options): Promise<FsEntry[]> {
    return invokeFsOp(nextId++, { cmd: 'readDirectory', path: root + path }, options?.signal)
  },
  createDirectory(path, options): void | Promise<void> {
    return invokeFsOp(nextId++, { cmd: 'createDirectory', path: root + path }, options?.signal)
  },
  readFile(path, options): Uint8Array | Promise<Uint8Array> {
    return invokeFsOp(nextId++, { cmd: 'readFile', path: root + path }, options?.signal)
  },
  writeFile(path, content, options): void | Promise<void> {
    return invokeFsOp(
      nextId++,
      { cmd: 'writeFile', path: root + path, content, options },
      options?.signal
    )
  },
  delete(path, options): void | Promise<void> {
    return invokeFsOp(nextId++, { cmd: 'delete', path: root + path, options }, options?.signal)
  },
  rename(oldPath, newPath, options): void | Promise<void> {
    return invokeFsOp(
      nextId++,
      {
        cmd: 'rename',
        oldPath: root + oldPath,
        newPath: root + newPath,
        options
      },
      options?.signal
    )
  },
  copy(source, destination, options): void | Promise<void> {
    return invokeFsOp(
      nextId++,
      {
        cmd: 'copy',
        source: root + source,
        destination: root + destination,
        options
      },
      options?.signal
    )
  }
})
