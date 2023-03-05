import { FileChangeEvent, FileChangeType, FsEntry } from "@far-more/web-ui";
import chokidar from "chokidar";
import { ipcMain, WebContents } from "electron";
import fs from "fs";
import { FsOperation } from "types/shared";

function getPath(path: string) {
  return "/" + path;
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

function eventNameToFileChangeType(
  eventName: "add" | "addDir" | "change" | "unlink" | "unlinkDir"
): FileChangeType {
  switch (eventName) {
    case "add":
    case "addDir":
      return "created";
    case "unlink":
    case "unlinkDir":
      return "deleted";
    case "change":
      return "changed";
  }
}

export function initFsApi() {
  ipcMain.on(
    "fs",
    (e, { id, operation }: { id: number; operation: FsOperation }) => {
      const sender = e.sender;
      const signal = startOp(id);
      switch (operation.cmd) {
        case "watch":
          const changesListener = (
            eventName: "add" | "addDir" | "change" | "unlink" | "unlinkDir",
            path: string,
            stats?: fs.Stats
          ): void => {
            const ev: FileChangeEvent = {
              type: eventNameToFileChangeType(eventName),
              path,
              entry: {
                name: path,
                size: stats?.size,
                isDir: stats?.isDirectory(),
                isFile: stats?.isFile(),
              },
            };
            // console.error(ev);
            sender.send("fs.event", { id, events: [ev] });
          };

          const readyListener = (): void => {
            sender.send("fs.event", {
              id,
              events: [{ type: "ready" } as FileChangeEvent],
            });
          };

          const path = getPath(operation.path);
          const isDir = fs.statSync(path).isDirectory();
          const watcher = chokidar.watch(isDir ? path + "/*" : path, {
            depth: operation.options.recursive ? undefined : 0,
            ignored: operation.options.excludes,
            alwaysStat: true,
            cwd: path,
            persistent: true,
            // awaitWriteFinish: true,
            // followSymlinks: false,
            usePolling: true,
          });
          signal.addEventListener(
            "abort",
            () => {
              watcher.close();
              finishOp(sender, id, undefined, undefined);
            },
            { once: true }
          );
          watcher.on("all", changesListener);
          watcher.on("ready", readyListener);
          watcher.on("error", (err) => console.error(err));
          break;
        case "readDirectory":
          fs.readdir(getPath(operation.path), (err, files) => {
            if (err) {
              finishOp(sender, id, err, undefined);
              return;
            }
            const result = files.map((e) => {
              try {
                let stat = fs.statSync(
                  decodeURI(new URL(e, operation.path).pathname)
                );
                if (stat.isFile() && stat.isSymbolicLink()) {
                  const link = fs.readlinkSync(
                    decodeURI(new URL(e, operation.path).pathname)
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
            finishOp(sender, id, undefined, result);
          });
          break;
        case "createDirectory":
          fs.mkdir(getPath(operation.path), (err) => finishOp(sender, id, err));
          break;
        case "readFile":
          fs.readFile(getPath(operation.path), { signal }, (err, data) =>
            finishOp(sender, id, err, data)
          );
          break;
        case "writeFile":
          fs.writeFile(
            getPath(operation.path),
            operation.content,
            { signal },
            (err) => finishOp(sender, id, err)
          );
          break;
        case "delete":
          fs.rm(getPath(operation.path), operation.options, (err) =>
            finishOp(sender, id, err)
          );
          break;
        case "rename":
          fs.rename(
            getPath(operation.oldPath),
            getPath(operation.newPath),
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
