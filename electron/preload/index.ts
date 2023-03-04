import { FileChangeEvent } from "@far-more/web-ui";
import { contextBridge, ipcRenderer } from "electron";
import { FsOperation, LocalFsApi } from "types/shared";

const localFs: LocalFsApi = {
  startOperation(id: number, operation: FsOperation) {
    ipcRenderer.send("fs", { id, operation });
  },
  abortOperation(id: number) {
    ipcRenderer.send("fs.abort", id);
  },
  onOperationComplete(
    callback: (args: { id: number; err: any; data: any }) => void
  ) {
    ipcRenderer.on("fs.result", (_, args) => callback(args));
  },
  onFsEvent(
    callback: (args: { id: number; events: FileChangeEvent[] }) => void
  ) {
    ipcRenderer.on("fs.event", (_, args) => callback(args));
  },
};

contextBridge.exposeInMainWorld("localFsApi", localFs);
