import {
  Disposable,
  FileChangeEvent,
  FileSystemProvider,
  FsEntry,
} from "@far-more/web-ui";
import { contextBridge, ipcRenderer } from "electron";

function invokeFsOp(op: FsOperation) {
  return ipcRenderer.invoke("fs", op);
}

const localFs: FileSystemProvider = {
  watch(
    url: string,
    listener: (events: FileChangeEvent[]) => void,
    options: { recursive: boolean; excludes: string[] }
  ): Disposable {
    const watchIdPromise = invokeFsOp({ cmd: "watch", url, options });
    const l = (_, events: FileChangeEvent[]) => listener(events);
    watchIdPromise.then((watchId) => ipcRenderer.on("fs.watch." + watchId, l));
    return {
      dispose() {
        watchIdPromise.then((watchId) => {
          ipcRenderer.off("fs.watch." + watchId, l);
          invokeFsOp({ cmd: "watch.stop", watchId });
        });
      },
    };
  },
  readDirectory(
    url: string,
    signal?: AbortSignal
  ): FsEntry[] | Promise<FsEntry[]> {
    return invokeFsOp({ cmd: "readDirectory", url });
  },
  createDirectory(url: string, signal?: AbortSignal): void | Promise<void> {
    return invokeFsOp({ cmd: "createDirectory", url });
  },
  readFile(
    url: string,
    signal?: AbortSignal
  ): Uint8Array | Promise<Uint8Array> {
    return invokeFsOp({ cmd: "readFile", url });
  },
  writeFile(
    url: string,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean },
    signal?: AbortSignal
  ): void | Promise<void> {
    return invokeFsOp({ cmd: "writeFile", url, content, options });
  },
  delete(
    url: string,
    options: { recursive: boolean },
    signal?: AbortSignal
  ): void | Promise<void> {
    return invokeFsOp({ cmd: "delete", url, options });
  },
  rename(
    oldUrl: string,
    newUrl: string,
    options: { overwrite: boolean },
    signal?: AbortSignal
  ): void | Promise<void> {
    return invokeFsOp({
      cmd: "rename",
      oldUrl: oldUrl,
      newUrl: newUrl,
      options,
    });
  },
  copy(
    source: string,
    destination: string,
    options: { overwrite: boolean },
    signal?: AbortSignal
  ): void | Promise<void> {
    return invokeFsOp({
      cmd: "copy",
      source,
      destination,
      options,
    });
  },
};

contextBridge.exposeInMainWorld("api", {
  fs: localFs,
});
