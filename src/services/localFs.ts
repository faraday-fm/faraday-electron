import { FileChangeEvent, FileSystemProvider, FsEntry } from "@far-more/web-ui";

type LocalFsApi = {
  startOperation(id: number, operation: FsOperation): void;
  abortOperation(id: number): void;
  onOperationComplete(
    callback: (args: { id: number; err: any; data: any }) => void
  ): void;
};

const localFsApi = (window as any).localFsApi as LocalFsApi;

const pendingOperations = new Map<
  number,
  (val: { err: unknown; data: unknown }) => void
>();

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

let nextId = 0;

export const localFs: FileSystemProvider = {
  watch(
    url: string,
    listener: (events: FileChangeEvent[]) => void,
    options: {
      recursive: boolean;
      excludes: string[];
      signal?: AbortSignal | undefined;
    }
  ) {
    throw new Error("Method not implemented.");
  },
  readDirectory(
    url: string,
    signal?: AbortSignal | undefined
  ): Promise<FsEntry[]> {
    return invokeFsOp(nextId++, { cmd: "readDirectory", url }, signal);
  },
  createDirectory(url: string, signal?: AbortSignal): void | Promise<void> {
    return invokeFsOp(nextId++, { cmd: "createDirectory", url }, signal);
  },
  readFile(
    url: string,
    signal?: AbortSignal
  ): Uint8Array | Promise<Uint8Array> {
    return invokeFsOp(nextId++, { cmd: "readFile", url }, signal);
  },
  writeFile(
    url: string,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean; signal?: AbortSignal }
  ): void | Promise<void> {
    return invokeFsOp(
      nextId++,
      { cmd: "writeFile", url, content, options },
      options.signal
    );
  },
  delete(
    url: string,
    options: { recursive: boolean; signal?: AbortSignal }
  ): void | Promise<void> {
    return invokeFsOp(
      nextId++,
      { cmd: "delete", url, options },
      options.signal
    );
  },
  rename(
    oldUrl: string,
    newUrl: string,
    options: { overwrite: boolean; signal?: AbortSignal }
  ): void | Promise<void> {
    return invokeFsOp(
      nextId++,
      { cmd: "rename", oldUrl, newUrl, options },
      options.signal
    );
  },
  copy(
    source: string,
    destination: string,
    options: { overwrite: boolean; signal?: AbortSignal }
  ): void | Promise<void> {
    return invokeFsOp(
      nextId++,
      { cmd: "copy", source, destination, options },
      options.signal
    );
  },
};
