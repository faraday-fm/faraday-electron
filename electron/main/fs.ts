import { FsEntry } from "@far-more/web-ui";
import { ipcMain, WebContents } from "electron";
import fs from "fs";

function getPath(url: string) {
  return decodeURI(new URL(url).pathname);
}

const pendingOperations = new Map<number, AbortController>();

function startOp(id: number) {
  const controller = new AbortController();
  pendingOperations.set(id, controller);
  return controller.signal;
}

function finishOp(
  sender: WebContents,
  id: number,
  err: unknown,
  data?: unknown
) {
  pendingOperations.delete(id);
  sender.send("fs.result", { id, err, data });
}

export function initFsHook() {
  ipcMain.on(
    "fs",
    (e, { id, operation }: { id: number; operation: FsOperation }) => {
      const sender = e.sender;
      const signal = startOp(id);
      switch (operation.cmd) {
        case "watch":
          return 0;
        case "readDirectory":
          fs.readdir(getPath(operation.url), (err, files) => {
            if (err) {
              finishOp(sender, id, err, null);
              return;
            }
            const result = files.map((e) => {
              try {
                let stat = fs.statSync(
                  decodeURI(new URL(e, operation.url).pathname)
                );
                if (stat.isFile() && stat.isSymbolicLink()) {
                  const link = fs.readlinkSync(
                    decodeURI(new URL(e, operation.url).pathname)
                  );
                  stat = fs.statSync(link);
                }
                return {
                  name: e,
                  isDir: stat.isDirectory(),
                  isFile: stat.isFile(),
                  isSymlink: stat.isSymbolicLink(),
                  accessed: stat.atimeMs,
                  created: stat.ctimeMs,
                  modified: stat.mtimeMs,
                  size: stat.size,
                } as FsEntry;
              } catch (err) {
                return {
                  name: e,
                } as FsEntry;
              }
            });
            finishOp(sender, id, null, result);
          });
          break;
        case "createDirectory":
          fs.mkdir(getPath(operation.url), (err) => finishOp(sender, id, err));
          break;
        case "readFile":
          fs.readFile(getPath(operation.url), { signal }, (err, data) =>
            finishOp(sender, id, err, data)
          );
          break;
        case "writeFile":
          fs.writeFile(
            getPath(operation.url),
            operation.content,
            { signal },
            (err) => finishOp(sender, id, err)
          );
          break;
        case "delete":
          fs.rm(getPath(operation.url), operation.options, (err) =>
            finishOp(sender, id, err)
          );
          break;
        case "rename":
          fs.rename(
            getPath(operation.oldUrl),
            getPath(operation.newUrl),
            (err) => finishOp(sender, id, err)
          );
          break;
        case "copy":
          fs.cp(
            getPath(operation.source),
            getPath(operation.destination),
            (err) => finishOp(sender, id, err)
          );
      }
    }
  );
  ipcMain.on("fs.abort", (_, id) => {
    pendingOperations.get(id)?.abort();
  });
}
