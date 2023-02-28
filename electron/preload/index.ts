import { contextBridge, ipcRenderer } from "electron";

const pendingOperations = new Map<
  number,
  (val: { err: unknown; data: unknown }) => void
>();

async function invokeFsOp<TResult>(
  id: number,
  operation: FsOperation
): Promise<TResult> {
  ipcRenderer.send("fs", { id, operation });
  let cb: (value: { err: unknown; data: unknown }) => void;
  const promise = new Promise<{ err: unknown; data: unknown }>((res) => {
    cb = res;
  });
  pendingOperations.set(id, cb);
  const { err, data } = await promise;
  if (err) {
    throw err;
  } else {
    return data as TResult;
  }
}

ipcRenderer.on("fs.result", (e, { id, err, data }) => {
  const op = pendingOperations.get(id);
  if (op !== undefined) {
    op({ err, data });
  }
});

let opCounter = 1;

const localFs = {
  startOperation(id: number, operation: FsOperation) {
    ipcRenderer.send("fs", { id, operation });
  },
  abortOperation(id: number) {
    ipcRenderer.send("fs.abort", id);
  },
  onOperationComplete(
    callback: (args: { id: number; err: any; data: any }) => void
  ) {
    ipcRenderer.on("fs.result", (e, args) => callback(args));
  },
};

contextBridge.exposeInMainWorld("localFsApi", localFs);
