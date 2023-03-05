import { FileChangeEvent, FileSystemProvider, FsEntry } from "@far-more/web-ui";
import { FsOperation, LocalFsApi } from "types/shared";

const localFsApi = (window as any).localFsApi as LocalFsApi;

const pendingOperations = new Map<
  number,
  (val: { err: unknown; data: unknown }) => void
>();

const watchers = new Map<number, (events: FileChangeEvent[]) => void>();

async function invokeFsOp<TResult>(
  id: number,
  operation: FsOperation,
  signal?: AbortSignal
): Promise<TResult> {
  localFsApi.startOperation(id, operation);
  const onAbort = () => {
    if (pendingOperations.has(id)) {
      localFsApi.abortOperation(id);
    }
  };
  signal?.addEventListener("abort", onAbort);
  let cb: (value: { err: unknown; data: unknown }) => void;
  const promise = new Promise<{ err: unknown; data: unknown }>((res) => {
    cb = res;
  });
  pendingOperations.set(id, cb!);
  const { err, data } = await promise;
  signal?.removeEventListener("abort", onAbort);
  pendingOperations.delete(id);
  if (err) {
    throw err;
  } else {
    return data as TResult;
  }
}

localFsApi.onOperationComplete(({ id, err, data }) => {
  pendingOperations.get(id)?.({ err, data });
});

localFsApi.onFsEvent(({ id, events }) => {
  watchers.get(id)?.(events);
});

let nextId = 0;

export const localFs: FileSystemProvider = {
  async watch(path, watcher, options) {
    const id = nextId++;
    watchers.set(id, watcher);
    await invokeFsOp(id, { cmd: "watch", path, options }, options?.signal);
    watchers.delete(id);
  },
  readDirectory(path, options): Promise<FsEntry[]> {
    return invokeFsOp(
      nextId++,
      { cmd: "readDirectory", path },
      options?.signal
    );
  },
  createDirectory(path, options): void | Promise<void> {
    return invokeFsOp(
      nextId++,
      { cmd: "createDirectory", path },
      options?.signal
    );
  },
  readFile(path, options): Uint8Array | Promise<Uint8Array> {
    return invokeFsOp(nextId++, { cmd: "readFile", path }, options?.signal);
  },
  writeFile(path, content, options): void | Promise<void> {
    return invokeFsOp(
      nextId++,
      { cmd: "writeFile", path, content, options },
      options?.signal
    );
  },
  delete(path, options): void | Promise<void> {
    return invokeFsOp(
      nextId++,
      { cmd: "delete", path, options },
      options?.signal
    );
  },
  rename(oldPath, newPath, options): void | Promise<void> {
    return invokeFsOp(
      nextId++,
      { cmd: "rename", oldPath, newPath, options },
      options?.signal
    );
  },
  copy(source, destination, options): void | Promise<void> {
    return invokeFsOp(
      nextId++,
      { cmd: "copy", source, destination, options },
      options?.signal
    );
  },
};
